# SPRINT-008 — MCP Integration for Admin Chatbox

**Status:** 📋 Planned  
**Priority:** Medium  
**Created:** 2026-03-06

## Goal

Turn the admin panel chatbox into a full MCP client by adding a local bridge server that connects the browser to MCP tool servers.

## Architecture

```
Browser Chatbox → HTTP → MCP Bridge (localhost:3456) → stdio → MCP Servers
```

## Components to Build

| Component | Est. Lines | Purpose |
|---|---|---|
| `tools/mcp-bridge/bridge.js` | ~150 | HTTP server managing MCP server processes |
| `tools/mcp-bridge/config.json` | ~15 | MCP server registry |
| `tools/site-editor-mcp/index.js` | ~200 | Site editing MCP server (read, edit, publish, rollback, history) |
| Admin panel changes | ~80 | Fetch tools on load, GPT-4o function calling integration |

## MCP Tools Discussed

### Site Editor (custom)
- `read_content` — read site.json from GitHub
- `edit_content` — propose JSON changes
- `publish` — commit to GitHub
- `list_pages` — show available pages/fields
- `rollback` — revert to previous commit
- `get_history` — show recent changes
- `search_content` — find text across all pages
- `analyze_seo` — check meta tags, headings
- `validate_links` — check URLs and emails
- `preview_page` — generate HTML preview

### Potential Community MCP Servers (plug-and-play)
- TBD — to be discussed

## Prerequisites
- Node.js (already installed)
- Run `node tools/mcp-bridge/bridge.js` before using admin panel

## Also Works As
- **MCP server** for Claude Desktop / VS Code (no bridge needed)
- **CLI tool** for direct terminal use

## Acceptance Criteria
- [ ] MCP bridge server runs on localhost
- [ ] Admin chatbox discovers tools on page load
- [ ] GPT-4o uses function calling to invoke MCP tools
- [ ] Site editor MCP server implements core tools
- [ ] Community MCP servers can be added via config.json
- [ ] Existing chatbox functionality unchanged (dual-mode AI still works)

## Notes
- Sprint created for planning. Awaiting tool selection discussion before implementation.
