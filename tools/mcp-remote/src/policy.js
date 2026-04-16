export class ToolAuthError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.name = 'ToolAuthError';
    this.status = status;
  }
}

export function getLiveUrlForRepo(repoSlug) {
  const [owner, repo] = String(repoSlug || '').split('/');
  if (!owner || !repo) return '';
  if (repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
    return `https://${owner}.github.io/`;
  }
  return `https://${owner}.github.io/${repo}/`;
}

export function isLocalHostname(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function getWorkerAuthFailure({ hostname, expectedSecret, providedSecret }) {
  if (!expectedSecret) {
    if (isLocalHostname(hostname)) return null;
    return {
      status: 500,
      error: 'Worker auth is not configured. Set WORKER_SHARED_SECRET before deploying this worker.',
    };
  }

  if (!providedSecret || providedSecret !== expectedSecret) {
    return { status: 401, error: 'Missing or invalid worker auth.' };
  }

  return null;
}

export function getToolRequirements(name) {
  switch (name) {
    case 'read_content':
    case 'list_pages':
    case 'search_content':
    case 'get_history':
    case 'analyze_seo':
    case 'check_deploy':
    case 'backup_site':
    case 'publish_content_update':
      return { github: true, openai: false };
    case 'propose_content_update':
      return { github: true, openai: true };
    case 'generate_social':
      return { github: true, openai: true };
    case 'transcribe_audio':
      return { github: false, openai: true };
    case 'lighthouse_audit':
      return { github: false, openai: false };
    default:
      return { github: false, openai: false };
  }
}

export function getToolCredentialError(name, ctx) {
  const needs = getToolRequirements(name);
  if (needs.github && !ctx.githubToken) {
    if (name === 'check_deploy') {
      return 'GitHub token is required for Deploy Status. This tool also needs Actions: read permission.';
    }
    return 'GitHub token is required for this tool.';
  }
  if (needs.openai && !ctx.openaiKey) {
    return 'OpenAI API key is required for this tool.';
  }
  return null;
}

export function assertToolCredentials(name, ctx) {
  const error = getToolCredentialError(name, ctx);
  if (error) throw new ToolAuthError(error);
}

export function buildChatContext(request, env) {
  return {
    githubToken: request.headers.get('X-GitHub-Token') || '',
    openaiKey: env.OPENAI_API_KEY || '',
    env,
  };
}
