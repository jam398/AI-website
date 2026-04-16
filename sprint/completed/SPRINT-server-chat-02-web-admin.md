# Sprint: Web Admin — Switch to `/api/chat`

## Goal

Replace all direct OpenAI API calls in the web admin panel with the
worker's `/api/chat` endpoint. Remove the client-side OpenAI key, tool
definitions, tool-calling loop, and system prompt. The admin panel becomes
a thin chat UI that delegates all AI orchestration to the worker.

## Governing Spec

`sprint/planned/SPEC-server-side-chat.md`

## Status

Complete

## Scope

- Remove `SYSTEM_PROMPT`, `TOOL_ERROR_PROMPT` constants
- Remove `TOOL_DEFINITIONS` array and `buildToolsForOpenAI()`
- Remove `executeToolCall()`, `pickAudioFile()`, `fileToBase64()`
- Remove `extractJSON()` function
- Remove OpenAI API key from state, localStorage, settings, setup form
- Remove `validateOpenAIKey()` no-op stub
- Remove `getEnabledToolDefinitions` import
- Replace old `callAI()` (direct OpenAI + tool loop) with new version
  that calls `POST /api/chat` on the worker
- Update `sendChat` caller to handle `{ reply, proposal }` response
- Build and verify

## Non-Goals

- Changing the Cloudflare Worker (Sprint 1 — done)
- Changing the Android app (Sprint 3)
- Adding streaming / SSE
- Changing `/api/tool` or `/mcp` endpoints

## Files Expected To Change

- `admin/index.html`

## Tasks

### Task 1. Remove client-side OpenAI constants

- **Objective:** Delete `SYSTEM_PROMPT`, `TOOL_ERROR_PROMPT`
- **Files:** `admin/index.html`
- **Verify:** No references to either constant remain

### Task 2. Remove OpenAI key from state and UI

- **Objective:** Remove `openaiKey` from state object, `loadConfig()`,
  `saveSetup()`, `updateSettings()`, `logOut()`, `openSettings()`,
  setup form HTML, settings modal HTML
- **Files:** `admin/index.html`
- **Verify:** No references to `openaiKey`, `openai_key`, `setup-openai`,
  or `set-openai` remain

### Task 3. Replace callAI and tool infrastructure

- **Objective:** Delete `TOOL_DEFINITIONS`, `buildToolsForOpenAI`,
  `pickAudioFile`, `fileToBase64`, `executeToolCall`, old `callAI`.
  Insert new `callAI` that calls `/api/chat`.
- **Files:** `admin/index.html`
- **Verify:** `callAI` returns `{ reply, proposal }`

### Task 4. Update sendChat caller

- **Objective:** Replace `extractJSON(response)` flow with `{ reply,
  proposal }` destructure. Show proposal card if `proposal.site_data`
  exists, otherwise show `reply` as chat message.
- **Files:** `admin/index.html`
- **Verify:** Proposal cards render, chat messages render

### Task 5. Clean up dead code

- **Objective:** Remove `extractJSON()`, `validateOpenAIKey()`,
  unused `getEnabledToolDefinitions` import. Fix boot check to not
  require `openaiKey`.
- **Files:** `admin/index.html`
- **Verify:** `npm run build` succeeds, no dead references

## Product Rules

- OpenAI key must NOT appear anywhere in admin/index.html
- Setup form only requires GitHub token and repo
- Settings form has MCP URL, GitHub token, worker auth, repo
- Proposal diff cards still render with Apply/Reject buttons
- Conversation messages still render with markdown formatting
- All 19 existing tests continue to pass

## Verification

- [x] `npm test` — 19 tests pass
- [x] `npm run build` — Eleventy build succeeds
- [x] No references to `openaiKey`, `SYSTEM_PROMPT`, `TOOL_ERROR_PROMPT`,
  `TOOL_DEFINITIONS`, `executeToolCall`, `extractJSON` remain in
  `admin/index.html`

## Completion Checklist

- [x] SYSTEM_PROMPT and TOOL_ERROR_PROMPT deleted
- [x] TOOL_DEFINITIONS, buildToolsForOpenAI, executeToolCall deleted
- [x] pickAudioFile, fileToBase64 deleted
- [x] Old callAI (direct OpenAI) replaced with /api/chat version
- [x] extractJSON removed
- [x] validateOpenAIKey removed
- [x] getEnabledToolDefinitions import removed
- [x] OpenAI key removed from state, forms, localStorage, login/logout
- [x] sendChat caller updated for { reply, proposal }
- [x] Boot check no longer requires openaiKey
- [x] npm test passes
- [x] npm run build succeeds
- [x] Sprint file moved to sprint/completed/
