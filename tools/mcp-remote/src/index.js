/**
 * JM AI Consulting — MCP Tool Server (Cloudflare Worker)
 * ======================================================
 * Exposes 10 site-management tools via two interfaces:
 *
 *   POST /mcp           — MCP Streamable HTTP (VS Code, Claude Desktop)
 *   POST /api/tool      — Simple REST (admin panel, Android app)
 *   GET  /health        — Health check
 *
 * Caller auth is required for public deployments:
 *   X-Worker-Auth    — Shared secret configured as WORKER_SHARED_SECRET
 *
 * User-scoped credentials are passed per-request in headers:
 *   X-GitHub-Token   — GitHub PAT (contents:read/write, actions:read)
 *   X-OpenAI-Key     — OpenAI API key (for social posts, transcription)
 */

import {
  assertToolCredentials,
  getLiveUrlForRepo,
  getWorkerAuthFailure,
} from './policy.js';

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
];

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
  const decoded = atob(data.content.replace(/\n/g, ''));
  return { siteData: JSON.parse(decoded), sha: data.sha, raw: data.content.replace(/\n/g, '') };
}

// ── Tool Implementations ──────────────────────────────────────

async function toolReadContent(args, ctx) {
  const { siteData } = await fetchSiteData(ctx.githubToken, ctx.env);
  if (args.page && siteData[args.page]) return JSON.stringify(siteData[args.page], null, 2);
  return JSON.stringify(siteData, null, 2);
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
  if (!r.ok) return `Error fetching history: HTTP ${r.status}`;
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
      return 'GitHub token is missing Actions: read permission or repo access for Deploy Status.';
    }
    return `Error checking deploys: HTTP ${r.status}`;
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
    return `Error creating backup: HTTP ${putR.status}`;
  }
  if (args.action === 'list') {
    const r = await ghAPI(`/repos/${repo}/contents/_backups?ref=main`, ctx.githubToken);
    if (r.status === 404) return 'No backups found. Ask me to create one.';
    if (!r.ok) return `Error listing backups: HTTP ${r.status}`;
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
    if (!bR.ok) return `Backup not found: ${args.backup_id}`;
    const backupFile = await bR.json();
    const backupContent = backupFile.content.replace(/\n/g, '');
    const curR = await ghAPI(`/repos/${repo}/contents/content/site.json?ref=main`, ctx.githubToken);
    if (!curR.ok) return 'Error reading current content';
    const curFile = await curR.json();
    const putR = await ghAPI(`/repos/${repo}/contents/content/site.json`, ctx.githubToken, {
      method: 'PUT',
      body: JSON.stringify({ message: `restore: ${args.backup_id}`, content: backupContent, sha: curFile.sha, branch: 'main' }),
    });
    if (putR.ok) return `✓ Restored from ${args.backup_id}! Site will rebuild in ~1 minute.`;
    return `Error restoring: HTTP ${putR.status}`;
  }
  return `Unknown action: ${args.action}. Use: backup, list, or restore.`;
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
  if (!r.ok) return r.status === 400 ? `Error: Could not audit ${targetUrl}. Is the site deployed?` : `PageSpeed API error: HTTP ${r.status}`;
  const data = await r.json();
  const lhr = data.lighthouseResult;
  if (!lhr) return 'No Lighthouse results returned.';

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
  if (!validExts.includes(ext)) return `Unsupported format: ${ext}. Supported: ${validExts.join(', ')}`;

  // Decode base64 to binary
  const binaryStr = atob(args.audio_base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  const sizeMB = bytes.length / (1024 * 1024);
  if (sizeMB > 25) return `File too large: ${sizeMB.toFixed(1)}MB (Whisper limit: 25MB).`;

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
    return `Transcription error: ${e.error?.message || r.status}`;
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

// ── Tool Router ───────────────────────────────────────────────
const TOOL_MAP = {
  read_content: toolReadContent,
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

    return corsResponse({ error: 'Not found' }, 404);
  },
};
