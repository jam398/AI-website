# Sprint: Worker — Add `/api/chat` Endpoint

## Goal

Add a new `POST /api/chat` endpoint to the Cloudflare Worker that receives
a user message and conversation history, runs the full OpenAI GPT-4o
conversation loop (including tool calls), and returns the final assistant
reply plus any tool results. This makes the worker the single source of
truth for system prompt, tool definitions, and AI orchestration.

## Governing Spec

`sprint/planned/SPEC-server-side-chat.md`

## Status

Complete

> **File location rule:** Move the sprint file to match its status:
> - **Planned** → `sprint/planned/`
> - **Active** → `sprint/active/`
> - **Complete** → `sprint/completed/`
>
> When status changes, update this field AND move the file.

## Scope

- Add `OPENAI_API_KEY` as a worker secret
- Add `POST /api/chat` endpoint with auth
- Implement the system prompt (unified from web + Android)
- Implement the tool-calling loop (max 6 iterations)
- Return structured `{ reply, toolResults }` response
- Update CORS headers for the new endpoint
- Add unit-level validation (request shape, missing fields)

## Non-Goals

- Changing the web admin or Android app (Sprints 2 & 3)
- Streaming / SSE responses
- Session persistence or Durable Objects
- Removing or changing `/api/tool`, `/mcp`, `/health`, `/tools`
- Changing any existing tool implementation

## Available Assets / Current State

| Asset | Path | Role | Notes |
|-------|------|------|-------|
| Worker entry | `tools/mcp-remote/src/index.js` | Main worker, ~840 lines | Has `TOOLS`, `executeTool()`, `buildContext()`, routing |
| Policy module | `tools/mcp-remote/src/policy.js` | Auth helpers | `getWorkerAuthFailure()`, `assertToolCredentials()`, `getToolRequirements()` |
| Site policy | `admin/site-policy.js` | Validation | Already imported by worker via relative path |
| Wrangler config | `tools/mcp-remote/wrangler.toml` | Worker config | Needs `OPENAI_API_KEY` secret |
| Web system prompt | `admin/index.html` line 443 | SYSTEM_PROMPT + TOOL_ERROR_PROMPT | Two modes: CONVERSATION + EDIT |
| Android system prompt | `ChatRepository.kt` | SYSTEM_PROMPT constant | Conservative: forbids raw JSON, forbids publish from chat |
| Web tool loop | `admin/index.html` lines 860-940 | callAI() | Single tool round-trip, then final response |
| Android tool loop | `ChatRepository.kt` sendMessage() | Tool loop | Max 6 iterations, 3-min timeout |

### Key existing patterns in index.js

- `buildContext(request, env)` → `{ githubToken, openaiKey, env }`
- `executeTool(name, args, ctx)` → string result
- `requireWorkerAuth(request, env)` → null or error Response
- `corsResponse(body, status, extra)` → Response
- `TOOLS` array — 12 tool definitions in MCP format
- Worker already calls OpenAI for `propose_content_update`,
  `generate_social`, `transcribe_audio`

## Files Expected To Change

- `tools/mcp-remote/src/index.js` — add chat handler, system prompt,
  tool-calling loop, route
- `tools/mcp-remote/src/policy.js` — add chat endpoint credential reqs

## Tasks

### Task 1. Add `OPENAI_API_KEY` to worker secrets

- **Objective:** Store the OpenAI key as a Cloudflare Worker secret so
  the `/api/chat` endpoint can use it without clients sending it
- **Files:** None (CLI command only)
- **Changes:** Run `npx wrangler secret put OPENAI_API_KEY` and paste key
- **Unchanged:** All existing env vars (`WORKER_SHARED_SECRET`,
  `GITHUB_REPO`)
- **Verify:** `npx wrangler secret list` shows `OPENAI_API_KEY`

### Task 2. Define the unified system prompt

- **Objective:** Create a single system prompt that both platforms will
  use, replacing the divergent web and Android prompts. The prompt should
  be conservative (like Android): no raw JSON to the user, no AI-initiated
  publishes, tool errors preserved verbatim.
- **Files:** `tools/mcp-remote/src/index.js`
- **Changes:** Add a `CHAT_SYSTEM_PROMPT` constant near the top of the
  file (after TOOLS). It should:
  - Introduce the assistant as a content editor for "JM AI Consulting"
  - Tell it to use tools for content operations (propose_content_update,
    read_content, etc.)
  - Instruct it to NEVER return raw JSON to the user
  - Instruct it to NEVER call `publish_content_update` from chat — only
    the app's publish button does that
  - Instruct it to preserve exact tool errors (no masking)
  - Reference the page context if provided
  - List all 12 available tools and when to use each
- **Unchanged:** Existing `TOOLS` array, all tool implementations
- **Verify:** Prompt is a string constant, no syntax errors in the file

### Task 3. Implement the tool-calling loop

- **Objective:** Create a `runChatLoop()` function that sends a
  conversation to OpenAI and iterates through tool calls until the
  model returns a final text response
- **Files:** `tools/mcp-remote/src/index.js`
- **Changes:** Add a function with this signature and behavior:
  ```
  async function runChatLoop(messages, ctx, env) → { reply, toolResults }
  ```
  Logic:
  1. Convert `TOOLS` (MCP format) to OpenAI function-calling format
  2. Call OpenAI `v1/chat/completions` using `env.OPENAI_API_KEY`
  3. If response has `tool_calls`:
     a. Execute each tool via existing `executeTool()`
     b. Append assistant message + tool results to messages
     c. Collect tool results in `toolResults` array
     d. Loop back to step 2
  4. If response is text (no tool calls): return `{ reply, toolResults }`
  5. Safety limits: max 6 loop iterations, return partial results if hit
  6. Error handling: if OpenAI call fails, throw with clear message.
     If a tool fails, include the error as the tool result (don't abort
     the loop — let GPT handle the error)
- **Unchanged:** `executeTool()`, `TOOL_MAP`, all tool functions
- **Verify:** Function exists, handles tool_calls and text responses

### Task 4. Convert TOOLS from MCP format to OpenAI format

- **Objective:** Create a helper that converts the existing `TOOLS` array
  (MCP `inputSchema` format) to OpenAI's function-calling format
  (`tools` with `type: "function"` and `function.parameters`)
- **Files:** `tools/mcp-remote/src/index.js`
- **Changes:** Add a function or constant that maps each tool:
  ```
  MCP:    { name, description, inputSchema: { type, properties, required } }
  OpenAI: { type: "function", function: { name, description, parameters: { type, properties, required } } }
  ```
  This is a direct structural rename — `inputSchema` → `parameters`.
  Filter out `publish_content_update` from the chat tools list (it must
  not be callable from chat, only from the publish button).
- **Unchanged:** Original `TOOLS` array (still used by `/mcp` and
  `/api/tool`)
- **Verify:** Mapped array has 11 tools (12 minus publish), correct
  OpenAI format

### Task 5. Implement the `/api/chat` handler

- **Objective:** Create `handleChat(request, env)` that processes the
  incoming request, builds the conversation, calls `runChatLoop()`,
  and returns the response
- **Files:** `tools/mcp-remote/src/index.js`
- **Changes:** Add handler function:
  1. Parse request body: `{ message, history, page }`
  2. Validate: `message` is required, `history` is optional array
  3. Build messages array:
     - System message: `CHAT_SYSTEM_PROMPT` + page context if provided
     - Last 20 entries from `history` (trim if longer)
     - Current user message
  4. Build context: `{ githubToken, openaiKey: env.OPENAI_API_KEY, env }`
     — note: openaiKey comes from env, NOT from request headers
  5. Call `runChatLoop(messages, ctx, env)`
  6. Return `corsResponse({ reply, toolResults })`
  7. Error handling: catch and return `corsResponse({ error }, 500)`
- **Unchanged:** `handleREST()`, `handleMCP()`
- **Verify:** Handler parses input, calls loop, returns structured output

### Task 6. Add the route

- **Objective:** Wire `POST /api/chat` into the worker's fetch handler
- **Files:** `tools/mcp-remote/src/index.js`
- **Changes:** In the `export default { async fetch() }` block, add a
  route for `/api/chat`:
  ```
  if (url.pathname === '/api/chat' && request.method === 'POST') {
    const authError = requireWorkerAuth(request, env);
    if (authError) return authError;
    return handleChat(request, env);
  }
  ```
  Place it after the `/api/tool` route and before the 404 fallback.
  Update CORS headers to keep the same `Access-Control-Allow-Headers`
  (already includes all needed headers).
- **Unchanged:** All existing routes
- **Verify:** Route responds to POST, rejects without auth, returns 404
  for GET

### Task 7. Update policy.js for chat credentials

- **Objective:** Ensure the chat endpoint correctly identifies that it
  needs a GitHub token (from request headers) but NOT an OpenAI key
  from the client
- **Files:** `tools/mcp-remote/src/policy.js`
- **Changes:** No changes needed to `getToolRequirements()` — tool
  credential checks still happen per-tool inside `executeTool()`. But
  when tools in the chat loop need OpenAI (e.g. `propose_content_update`),
  the context must use `env.OPENAI_API_KEY` instead of the header.
  Add an exported helper:
  ```
  export function buildChatContext(request, env) {
    return {
      githubToken: request.headers.get('X-GitHub-Token') || '',
      openaiKey: env.OPENAI_API_KEY || '',
      env,
    };
  }
  ```
- **Unchanged:** `getWorkerAuthFailure()`, `assertToolCredentials()`,
  existing `getToolRequirements()` entries
- **Verify:** buildChatContext uses env key, not header

### Task 8. Update health endpoint

- **Objective:** Report `/api/chat` availability in the health check
- **Files:** `tools/mcp-remote/src/index.js`
- **Changes:** Add `chatEnabled: !!env.OPENAI_API_KEY` to the health
  response object so clients can check if the chat endpoint is available
- **Unchanged:** Health endpoint remains public (no auth)
- **Verify:** `/health` response includes `chatEnabled` field

## Product Rules

- All existing endpoints (`/api/tool`, `/mcp`, `/health`, `/tools`)
  continue to work exactly as before
- The tool-calling loop must not exceed 6 iterations
- `publish_content_update` must NOT be in the chat tools list
- Tool errors are passed to GPT as tool results (not thrown)
- The OpenAI key comes from `env.OPENAI_API_KEY` for chat, NOT from
  request headers
- For `/api/tool` and `/mcp`, the OpenAI key still comes from
  `X-OpenAI-Key` header (backward compatible)
- Worker auth is required for `/api/chat` (same as `/api/tool`)
- Request validation rejects missing `message` field with 400

## Risks / Watchouts

1. **Free tier CPU limit** — The tool-calling loop is mostly I/O wait
   (fetching from OpenAI, GitHub). CPU time should stay under 10ms per
   iteration. If it doesn't, upgrade to Paid plan.
2. **OpenAI response size** — GPT-4o can return large responses. The
   worker must not buffer excessively. Return the response directly.
3. **Tool errors in loop** — A tool error must be passed back to GPT as
   a tool result, not abort the whole conversation. GPT should explain
   the error to the user.
4. **Existing buildContext()** — Don't modify it. Create
   `buildChatContext()` separately so existing endpoints keep using
   header-based OpenAI key.

## Verification

1. Deploy worker: `cd tools/mcp-remote && npx wrangler deploy`
2. Set secret: `npx wrangler secret put OPENAI_API_KEY`
3. Test health: `curl https://jm-ai-mcp.joseaddiel9.workers.dev/health`
   → should include `chatEnabled: true`
4. Test chat (no auth): `curl -X POST .../api/chat` → 401
5. Test chat (no message):
   ```
   curl -X POST .../api/chat \
     -H "X-Worker-Auth: <secret>" \
     -H "X-GitHub-Token: <token>" \
     -d '{}' → 400
   ```
6. Test chat (valid):
   ```
   curl -X POST .../api/chat \
     -H "X-Worker-Auth: <secret>" \
     -H "X-GitHub-Token: <token>" \
     -d '{"message":"What is the current homepage headline?"}'
   ```
   → `{ reply: "The current headline is...", toolResults: [...] }`
7. Test tool call:
   ```
   curl -X POST .../api/chat \
     -H "..." \
     -d '{"message":"Run an SEO analysis on the homepage"}'
   ```
   → reply references SEO scores, toolResults has analyze_seo result
8. Existing tests still pass: `cd ../.. && npm test`
9. Existing `/api/tool` still works (unchanged)

## Completion Checklist

- [x] `OPENAI_API_KEY` stored as worker secret
- [x] `CHAT_SYSTEM_PROMPT` defined (unified, conservative)
- [x] TOOLS converted to OpenAI format (11 tools, no publish)
- [x] `runChatLoop()` handles tool calls up to 6 iterations
- [x] `handleChat()` parses request, trims history, returns response
- [x] Route added for `POST /api/chat` with worker auth
- [x] `buildChatContext()` exported from policy.js
- [x] Health endpoint includes `chatEnabled`
- [x] All 19 existing tests pass
- [x] Manual curl test returns valid response
- [x] Worker deployed successfully

## QA Notes

(To be filled during QA)
