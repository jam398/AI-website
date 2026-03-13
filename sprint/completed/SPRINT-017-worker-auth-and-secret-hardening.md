# SPRINT-017 - Worker Auth and Secret Hardening

**Status:** Completed  
**Priority:** Critical  
**Created:** 2026-03-13  
**Depends on:** Existing `tools/mcp-remote` worker deployment

---

## Problem

The Cloudflare Worker currently accepts unauthenticated requests and can fall back to worker-level `GITHUB_TOKEN` and `OPENAI_API_KEY` secrets. If those secrets are configured, any caller with the worker URL can spend API budget and mutate repository content.

This is the highest-risk issue in the project and must be fixed before more platform expansion.

---

## Goal

Make the worker safe to expose on the public internet by requiring explicit caller authorization and by removing unsafe secret-fallback behavior for mutating or billable operations.

---

## Scope

### In scope

- Add request authentication for `/api/tool` and `/mcp`
- Define allowed auth modes for local dev vs deployed worker
- Remove or strictly constrain secret fallback
- Separate read-only vs mutating tool access rules
- Return clear auth errors to callers
- Update admin panel to send the new auth signal
- Update worker docs and deployment guidance

### Out of scope

- Full user account system
- Per-user database-backed sessions
- Android implementation changes outside protocol compatibility notes

---

## Required Design Decisions

1. Worker must reject anonymous requests in production.
2. Worker secrets must not silently authorize public callers.
3. Mutating tools (`backup_site restore`, future publish-like tools) must require explicit user-scoped credentials.
4. Billable tools (`generate_social`, `transcribe_audio`) must require explicit OpenAI credentials or a deliberate server-side allowlist mode.
5. Local development can support a reduced-friction mode, but only behind explicit dev flags.

---

## Proposed Implementation

### Worker auth model

- Add a required shared auth header such as `X-Worker-Auth`
- Validate against a Cloudflare secret like `WORKER_SHARED_SECRET`
- Reject with `401` if missing or invalid
- Apply the check to both `/api/tool` and `/mcp`

### Credential rules

- Remove broad fallback from:
  - `request header -> worker secret -> empty`
- Replace with:
  - user-scoped request credentials required for mutating tools
  - user-scoped request credentials required for OpenAI-billable tools
  - optional worker defaults allowed only for explicitly configured read-only tools, if still needed

### Tool authorization matrix

- Read-only GitHub tools:
  - `read_content`
  - `list_pages`
  - `search_content`
  - `get_history`
  - `analyze_seo`
  - `check_deploy`
  - `lighthouse_audit`
- Mutating GitHub tools:
  - `backup_site` with `backup`
  - `backup_site` with `restore`
- OpenAI-billable tools:
  - `generate_social`
  - `transcribe_audio`

### Error contract

- `401`: missing or invalid worker auth
- `403`: caller authenticated to worker but missing required downstream credential
- `400`: bad tool arguments
- `500`: execution failure after validation

---

## TDD Plan

### Unit tests

- `buildContext` does not silently authorize anonymous callers
- auth middleware rejects missing shared secret
- auth middleware rejects wrong shared secret
- per-tool authorization policy classifies tools correctly
- secret fallback does not apply to mutating or billable tools

### Integration tests

- `POST /health` remains public only if deliberately kept public
- `POST /api/tool` without auth returns `401`
- `POST /mcp` without auth returns `401`
- authenticated read-only tool with valid GitHub token succeeds
- authenticated mutating tool without GitHub token returns `403`
- authenticated transcription call without OpenAI key returns `403`
- authenticated call with all required headers succeeds

### Manual verification

- Admin panel works when configured with worker shared secret
- local dev still works under documented dev mode
- worker secrets alone no longer let a random curl call mutate data

---

## Files Expected to Change

- `tools/mcp-remote/src/index.js`
- `tools/mcp-remote/README.md`
- `tools/mcp-remote/wrangler.toml`
- `admin/index.html`
- `README.md`
- `MANUAL.md`

---

## Acceptance Criteria

- [x] Worker rejects anonymous requests in production
- [x] Worker secret fallback is removed or explicitly restricted by policy
- [x] Mutating tools require caller-supplied GitHub credentials
- [x] OpenAI-billable tools require caller-supplied OpenAI credentials
- [x] Admin panel can authenticate to the worker using the new contract
- [x] Documentation explains secure deployment and unsafe configurations are removed
- [x] Test coverage exists for auth success and failure paths

---

## Risks

- Breaking the current admin panel until both sides are updated together
- Confusion between worker auth and downstream GitHub/OpenAI credentials
- Users with already deployed workers may need secret rotation

---

## Exit Criteria

This sprint is complete only when the worker can no longer be used as a public proxy and the secure deployment path is the default documented path.
