# JM AI MCP Server

Remote MCP tool server for JM AI Consulting, deployed as a Cloudflare Worker.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/chat` | Server-side AI chat — the admin panel and Android app send messages here. The worker calls OpenAI and executes tools on behalf of the client. |
| `POST` | `/mcp` | MCP Streamable HTTP (VS Code, Claude Desktop) |
| `POST` | `/api/tool` | Simple REST API for direct tool calls (publish, restore, etc.) |
| `GET`  | `/tools` | List available tools |
| `GET`  | `/health` | Health check |

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A free [Cloudflare](https://dash.cloudflare.com/sign-up) account
- An [OpenAI API key](https://platform.openai.com/api-keys) (~$5 credit)
- A [GitHub Fine-grained PAT](https://github.com/settings/personal-access-tokens/new) with **Contents: Read and write** (add **Actions: Read** for deploy status)

## Setup

```bash
cd tools/mcp-remote
npm install
```

## Deploy to Cloudflare

```bash
npx wrangler deploy
```

Note your worker URL (e.g. `https://jm-ai-mcp.YOUR-SUBDOMAIN.workers.dev`).

### Set Secrets

Two secrets must be set on Cloudflare. They are stored encrypted and never appear in code:

```bash
# 1. Shared secret — all callers must send this in the X-Worker-Auth header
npx wrangler secret put WORKER_SHARED_SECRET
# Choose any strong passphrase (e.g. "my-secret-2026")

# 2. OpenAI API key — used by the /api/chat endpoint on the server side
npx wrangler secret put OPENAI_API_KEY
# Paste your sk-... key
```

> **Important:** These secrets live on Cloudflare, not in any local file. If you redeploy, the secrets persist — you only set them once.

### Local Development (optional)

To run the worker locally with `npx wrangler dev`, create a `.dev.vars` file in this directory:

```
WORKER_SHARED_SECRET=my-local-secret
OPENAI_API_KEY=sk-your-key-here
```

> `.dev.vars` is Wrangler's equivalent of `.env`. Never commit it.

## Authentication

| Header | Required | Purpose |
|--------|----------|---------|
| `X-Worker-Auth` | Yes (deployed) | Shared secret — must match `WORKER_SHARED_SECRET` |
| `X-GitHub-Token` | Yes | GitHub PAT for reading/writing repo content |

- `/api/chat` uses the **server-side** `OPENAI_API_KEY` secret — callers do NOT send an OpenAI key.
- `/api/tool` and `/mcp` require callers to pass `X-OpenAI-Key` per-request (only for tools that need OpenAI, like social post generation).

## Usage Examples

### Chat API (admin panel / Android app)

```bash
curl -X POST https://YOUR-WORKER.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -H "X-Worker-Auth: your-shared-secret" \
  -H "X-GitHub-Token: ghp_..." \
  -d '{
    "message": "What services do we offer?",
    "history": [],
    "page": null
  }'
```

Response:
```json
{
  "reply": "Your site lists three services: ...",
  "toolResults": [
    { "tool": "analyze_seo", "result": "{...}" }
  ]
}
```

### Direct Tool Call

```bash
curl -X POST https://YOUR-WORKER.workers.dev/api/tool \
  -H "Content-Type: application/json" \
  -H "X-Worker-Auth: your-shared-secret" \
  -H "X-GitHub-Token: ghp_..." \
  -d '{"name": "analyze_seo", "arguments": {"page": "home"}}'
```

### VS Code MCP Configuration

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "jm-ai-tools": {
      "type": "http",
      "url": "https://YOUR-WORKER.workers.dev/mcp",
      "headers": {
        "X-Worker-Auth": "${input:workerSecret}",
        "X-GitHub-Token": "${input:githubToken}",
        "X-OpenAI-Key": "${input:openaiKey}"
      }
    }
  }
}
```

### Local Development

```bash
npx wrangler dev
```

This starts a local server at `http://localhost:8787` for testing.

## Available Tools

| Tool | Description |
|------|-------------|
| `read_content` | Read site.json from GitHub |
| `propose_content_update` | Generate and validate a site.json proposal for Android editing |
| `publish_content_update` | Publish a previously validated Android proposal to GitHub |
| `list_pages` | List all editable fields |
| `search_content` | Search text across all pages |
| `get_history` | Recent commit history |
| `analyze_seo` | SEO quality analysis (0-100 scoring) |
| `check_deploy` | GitHub Actions deploy status |
| `backup_site` | Create / list / restore backups |
| `generate_social` | AI social media post generator |
| `lighthouse_audit` | Google PageSpeed Insights audit |
| `transcribe_audio` | Audio transcription via Whisper |

`propose_content_update` and `publish_content_update` are intended for the Android proposal/review/publish flow. The web admin panel still uses its own diff-and-publish UI.
