# Spec: Server-Side Chat — Move OpenAI API to Cloudflare Worker

## Status

Ready

## Problem Statement

Both clients (web admin and Android app) call the OpenAI API directly from
the device, then the MCP worker separately for tools. This creates five
concrete problems:

1. **Secrets on the client** — The OpenAI API key is stored in plaintext
   localStorage (web) and EncryptedSharedPreferences (Android). The web
   version is readable by any JS on the page, browser extensions, or
   devtools.
2. **Divergent system prompts** — Web allows raw JSON responses and
   AI-initiated publishes. Android forbids both. Same model, contradictory
   instructions. This leads to inconsistent AI behavior across platforms.
3. **Divergent tool definitions** — Web exposes 10 tools to GPT. Android
   exposes 12. The AI sees a different surface depending on which client
   called it.
4. **Duplicated tool-calling loop** — Web implements the tool loop in
   inline JS (~200 lines). Android implements it in ChatRepository.kt
   (~350 lines). Both have independent retry limits, timeouts, and error
   handling. Any bug fix must be applied twice.
5. **Android has no local validation** — Web runs site-policy.js before
   showing changes. Android trusts the server completely. If the worker
   validation fails, Android has no fallback.

## Goals

- Single OpenAI integration point on the Cloudflare Worker
- One system prompt, one tool list, one tool-calling loop
- Clients never handle or store the OpenAI API key
- Both clients reduce to thin chat UIs (send message, render response)
- Proposal/publish workflow stays the same (propose → review → publish)
- Problem 5 (Android validation) is solved by the worker owning all
  validation before returning proposals to the client

## Non-Goals

- Streaming responses (SSE) — out of scope for this spec; can be added
  later as a follow-up spec
- User accounts or session management — clients continue to be stateless
  (conversation history sent per request)
- Changing the existing `/api/tool` endpoint — it stays for direct tool
  calls (MCP clients, VS Code, Claude Desktop still use it)
- Changing the MCP Streamable HTTP endpoint (`/mcp`) — unchanged
- Modifying the Ollama helper — it is a standalone local tool

## Current State

### Cloudflare Worker (`tools/mcp-remote/src/index.js`)

- ~1000 lines, handles `/mcp`, `/api/tool`, `/health`, `/tools`
- Already calls OpenAI for `propose_content_update`, `generate_social`,
  `transcribe_audio`
- Already imports `site-policy.js` for validation
- Auth: `X-Worker-Auth` (shared secret), `X-GitHub-Token`, `X-OpenAI-Key`
  passed per-request
- Env vars: `WORKER_SHARED_SECRET`, `GITHUB_REPO`
- No conversation/session state

### Web Admin (`admin/index.html`)

- Inline JS (~1500 lines total, ~200 for chat/tool loop)
- Calls OpenAI `v1/chat/completions` directly from browser
- Implements tool-calling loop: send → check for tool_calls → execute
  tools via `/api/tool` → feed results back → repeat
- System prompt defined inline (allows raw JSON, direct publish)
- Stores: `openaiKey`, `githubToken`, `mcpUrl`, `workerAuth` in
  localStorage
- 10 tool definitions sent to GPT

### Android App (`ChatRepository.kt`)

- ~350 lines, Hilt singleton
- Calls OpenAI `v1/chat/completions` directly from device
- Implements tool-calling loop: max 6 iterations, 3-minute timeout
- System prompt defined as constant (forbids raw JSON, forbids publish)
- 12 tool definitions sent to GPT
- Stores keys in EncryptedSharedPreferences

### Policy file (`tools/mcp-remote/src/policy.js`)

- `TOOL_CREDENTIALS` map — which tools need GitHub, OpenAI, or both
- `requireAuth()` — checks `X-Worker-Auth` against env
- Exported and used by `index.js`

## Proposed Approach

### New endpoint: `POST /api/chat`

Add a new endpoint to the Cloudflare Worker that receives a chat message
and conversation history, runs the full OpenAI conversation loop (including
tool calls), and returns the final response.

**Request:**

```json
{
  "message": "Change the homepage headline to ...",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "page": "home"
}
```

- `message` — the new user message (required)
- `history` — previous conversation turns (optional, default `[]`)
- `page` — current page context for the system prompt (optional)

**Headers:**

- `X-Worker-Auth` — shared secret (required for deployed hosts)
- `X-GitHub-Token` — user's GitHub PAT (required)

**Note:** `X-OpenAI-Key` is NO LONGER sent by the client. The worker uses
its own `OPENAI_API_KEY` environment variable.

**Response:**

```json
{
  "reply": "I've prepared a proposal to change the headline...",
  "toolResults": [
    {
      "tool": "propose_content_update",
      "result": { "ok": true, "status": "proposal_ready", ... }
    }
  ]
}
```

- `reply` — the final assistant text message
- `toolResults` — array of tool call results from the conversation
  (optional, only present if tools were called). The client uses these to
  render proposal cards, deploy status, etc.

### Worker changes

1. Add `OPENAI_API_KEY` as a Worker secret (via `wrangler secret put`)
2. Move the system prompt into the worker (single source of truth)
3. Move tool definitions into the worker (already partially there)
4. Implement the tool-calling loop in the worker:
   - Max 6 tool call iterations (matches current Android limit)
   - Individual tool timeout: 30 seconds
   - Total conversation timeout: 3 minutes
5. Route `POST /api/chat` to the new handler
6. Return structured response with reply text + tool results

### Web admin changes

1. Replace direct OpenAI calls with `POST /api/chat`
2. Remove inline system prompt
3. Remove inline tool definitions
4. Remove tool-calling loop logic
5. Remove OpenAI API key from settings form and localStorage
6. Parse response: render `reply` as chat message, render `toolResults`
   as proposal cards / status cards
7. Settings form: only MCP URL, GitHub token, worker auth

### Android changes

1. Replace `OpenAIService` calls in `ChatRepository` with a new
   `ChatService` Retrofit interface calling `/api/chat`
2. Remove `SYSTEM_PROMPT` constant
3. Remove `ToolDefinitions.kt` (no longer needed client-side)
4. Remove tool-calling loop from `ChatRepository.sendMessage()`
5. Remove OpenAI API key from `AppSettings`, `SettingsStore`,
   `SettingsScreen`
6. Parse response: render `reply` as assistant message, render
   `toolResults` as proposal cards
7. `ToolExecutor` stays — still needed for direct tool calls
   (publish, restore, check deploy are user-initiated, not chat-initiated)

### Auth model change

| Credential | Before (client sends) | After (client sends) |
|------------|----------------------|---------------------|
| OpenAI key | ✓ | ✗ (worker env var) |
| GitHub token | ✓ | ✓ (still per-user) |
| Worker auth | ✓ | ✓ (still shared secret) |

## Architecture / Data / Flow Notes

### Before

```
Client                          OpenAI              Worker
──────                          ──────              ──────
1. POST /v1/chat/completions →  GPT-4o
   (with tools, system prompt)
2.                              ← tool_calls
3. POST /api/tool ──────────────────────────────→   Execute tool
4.                              ←──────────────── tool result
5. POST /v1/chat/completions →  GPT-4o
   (with tool results)
6.                              ← final reply
```

Client makes 2+ OpenAI calls + N tool calls per conversation turn.

### After

```
Client                          Worker              OpenAI
──────                          ──────              ──────
1. POST /api/chat ────────────→
2.                              POST /v1/chat ───→  GPT-4o
3.                              ← tool_calls
4.                              Execute tool locally
5.                              POST /v1/chat ───→  GPT-4o
6.                              ← final reply
7.              ←────────────── { reply, toolResults }
```

Client makes 1 call. Worker handles everything.

### Conversation state

Stateless. Client sends full `history` array with each request. The worker
prepends the system prompt, appends the new message, and runs the loop.

History trimming: worker takes the last 20 messages from `history` (matches
current Android behavior). Client can send more; worker truncates.

### Worker CPU time

The tool-calling loop involves multiple OpenAI round-trips. Each can take
5-15 seconds. Total may reach 60-90 seconds for complex requests.

- Cloudflare Workers Free: 10ms CPU — **not sufficient**
- Cloudflare Workers Paid ($5/mo): 30s CPU — **borderline**
- Cloudflare Workers Unbound: 15 min — **sufficient**

**Requirement:** Worker must be on the Paid plan or Unbound billing.
Verify this before implementation.

## Invariants

- The `/api/tool` endpoint continues to work unchanged (MCP clients,
  direct tool calls from Android publish/restore buttons)
- The `/mcp` endpoint continues to work unchanged
- The `/health` and `/tools` endpoints continue to work unchanged
- Content validation (site-policy.js) continues to run on proposals
- Protected fields remain protected
- Backup-before-publish workflow remains enforced
- The propose → review → publish lifecycle is unchanged
- Existing tests (19 passing) continue to pass
- Android `ToolExecutor` still works for direct tool calls

## Risks

1. **Worker CPU/time limits** — If the Cloudflare plan doesn't support
   long-running requests, the tool-calling loop will timeout. Mitigation:
   verify plan limits before starting. Consider request timeout of 120s.

2. **Large conversation histories** — Sending 20 messages of context +
   system prompt + tools may approach GPT-4o's context limit. Mitigation:
   keep the 20-message trim. Consider token counting if needed later.

3. **Worker code size** — index.js is already ~1000 lines. Adding the chat
   endpoint + tool loop could push it to ~1300. Mitigation: consider
   splitting into modules (chat-handler.js). Cloudflare Workers supports
   ES module format.

4. **Partial tool results on timeout** — If the worker times out mid-loop,
   the client gets nothing. Mitigation: return whatever results were
   collected before timeout with an error flag.

5. **OpenAI key rotation** — If the key needs rotating, it's now a worker
   secret update instead of a client config change. This is actually
   simpler (one place) but requires `wrangler secret put` access.

## Verification Strategy

1. `npm test` — All 19 existing tests pass
2. `npm run lint:content` — Content integrity check passes
3. `npm run build` — Eleventy build succeeds
4. Manual test: Send chat message via web admin → get response
5. Manual test: Send chat message via Android → get response
6. Manual test: Propose content change via chat → proposal card appears
7. Manual test: Publish proposal via button → change appears on site
8. Manual test: Direct tool call via `/api/tool` still works
9. Manual test: Health check returns OK
10. Verify OpenAI key is NOT stored on any client
11. Verify localStorage has no `openaiKey` entry after migration
12. Verify Android SettingsScreen no longer shows OpenAI key field
13. New unit tests for `/api/chat` endpoint on the worker

## Sprint Plan

### Sprint 1 — Worker: Add `/api/chat` endpoint

Add the chat endpoint to the Cloudflare Worker. Implement the system
prompt, tool-calling loop, and response formatting. Add `OPENAI_API_KEY`
as a worker secret. Write tests.

**Files:** `tools/mcp-remote/src/index.js`, `tools/mcp-remote/src/policy.js`

### Sprint 2 — Web Admin: Switch to `/api/chat`

Replace direct OpenAI calls with the new endpoint. Remove OpenAI key from
settings and localStorage. Simplify the chat logic. Update tests.

**Files:** `admin/index.html`, `_site/admin/index.html`,
`tests/admin-logic.test.js`

### Sprint 3 — Android: Switch to `/api/chat`

Replace OpenAI calls in ChatRepository with the new endpoint. Remove
`ToolDefinitions.kt`, OpenAI key from settings, simplify ChatRepository.
Update tests.

**Files:** `ChatRepository.kt`, `ChatViewModel.kt`, `AppSettings.kt`,
`SettingsStore.kt`, `SettingsScreen.kt`, `AppModule.kt`,
`ToolDefinitions.kt`, `ApiModels.kt`, various test files

### Sprint 4 — Cleanup & Cross-Platform Verification

Remove dead code. Verify both clients work end-to-end. Run all test
suites. Verify no secrets on clients. Final QA.

**Files:** All changed files from Sprints 1-3

## Open Questions (Resolved)

1. **Cloudflare plan:** Free tier. CPU time is 10ms but I/O wait
   (OpenAI calls) doesn't count. Start on free; upgrade to Paid ($5/mo)
   if timeouts occur. No code changes needed to upgrade.
2. **Streaming:** Non-streaming first. Full response returned after the
   worker finishes the tool-calling loop. Streaming (SSE) is a follow-up.
3. **OpenAI key storage:** Worker secret via `wrangler secret put
   OPENAI_API_KEY`. Not visible in dashboard or code.

## Completion Criteria

- `/api/chat` endpoint works on the worker and handles the full
  conversation + tool loop
- Web admin calls `/api/chat` instead of OpenAI directly
- Android calls `/api/chat` instead of OpenAI directly
- OpenAI API key exists only on the Cloudflare Worker (env secret)
- No client stores or sends the OpenAI API key
- System prompt and tool definitions exist in one place (worker)
- All 19 existing tests pass
- New tests cover the `/api/chat` endpoint
- Proposal/publish workflow works end-to-end on both clients
- `/api/tool`, `/mcp`, `/health`, `/tools` endpoints unchanged
