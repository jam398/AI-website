# JM AI MCP Server

Remote MCP tool server for JM AI Consulting, deployed as a Cloudflare Worker.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/mcp` | MCP Streamable HTTP (VS Code, Claude Desktop) |
| `POST` | `/api/tool` | Simple REST API (admin panel, Android app) |
| `GET`  | `/tools` | List available tools |
| `GET`  | `/health` | Health check |

## Setup

```bash
cd tools/mcp-remote
npm install
```

## Deploy to Cloudflare

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com/sign-up) (free)
2. Deploy:
   ```bash
   npx wrangler deploy
   ```
3. Note your worker URL (e.g. `https://jm-ai-mcp.YOUR-SUBDOMAIN.workers.dev`)

### Optional: Set server-side secrets

If you want the worker to have default API keys (instead of passing them per-request):

```bash
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put OPENAI_API_KEY
```

## Usage

### REST API (admin panel / Android app)

```bash
curl -X POST https://YOUR-WORKER.workers.dev/api/tool \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Token: ghp_..." \
  -H "X-OpenAI-Key: sk-..." \
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
| `list_pages` | List all editable fields |
| `search_content` | Search text across all pages |
| `get_history` | Recent commit history |
| `analyze_seo` | SEO quality analysis (0-100 scoring) |
| `check_deploy` | GitHub Actions deploy status |
| `backup_site` | Create / list / restore backups |
| `generate_social` | AI social media post generator |
| `lighthouse_audit` | Google PageSpeed Insights audit |
| `transcribe_audio` | Audio transcription via Whisper |
