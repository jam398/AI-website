/**
 * JM AI Consulting — MCP Tool Server (Cloudflare Worker)
 * ======================================================
 * Exposes 12 site-management tools via three interfaces:
 *
 *   POST /api/chat      — Server-side AI chat (admin panel, Android app)
 *   POST /mcp           — MCP Streamable HTTP (VS Code, Claude Desktop)
 *   POST /api/tool      — Simple REST for direct tool calls
 *   GET  /health        — Health check
 *
 * Caller auth is required for public deployments:
 *   X-Worker-Auth    — Shared secret configured as WORKER_SHARED_SECRET
 *
 * User-scoped credentials are passed per-request in headers:
 *   X-GitHub-Token   — GitHub PAT (contents:read/write, actions:read)
 *   X-OpenAI-Key     — OpenAI API key (for /api/tool and /mcp only)
 *
 * The /api/chat endpoint uses the server-side OPENAI_API_KEY secret.
 */

import {
  assertToolCredentials,
  buildChatContext,
  getLiveUrlForRepo,
  getWorkerAuthFailure,
} from './policy.js';
import sitePolicy from '../../../admin/site-policy.js';

const {
  buildDiffSummary,
  getBlockedPaths,
  getChangedPaths,
  stableStringify,
  validateCandidateData,
} = sitePolicy;

// ── CORS ──────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-GitHub-Token, X-OpenAI-Key, X-Worker-Auth, Authorization, bypass-tunnel-reminder',
  'Access-Control-Max-Age': '86400',
};

function corsResponse(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...extra },
  });
}

// ── Tool Definitions (MCP format) ─────────────────────────────
const TOOLS = [
  {
    name: 'read_content',
    description: 'Read the current site.json content from GitHub. Returns all page content.',
    inputSchema: { type: 'object', properties: { page: { type: 'string', description: 'Optional: specific page section (home, about, services, contact, meta, footer). Omit for full content.' } } },
  },
  {
    name: 'list_pages',
    description: 'List all available pages and their editable fields.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'search_content',
    description: 'Search for text across all site content. Returns matching fields with paths.',
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Text to search for (case-insensitive)' } }, required: ['query'] },
  },
  {
    name: 'get_history',
    description: 'Show recent commit history for site.json.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number', description: 'Number of commits to show (default: 10, max: 30)' } } },
  },
  {
    name: 'analyze_seo',
    description: 'Analyze site content for SEO quality. Returns scores, issues, and recommendations.',
    inputSchema: { type: 'object', properties: { page: { type: 'string', description: 'Optional: specific page (home, about, services, contact). Omit for all.' } } },
  },
  {
    name: 'check_deploy',
    description: 'Check GitHub Actions deploy status.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number', description: 'Number of recent deploys to show (default: 5, max: 20)' } } },
  },
  {
    name: 'backup_site',
    description: 'Create, list, or restore site.json backups stored in the Git repository.',
    inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['backup', 'list', 'restore'], description: 'Action: backup (create new), list (show all), restore (restore from backup)' }, backup_id: { type: 'string', description: 'Required for restore: the backup filename to restore from' } }, required: ['action'] },
  },
  {
    name: 'generate_social',
    description: 'Generate social media posts from site content for LinkedIn, Twitter/X, or Facebook.',
    inputSchema: { type: 'object', properties: { platform: { type: 'string', enum: ['linkedin', 'twitter', 'facebook'], description: 'Target platform' }, topic: { type: 'string', description: 'Optional: specific topic or angle' }, page: { type: 'string', description: 'Optional: page to use as content source' }, tone: { type: 'string', enum: ['professional', 'casual', 'thought-leader'], description: 'Tone (default: professional)' } }, required: ['platform'] },
  },
  {
    name: 'lighthouse_audit',
    description: 'Run a Google Lighthouse audit on the live site via PageSpeed Insights API.',
    inputSchema: { type: 'object', properties: { url: { type: 'string', description: 'Optional: URL to audit. Defaults to the live GitHub Pages URL.' }, categories: { type: 'array', items: { type: 'string', enum: ['performance', 'accessibility', 'best-practices', 'seo'] }, description: 'Optional: categories to audit. Defaults to all.' } } },
  },
  {
    name: 'transcribe_audio',
    description: 'Transcribe audio via OpenAI Whisper API. Send base64-encoded audio in the audio_base64 argument.',
    inputSchema: { type: 'object', properties: { audio_base64: { type: 'string', description: 'Base64-encoded audio file content' }, filename: { type: 'string', description: 'Original filename (e.g. recording.mp3)' }, action: { type: 'string', enum: ['transcribe', 'summarize'], description: 'transcribe (full text) or summarize (key points). Default: transcribe' } }, required: ['audio_base64', 'filename'] },
  },
  {
    name: 'propose_content_update',
    description: 'Generate and validate a structured site.json proposal for content editing.',
    inputSchema: {
      type: 'object',
      properties: {
        instruction: { type: 'string', description: 'Natural-language content edit request.' },
        page: { type: 'string', description: 'Optional page focus such as home, about, services, or contact.' },
      },
      required: ['instruction'],
    },
  },
  {
    name: 'publish_content_update',
    description: 'Publish a previously validated site.json candidate to GitHub.',
    inputSchema: {
      type: 'object',
      properties: {
        site_data: { type: 'object', description: 'Previously reviewed candidate site.json object.' },
        proposal_hash: { type: 'string', description: 'Hash returned by propose_content_update.' },
        base_site_sha: { type: 'string', description: 'Optional GitHub blob SHA returned by propose_content_update.' },
        commit_message: { type: 'string', description: 'Optional commit message.' },
      },
      required: ['site_data', 'proposal_hash'],
    },
  },
];

// ── Chat System Prompt ────────────────────────────────────────
const CHAT_SYSTEM_PROMPT = `You are a friendly, knowledgeable AI content editor for the website "JM AI Consulting".

Your job is to help the user view, analyze, and edit their website content using the tools available to you.

## Rules

1. Respond in plain, natural language. Be helpful and specific.
2. NEVER return raw JSON to the user. Use tools for content operations.
3. NEVER call publish_content_update — only the app's Publish button does that.
4. NEVER claim a site change is live unless a tool confirms it.
5. When a tool returns an error, preserve the exact reason. Do not describe permission, quota, auth, or server errors as generic connectivity problems.
6. Reference actual content from the site when answering questions.
7. If a request is vague, ask clarifying questions.

## Available Tools

- read_content — Read current site.json (optionally filtered by page)
- list_pages — List all editable fields
- search_content — Search text across all content
- get_history — Recent commit history
- analyze_seo — SEO quality analysis
- check_deploy — GitHub Actions deploy status
- backup_site — Create, list, or restore backups
- generate_social — Generate social media posts
- lighthouse_audit — Google Lighthouse audit
- transcribe_audio — Transcribe or summarize audio
- propose_content_update — Generate a validated content change proposal

## Content Edit Workflow

When the user wants to change content:
1. Call propose_content_update with their instruction
2. The tool validates the change and returns a proposal with a diff
3. Present the proposal summary to the user in natural language
4. The user reviews and presses Publish in the app — you do NOT publish

Maintain a professional, consulting-appropriate tone.`;

// ── OpenAI Tools (function-calling format) ────────────────────
// Convert MCP TOOLS to OpenAI format, excluding publish_content_update
const OPENAI_CHAT_TOOLS = TOOLS
  .filter(t => t.name !== 'publish_content_update')
  .map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    },
  }));

// ── Chat Loop ─────────────────────────────────────────────────
const CHAT_MAX_LOOPS = 6;

async function runChatLoop(messages, ctx) {
  const toolResults = [];

  for (let i = 0; i < CHAT_MAX_LOOPS; i++) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ctx.openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 0.4,
        max_tokens: 8192,
        tools: OPENAI_CHAT_TOOLS,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI API ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    // If no tool calls, return the text reply
    if (choice.finish_reason !== 'tool_calls' || !choice.message.tool_calls) {
      return {
        reply: (choice.message.content || '').trim(),
        toolResults,
      };
    }

    // Process tool calls
    messages.push(choice.message);

    for (const tc of choice.message.tool_calls) {
      const toolName = tc.function.name;
      let toolArgs;
      try {
        toolArgs = JSON.parse(tc.function.arguments || '{}');
      } catch (_) {
        toolArgs = {};
      }

      let result;
      try {
        result = await executeTool(toolName, toolArgs, ctx);
      } catch (err) {
        result = `Error: ${err.message}`;
      }

      toolResults.push({ tool: toolName, result });
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: typeof result === 'string' ? result : JSON.stringify(result),
      });
    }
  }

  // Hit max loops — return whatever we have
  return {
    reply: 'I completed several tool operations but reached the processing limit. Please check the results and ask again if you need more.',
    toolResults,
  };
}

// ── GitHub API Helper ─────────────────────────────────────────
async function ghAPI(endpoint, token, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com${endpoint}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'JM-AI-MCP/1.0',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body) headers['Content-Type'] = 'application/json';
  const resp = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  return resp;
}

function getRepo(env) {
  return env.GITHUB_REPO || 'jam398/AI-website';
}

function getLiveUrl(env) {
  return getLiveUrlForRepo(getRepo(env));
}

function requireWorkerAuth(request, env) {
  const { hostname } = new URL(request.url);
  const failure = getWorkerAuthFailure({
    hostname,
    expectedSecret: env.WORKER_SHARED_SECRET || '',
    providedSecret: request.headers.get('X-Worker-Auth') || '',
  });
  if (!failure) return null;
  return corsResponse({ error: failure.error }, failure.status);
}

// ── Fetch & decode site.json ──────────────────────────────────
async function fetchSiteData(token, env) {
  const repo = getRepo(env);
  const r = await ghAPI(`/repos/${repo}/contents/content/site.json?ref=main`, token);
  if (!r.ok) {
    if (r.status === 401 || r.status === 403) {
      throw new Error('GitHub token is invalid or missing Contents access for this repo.');
    }
    throw new Error(`GitHub API error: ${r.status}`);
  }
  const data = await r.json();
  const raw = data.content.replace(/\n/g, '');
  const bytes = Uint8Array.from(atob(raw), (char) => char.charCodeAt(0));
  const decoded = new TextDecoder().decode(bytes);
  return { siteData: JSON.parse(decoded), sha: data.sha, raw };
}

function encodeJsonToBase64(value) {
  const json = JSON.stringify(value, null, 2) + '\n';
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function extractJsonObject(text) {
  const source = String(text || '').trim();
  const fenceMatch = source.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : source;
  if (!candidate) {
    throw new Error('OpenAI did not return a site.json candidate.');
  }
  return JSON.parse(candidate);
}

async function hashProposal(siteData) {
  const bytes = new TextEncoder().encode(stableStringify(siteData));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function generateCandidateSiteData(instruction, currentSiteData, page, openaiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'You are a strict website content editor.',
            'Return only the complete updated site.json object.',
            'Keep the exact top-level structure: meta, nav, home, about, services, contact, footer.',
            'Do not rename fields or remove sections.',
            'Do not change the site title, consultant name, canonical email, contact email, navigation, or derived mailto links.',
            'Apply only the requested content edit.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            page ? `The user is focused on the "${page}" page.` : 'No page focus was provided.',
            `Instruction: ${instruction}`,
            'Current site.json:',
            JSON.stringify(currentSiteData, null, 2),
          ].join('\n\n'),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `OpenAI API ${response.status}`);
  }

  const payload = await response.json();
  return extractJsonObject(payload?.choices?.[0]?.message?.content || '');
}

function buildProposalPayload(currentSiteData, candidateSiteData, baseSiteSha, validation, status) {
  const changedPaths = getChangedPaths(currentSiteData, candidateSiteData);
  const noChanges = changedPaths.length === 0;
  return {
    ok: validation.ok && !noChanges,
    status: noChanges && validation.ok ? 'no_changes' : status,
    proposal_hash: null,
    base_site_sha: baseSiteSha,
    candidate_site_data: candidateSiteData,
    changed_paths: changedPaths,
    diff_summary: buildDiffSummary(currentSiteData, candidateSiteData),
    validation_errors: noChanges && validation.ok
      ? ['Instruction did not produce any content changes.']
      : validation.errors,
    blocked_paths: getBlockedPaths(validation.errors),
  };
}

function normalizeCandidateInput(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') return JSON.parse(value);
  throw new Error('site_data must be a full site.json object.');
}

// ── Tool Implementations ──────────────────────────────────────

async function toolReadContent(args, ctx) {
  const { siteData } = await fetchSiteData(ctx.githubToken, ctx.env);
  if (args.page && siteData[args.page]) return JSON.stringify(siteData[args.page], null, 2);
  return JSON.stringify(siteData, null, 2);
}

async function toolProposeContentUpdate(args, ctx) {
  const instruction = String(args.instruction || '').trim();
  if (!instruction) {
    throw new Error('instruction is required for propose_content_update.');
  }

  const { siteData, sha } = await fetchSiteData(ctx.githubToken, ctx.env);
  const candidateSiteData = await generateCandidateSiteData(instruction, siteData, args.page, ctx.openaiKey);
  const validation = validateCandidateData(siteData, candidateSiteData);
  const payload = buildProposalPayload(
    siteData,
    candidateSiteData,
    sha,
    validation,
    validation.ok ? 'proposal_ready' : 'validation_failed'
  );

  if (payload.ok) {
    payload.proposal_hash = await hashProposal(candidateSiteData);
  }

  return JSON.stringify(payload, null, 2);
}

async function toolListPages(args, ctx) {
  const { siteData } = await fetchSiteData(ctx.githubToken, ctx.env);
  function listFields(obj, prefix) {
    const fields = [];
    for (const [k, v] of Object.entries(obj)) {
      const p = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        fields.push(...listFields(v, p));
      } else {
        const preview = String(typeof v === 'string' ? v : JSON.stringify(v)).substring(0, 60);
        fields.push(`${p}: ${preview}${String(v).length > 60 ? '…' : ''}`);
      }
    }
    return fields;
  }
  let output = 'Available pages and fields:\n\n';
  for (const section of ['meta', 'nav', 'home', 'about', 'services', 'contact', 'footer']) {
    if (siteData[section]) {
      output += `── ${section.toUpperCase()} ──\n` + listFields(siteData[section], section).join('\n') + '\n\n';
    }
  }
  return output;
}

async function toolSearchContent(args, ctx) {
  const { siteData } = await fetchSiteData(ctx.githubToken, ctx.env);
  const query = (args.query || '').toLowerCase();
  function search(obj, prefix) {
    const matches = [];
    for (const [k, v] of Object.entries(obj)) {
      const p = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string' && v.toLowerCase().includes(query)) matches.push({ path: p, value: v });
      else if (typeof v === 'object' && v !== null) matches.push(...search(v, p));
    }
    return matches;
  }
  const matches = search(siteData, '');
  if (matches.length === 0) return `No matches found for "${args.query}"`;
  let output = `Found ${matches.length} match(es) for "${args.query}":\n\n`;
  for (const m of matches) output += `📍 ${m.path}\n   "${m.value.substring(0, 150)}${m.value.length > 150 ? '…' : ''}"\n\n`;
  return output;
}

async function toolGetHistory(args, ctx) {
  const repo = getRepo(ctx.env);
  const limit = Math.min(args.limit || 10, 30);
  const r = await ghAPI(`/repos/${repo}/commits?path=content/site.json&per_page=${limit}&sha=main`, ctx.githubToken);
  if (!r.ok) return `Error: fetching history failed (HTTP ${r.status}).`;
  const commits = await r.json();
  if (commits.length === 0) return 'No commits found for site.json';
  let output = `Last ${commits.length} changes to site.json:\n\n`;
  for (const c of commits) {
    output += `  ${c.sha.substring(0, 7)} — ${new Date(c.commit.author.date).toLocaleString()}\n  ${c.commit.message.substring(0, 80)}\n\n`;
  }
  return output;
}

async function toolAnalyzeSEO(args, ctx) {
  const { siteData } = await fetchSiteData(ctx.githubToken, ctx.env);
  const KEYWORDS = ['ai', 'artificial intelligence', 'consulting', 'automation', 'strategy', 'training', 'business', 'machine learning'];
  function charCount(s) { return s ? [...s].length : 0; }
  function wordCount(s) { return s ? s.split(/\s+/).filter(Boolean).length : 0; }
  function gatherText(obj) {
    let t = '';
    for (const v of Object.values(obj)) {
      if (typeof v === 'string') t += v + ' ';
      else if (Array.isArray(v)) v.forEach(i => { if (typeof i === 'string') t += i + ' '; else if (typeof i === 'object' && i) t += gatherText(i) + ' '; });
      else if (typeof v === 'object' && v) t += gatherText(v) + ' ';
    }
    return t;
  }
  function analyzePage(name, pageData) {
    const issues = []; let score = 100;
    const title = siteData.meta.siteTitle + (pageData.pageTitle ? ` — ${pageData.pageTitle}` : '');
    const tl = charCount(title);
    if (tl > 60) { issues.push(`⚠ Title too long: ${tl} chars (optimal: 50-60)`); score -= 5; }
    else if (tl < 30) { issues.push(`⚠ Title too short: ${tl} chars (optimal: 50-60)`); score -= 5; }
    const desc = siteData.meta.siteDescription || '';
    const dl = charCount(desc);
    if (dl === 0) { issues.push('✗ Meta description is missing'); score -= 15; }
    else if (dl > 160) { issues.push(`⚠ Meta description too long: ${dl} chars`); score -= 5; }
    else if (dl < 120) { issues.push(`ℹ Meta description could be longer: ${dl} chars`); score -= 2; }
    const h1 = pageData.headline || pageData.pageTitle || '';
    if (!h1) { issues.push('✗ No H1 heading found'); score -= 15; }
    const allText = gatherText(pageData).toLowerCase();
    const wc = wordCount(allText);
    if (wc < 100) { issues.push(`⚠ Low content: ${wc} words (min 100 recommended)`); score -= 10; }
    const foundKW = KEYWORDS.filter(kw => allText.includes(kw));
    if (foundKW.length < 3) { issues.push(`ℹ Only ${foundKW.length} keywords found. Add: ${KEYWORDS.filter(k => !allText.includes(k)).join(', ')}`); score -= 5; }
    const hasCTA = pageData.ctaButtonLabel || pageData.ctaText || name === 'contact';
    if (!hasCTA) { issues.push('⚠ No call-to-action found'); score -= 10; }
    return { name, score: Math.max(0, score), issues, wc, foundKW };
  }
  const pages = args.page ? [args.page] : ['home', 'about', 'services', 'contact'];
  const results = pages.filter(p => siteData[p]).map(p => analyzePage(p, siteData[p]));
  const overall = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
  let output = `🔍 SEO Analysis — Overall: ${overall}/100\n\n`;
  for (const r of results) {
    const icon = r.score >= 90 ? '✓' : r.score >= 70 ? '⚠' : '✗';
    output += `── ${r.name.toUpperCase()} (${r.score}/100 ${icon}) ──\n   Words: ${r.wc} | Keywords: ${r.foundKW.join(', ')}\n`;
    if (r.issues.length) { output += '   Issues:\n'; r.issues.forEach(i => output += `     ${i}\n`); }
    output += '\n';
  }
  return output;
}

async function toolCheckDeploy(args, ctx) {
  const repo = getRepo(ctx.env);
  const limit = Math.min(args.limit || 5, 20);
  const r = await ghAPI(`/repos/${repo}/actions/runs?per_page=${limit}`, ctx.githubToken);
  if (!r.ok) {
    if (r.status === 401 || r.status === 403) {
      return 'Error: GitHub token is missing Actions: read permission or repo access for Deploy Status.';
    }
    return `Error: checking deploys failed (HTTP ${r.status}).`;
  }
  const body = await r.json();
  const runs = body.workflow_runs || [];
  if (runs.length === 0) return 'No deploys found. Push to main to trigger your first deploy.';
  const deployRuns = runs.filter(w => w.name.toLowerCase().includes('deploy') || w.name.toLowerCase().includes('pages'));
  const toShow = deployRuns.length > 0 ? deployRuns : runs.slice(0, limit);
  let output = `🚀 Deploy Status — ${getLiveUrl(ctx.env)}\n\n`;
  toShow.forEach((w, i) => {
    const status = w.conclusion || w.status;
    const icon = status === 'success' ? '✓' : status === 'failure' ? '✗' : status === 'in_progress' ? '⏳' : '?';
    const dur = w.updated_at && w.created_at ? Math.round((new Date(w.updated_at) - new Date(w.created_at)) / 1000) : null;
    output += `  ${i + 1}. ${icon} ${(status || 'UNKNOWN').toUpperCase()}\n     "${(w.head_commit?.message || 'No message').substring(0, 72)}"\n     ${new Date(w.created_at).toLocaleString()}${dur ? ` (${dur}s)` : ''}\n\n`;
  });
  return output;
}

async function toolBackupSite(args, ctx) {
  const repo = getRepo(ctx.env);
  if (args.action === 'backup') {
    const { raw } = await fetchSiteData(ctx.githubToken, ctx.env);
    const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const id = `backup-${ts}`;
    const putR = await ghAPI(`/repos/${repo}/contents/_backups/${id}.json`, ctx.githubToken, {
      method: 'PUT',
      body: JSON.stringify({ message: `backup: ${id}`, content: raw, branch: 'main' }),
    });
    if (putR.ok) {
      const size = Math.round(atob(raw).length / 1024 * 10) / 10;
      return `✓ Backup created!\n  ID: ${id}\n  Size: ${size} KB`;
    }
    return `Error: creating backup failed (HTTP ${putR.status}).`;
  }
  if (args.action === 'list') {
    const r = await ghAPI(`/repos/${repo}/contents/_backups?ref=main`, ctx.githubToken);
    if (r.status === 404) return 'No backups found. Ask me to create one.';
    if (!r.ok) return `Error: listing backups failed (HTTP ${r.status}).`;
    const files = await r.json();
    if (!Array.isArray(files) || files.length === 0) return 'No backups found.';
    let output = `📦 Available backups (${files.length}):\n\n`;
    for (const f of files.sort((a, b) => b.name.localeCompare(a.name))) {
      output += `  ${f.name.replace('.json', '')} (${f.size ? Math.round(f.size / 1024 * 10) / 10 : '?'} KB)\n`;
    }
    return output;
  }
  if (args.action === 'restore') {
    if (!args.backup_id) return 'Error: backup_id is required. Ask me to list backups first.';
    const bR = await ghAPI(`/repos/${repo}/contents/_backups/${args.backup_id}.json?ref=main`, ctx.githubToken);
    if (!bR.ok) return `Error: backup not found: ${args.backup_id}`;
    const backupFile = await bR.json();
    const backupContent = backupFile.content.replace(/\n/g, '');
    const curR = await ghAPI(`/repos/${repo}/contents/content/site.json?ref=main`, ctx.githubToken);
    if (!curR.ok) return 'Error: reading current content failed.';
    const curFile = await curR.json();
    const putR = await ghAPI(`/repos/${repo}/contents/content/site.json`, ctx.githubToken, {
      method: 'PUT',
      body: JSON.stringify({ message: `restore: ${args.backup_id}`, content: backupContent, sha: curFile.sha, branch: 'main' }),
    });
    if (putR.ok) return `✓ Restored from ${args.backup_id}! Site will rebuild in ~1 minute.`;
    return `Error: restoring backup failed (HTTP ${putR.status}).`;
  }
  return `Error: unknown action "${args.action}". Use: backup, list, or restore.`;
}

async function toolGenerateSocial(args, ctx) {
  const { siteData } = await fetchSiteData(ctx.githubToken, ctx.env);
  const platform = args.platform;
  const tone = args.tone || 'professional';
  const pageSrc = args.page && siteData[args.page] ? siteData[args.page] : siteData;
  const limits = { linkedin: 3000, twitter: 280, facebook: 63206 };
  const charLimit = limits[platform] || 3000;

  if (ctx.openaiKey) {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ctx.openaiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o', temperature: 0.7, max_tokens: 1000,
        messages: [
          { role: 'system', content: 'You are a social media expert. Generate engaging posts.' },
          { role: 'user', content: `Generate a ${platform} post for "${siteData.meta.siteTitle}" by ${siteData.meta.consultant}.\nTone: ${tone}, max ${charLimit} chars.${args.topic ? ` Topic: ${args.topic}` : ''}\nContext: ${JSON.stringify(pageSrc, null, 2)}\nRequirements: stay within limit, include hashtags, be engaging. Return ONLY the post text.` },
        ],
      }),
    });
    if (r.ok) {
      const d = await r.json();
      const post = d.choices[0].message.content.trim();
      const cl = [...post].length;
      return `📱 ${platform.toUpperCase()} Post (${tone})\n\n${post}\n\nCharacters: ${cl}/${charLimit}${cl > charLimit ? ' ⚠ OVER LIMIT' : ' ✓'}`;
    }
  }

  // Fallback template
  const templates = {
    linkedin: `🤖 AI isn't just for tech giants.\n\nAt ${siteData.meta.siteTitle}, I help businesses:\n→ Build AI strategy\n→ Implement automation\n→ Train teams\n\n✉️ ${siteData.meta.email}\n\n#AIConsulting #Automation`,
    twitter: `🤖 AI consulting for real results.\nTraining → Automation → Strategy\n${siteData.meta.siteTitle}\n#AIConsulting`,
    facebook: `Want to bring AI into your business?\n${siteData.meta.siteTitle} helps with training, automation & strategy.\n✉️ ${siteData.meta.email}\n#AIConsulting`,
  };
  return `📱 ${platform.toUpperCase()} Post (template)\n\n${templates[platform] || templates.linkedin}\n\nNote: Set OpenAI key for AI-generated posts.`;
}

async function toolLighthouseAudit(args, ctx) {
  const targetUrl = args.url || getLiveUrl(ctx.env);
  const categories = args.categories || ['performance', 'accessibility', 'best-practices', 'seo'];
  const catParam = categories.map(c => `&category=${c}`).join('');
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}${catParam}&strategy=mobile`;

  const r = await fetch(apiUrl);
  if (!r.ok) {
    if (r.status === 400) return `Error: could not audit ${targetUrl}. Is the site deployed?`;
    if (r.status === 429) return 'Error: Google PageSpeed quota exceeded (HTTP 429). Try again later.';
    return `Error: PageSpeed API failed (HTTP ${r.status}).`;
  }
  const data = await r.json();
  const lhr = data.lighthouseResult;
  if (!lhr) return 'Error: no Lighthouse results were returned.';

  const catIcons = { performance: '⚡', accessibility: '♿', 'best-practices': '✅', seo: '🔍' };
  let output = `📊 Lighthouse Audit — ${targetUrl}\n   Strategy: Mobile\n\n`;
  for (const cat of categories) {
    const cd = lhr.categories[cat];
    if (!cd) { output += `   ${cat}: N/A\n`; continue; }
    const score = Math.round((cd.score || 0) * 100);
    output += `   ${catIcons[cat] || '📋'} ${cd.title}: ${score}/100 ${score >= 90 ? '✓' : score >= 50 ? '⚠' : '✗'}\n`;
  }
  output += '\n';
  const audits = lhr.audits || {};
  const failed = Object.values(audits).filter(a => a.score !== null && a.score < 1 && a.score !== undefined).sort((a, b) => a.score - b.score).slice(0, 10);
  if (failed.length > 0) {
    output += '── Top Issues ──\n';
    failed.forEach((a, i) => output += `  ${i + 1}. ${a.score === 0 ? '✗' : '⚠'} ${a.title}${a.displayValue ? ` (${a.displayValue})` : ''}\n`);
  } else {
    output += '  ✓ No critical issues found!\n';
  }
  return output;
}

async function toolTranscribeAudio(args, ctx) {
  if (!ctx.openaiKey) return 'Error: OpenAI API key is required for transcription.';
  if (!args.audio_base64 || !args.filename) return 'Error: audio_base64 and filename are required.';

  const validExts = ['.mp3', '.wav', '.m4a', '.mp4', '.webm', '.mpeg', '.mpga'];
  const ext = '.' + args.filename.split('.').pop().toLowerCase();
  if (!validExts.includes(ext)) return `Error: unsupported format: ${ext}. Supported: ${validExts.join(', ')}`;

  // Decode base64 to binary
  const binaryStr = atob(args.audio_base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  const sizeMB = bytes.length / (1024 * 1024);
  if (sizeMB > 25) return `Error: file too large: ${sizeMB.toFixed(1)}MB (Whisper limit: 25MB).`;

  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  const form = new FormData();
  form.append('model', 'whisper-1');
  form.append('file', blob, args.filename);

  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ctx.openaiKey}` },
    body: form,
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    return `Error: transcription failed: ${e.error?.message || r.status}`;
  }
  const result = await r.json();
  const transcript = result.text || '';

  if (args.action === 'summarize') {
    const sr = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ctx.openaiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o', temperature: 0.3, max_tokens: 2000,
        messages: [
          { role: 'system', content: 'Summarize the transcript into key points. Group by topics. Highlight action items.' },
          { role: 'user', content: transcript },
        ],
      }),
    });
    if (sr.ok) {
      const sd = await sr.json();
      return `🎙 Summary — ${args.filename} (${sizeMB.toFixed(1)}MB)\n\n${sd.choices[0].message.content}\n\n── Full Transcript ──\n${transcript.substring(0, 2000)}${transcript.length > 2000 ? '…' : ''}`;
    }
  }
  return `🎙 Transcription — ${args.filename} (${sizeMB.toFixed(1)}MB, ${transcript.split(/\s+/).length} words)\n\n${transcript}`;
}

async function toolPublishContentUpdate(args, ctx) {
  const proposalHash = String(args.proposal_hash || '').trim();
  if (!proposalHash) {
    throw new Error('proposal_hash is required for publish_content_update.');
  }

  const candidateSiteData = normalizeCandidateInput(args.site_data);
  const repo = getRepo(ctx.env);
  const { siteData: currentSiteData, sha: currentSha } = await fetchSiteData(ctx.githubToken, ctx.env);

  if (args.base_site_sha && args.base_site_sha !== currentSha) {
    return JSON.stringify({
      ok: false,
      status: 'source_conflict',
      error: 'content/site.json changed since this proposal was created. Generate a new proposal before publishing.',
      base_site_sha: args.base_site_sha,
      current_site_sha: currentSha,
    }, null, 2);
  }

  const expectedHash = await hashProposal(candidateSiteData);
  if (expectedHash !== proposalHash) {
    return JSON.stringify({
      ok: false,
      status: 'proposal_hash_mismatch',
      error: 'proposal_hash does not match the provided site_data.',
      changed_paths: getChangedPaths(currentSiteData, candidateSiteData),
    }, null, 2);
  }

  const validation = validateCandidateData(currentSiteData, candidateSiteData);
  if (!validation.ok) {
    return JSON.stringify({
      ok: false,
      status: 'validation_failed',
      validation_errors: validation.errors,
      blocked_paths: getBlockedPaths(validation.errors),
      changed_paths: getChangedPaths(currentSiteData, candidateSiteData),
      diff_summary: buildDiffSummary(currentSiteData, candidateSiteData),
    }, null, 2);
  }

  const changedPaths = getChangedPaths(currentSiteData, candidateSiteData);
  if (changedPaths.length === 0) {
    return JSON.stringify({
      ok: false,
      status: 'no_changes',
      error: 'There are no content changes to publish.',
      changed_paths: [],
    }, null, 2);
  }

  const putResponse = await ghAPI(`/repos/${repo}/contents/content/site.json`, ctx.githubToken, {
    method: 'PUT',
    body: JSON.stringify({
      message: String(args.commit_message || 'content: publish Android proposal'),
      content: encodeJsonToBase64(candidateSiteData),
      sha: currentSha,
      branch: 'main',
    }),
  });

  if (putResponse.status === 409) {
    return JSON.stringify({
      ok: false,
      status: 'source_conflict',
      error: 'GitHub rejected the publish because content/site.json changed. Generate a fresh proposal and try again.',
    }, null, 2);
  }

  if (!putResponse.ok) {
    if (putResponse.status === 401 || putResponse.status === 403) {
      throw new Error('GitHub token is missing Contents: Read and write permission for this repo.');
    }
    const errorBody = await putResponse.json().catch(() => ({}));
    throw new Error(errorBody.message || `GitHub API ${putResponse.status}`);
  }

  const result = await putResponse.json();
  return JSON.stringify({
    ok: true,
    status: 'published',
    commit_sha: result.commit?.sha || '',
    commit_url: result.commit?.html_url || '',
    live_url: getLiveUrl(ctx.env),
    changed_paths: changedPaths,
    new_site_sha: result.content?.sha || '',
  }, null, 2);
}

// ── Tool Router ───────────────────────────────────────────────
const TOOL_MAP = {
  read_content: toolReadContent,
  propose_content_update: toolProposeContentUpdate,
  publish_content_update: toolPublishContentUpdate,
  list_pages: toolListPages,
  search_content: toolSearchContent,
  get_history: toolGetHistory,
  analyze_seo: toolAnalyzeSEO,
  check_deploy: toolCheckDeploy,
  backup_site: toolBackupSite,
  generate_social: toolGenerateSocial,
  lighthouse_audit: toolLighthouseAudit,
  transcribe_audio: toolTranscribeAudio,
};

async function executeTool(name, args, ctx) {
  const fn = TOOL_MAP[name];
  if (!fn) throw new Error(`Unknown tool: ${name}`);
  assertToolCredentials(name, ctx);
  return fn(args || {}, ctx);
}

// ── MCP Protocol Handler ──────────────────────────────────────
async function handleMCP(request, env) {
  const body = await request.json();
  const ctx = buildContext(request, env);

  // Handle JSON-RPC
  const { id, method, params } = body;

  switch (method) {
    case 'initialize':
      return corsResponse({
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'jm-ai-mcp', version: '1.0.0' },
        },
      });

    case 'notifications/initialized':
      return corsResponse({ jsonrpc: '2.0', id: null, result: {} });

    case 'tools/list':
      return corsResponse({ jsonrpc: '2.0', id, result: { tools: TOOLS } });

    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      try {
        const result = await executeTool(toolName, toolArgs, ctx);
        return corsResponse({
          jsonrpc: '2.0', id,
          result: { content: [{ type: 'text', text: result }] },
        });
      } catch (err) {
        return corsResponse({
          jsonrpc: '2.0', id,
          error: { code: -32000, message: err.message || 'Tool execution failed' },
        });
      }
    }

    default:
      return corsResponse({
        jsonrpc: '2.0', id,
        error: { code: -32601, message: `Method not found: ${method}` },
      });
  }
}

// ── REST API Handler ──────────────────────────────────────────
async function handleREST(request, env) {
  const body = await request.json();
  const { name, arguments: args } = body;
  const ctx = buildContext(request, env);

  if (!name) return corsResponse({ error: 'Missing "name" in request body' }, 400);
  if (!TOOL_MAP[name]) return corsResponse({ error: `Unknown tool: ${name}` }, 404);

  try {
    const result = await executeTool(name, args || {}, ctx);
    return corsResponse({ result });
  } catch (err) {
    return corsResponse({ error: err.message || 'Tool execution failed' }, err.status || 500);
  }
}

// ── Chat API Handler ──────────────────────────────────────────
async function handleChat(request, env) {
  const body = await request.json();
  const { message, history, page } = body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return corsResponse({ error: 'Missing "message" in request body' }, 400);
  }

  const ctx = buildChatContext(request, env);

  if (!ctx.openaiKey) {
    return corsResponse({ error: 'OPENAI_API_KEY is not configured on the worker.' }, 500);
  }

  // Build messages array
  const systemContent = page
    ? CHAT_SYSTEM_PROMPT + `\n\nThe user is currently viewing the "${page}" page.`
    : CHAT_SYSTEM_PROMPT;

  const messages = [{ role: 'system', content: systemContent }];

  // Add trimmed history (last 20 entries)
  if (Array.isArray(history)) {
    const trimmed = history.slice(-20);
    for (const entry of trimmed) {
      if (entry && entry.role && entry.content) {
        messages.push({ role: entry.role, content: entry.content });
      }
    }
  }

  // Add current user message
  messages.push({ role: 'user', content: message.trim() });

  try {
    const result = await runChatLoop(messages, ctx);
    return corsResponse(result);
  } catch (err) {
    return corsResponse({ error: err.message || 'Chat request failed' }, 500);
  }
}

// ── Context Builder ───────────────────────────────────────────
function buildContext(request, env) {
  return {
    githubToken: request.headers.get('X-GitHub-Token') || '',
    openaiKey: request.headers.get('X-OpenAI-Key') || '',
    env,
  };
}

// ── Worker Entry Point ────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check
    if (url.pathname === '/health' && request.method === 'GET') {
      return corsResponse({
        status: 'ok',
        server: 'jm-ai-mcp',
        version: '1.0.0',
        tools: TOOLS.length,
        chatEnabled: !!env.OPENAI_API_KEY,
      });
    }

    // Tool list (GET convenience)
    if (url.pathname === '/tools' && request.method === 'GET') {
      return corsResponse({ tools: TOOLS.map(t => ({ name: t.name, description: t.description })) });
    }

    // MCP Streamable HTTP
    if (url.pathname === '/mcp' && request.method === 'POST') {
      const authError = requireWorkerAuth(request, env);
      if (authError) return authError;
      return handleMCP(request, env);
    }

    // Simple REST API
    if (url.pathname === '/api/tool' && request.method === 'POST') {
      const authError = requireWorkerAuth(request, env);
      if (authError) return authError;
      return handleREST(request, env);
    }

    // Chat API (server-side AI)
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      const authError = requireWorkerAuth(request, env);
      if (authError) return authError;
      return handleChat(request, env);
    }

    return corsResponse({ error: 'Not found' }, 404);
  },
};
