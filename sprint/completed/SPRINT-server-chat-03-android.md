# Sprint: Android — Switch to `/api/chat`

## Goal

Replace all direct OpenAI API calls in the Android app with the worker's
`POST /api/chat` endpoint. Remove the client-side OpenAI key, tool
definitions, tool-calling loop, and system prompt. The app becomes a thin
chat UI that delegates all AI orchestration to the Cloudflare Worker.

## Governing Spec

`sprint/planned/SPEC-server-side-chat.md`

## Status

Complete

## Scope

- Create `ChatApiService` Retrofit interface for `/api/chat`
- Add chat API response models (`ChatApiRequest`, `ChatApiResponse`,
  `ToolResult`)
- Rewrite `ChatRepository.sendMessage()` to call `/api/chat` instead of
  OpenAI directly — remove the tool-calling loop
- Handle `toolResults` from response: detect `propose_content_update`
  proposals, store as `PendingProposal`
- Remove `OpenAIService` from DI (no longer used by chat)
- Remove `ToolDefinitions.kt` (tool definitions now on worker)
- Remove `SYSTEM_PROMPT` from `ChatRepository`
- Remove `openAiApiKey` from `AppSettings`, `SettingsStore`,
  `SettingsScreen`
- Remove OpenAI-related API models no longer needed
- Keep `ToolExecutor` — still needed for direct tool calls (publish,
  restore, check deploy, transcribe audio)
- Keep `McpToolService` — still used by `ToolExecutor`

## Non-Goals

- Changing the Cloudflare Worker (Sprint 1 — done)
- Changing the web admin (Sprint 2 — done)
- Adding streaming / SSE
- Removing `ToolExecutor` or `McpToolService` (Android still uses direct
  tool calls for publish, restore, deploy check, transcription)
- Changing the proposal publish/cancel/restore flow

## Available Assets / Current State

| Asset | Path | Role | Notes |
|-------|------|------|-------|
| ChatRepository | `app/src/main/java/.../data/repository/ChatRepository.kt` | Chat + AI orchestration | ~310 lines, has OpenAI tool loop + SYSTEM_PROMPT |
| OpenAIService | `app/src/main/java/.../data/api/OpenAIService.kt` | Retrofit OpenAI interface | Will be removed from chat path |
| ToolDefinitions | `app/src/main/java/.../tools/ToolDefinitions.kt` | 12 tool schemas for GPT | Will be deleted |
| AppSettings | `app/src/main/java/.../model/AppSettings.kt` | Settings data class | Has openAiApiKey |
| SettingsStore | `app/src/main/java/.../data/local/SettingsStore.kt` | Encrypted prefs | Reads/writes openAiApiKey |
| SettingsScreen | `app/src/main/java/.../ui/SettingsScreen.kt` | Settings UI | Has OpenAI key field |
| AppModule | `app/src/main/java/.../di/AppModule.kt` | Hilt DI | Provides OpenAIService |
| ApiModels | `app/src/main/java/.../data/api/ApiModels.kt` | OpenAI request/response | ChatCompletionRequest etc. |
| McpToolService | `app/src/main/java/.../data/api/McpToolService.kt` | MCP /api/tool calls | Stays (used by ToolExecutor) |
| ToolExecutor | `app/src/main/java/.../tools/ToolExecutor.kt` | Direct tool calls | Stays (publish, restore, etc.) |
| ChatViewModel | `app/src/main/java/.../ChatViewModel.kt` | UI ViewModel | Uses ChatRepository |
| ContentProposalParser | `app/src/main/java/.../tools/ContentProposalParser.kt` | Parse propose results | Stays |

## Files Expected To Change

- `app/src/main/java/.../data/api/ChatApiService.kt` — NEW
- `app/src/main/java/.../data/api/ApiModels.kt` — add chat models
- `app/src/main/java/.../data/repository/ChatRepository.kt` — rewrite sendMessage
- `app/src/main/java/.../model/AppSettings.kt` — remove openAiApiKey
- `app/src/main/java/.../data/local/SettingsStore.kt` — remove openAiApiKey
- `app/src/main/java/.../ui/SettingsScreen.kt` — remove OpenAI key field
- `app/src/main/java/.../di/AppModule.kt` — add ChatApiService, remove OpenAIService
- `app/src/main/java/.../data/api/McpToolService.kt` — remove X-OpenAI-Key header
- `app/src/main/java/.../tools/ToolDefinitions.kt` — DELETE file

## Tasks

### Task 1. Create ChatApiService and models

- **Objective:** New Retrofit interface + request/response models for `/api/chat`
- **Files:** `ChatApiService.kt` (new), `ApiModels.kt` (add models)
- **Changes:**
  - `ChatApiService`: POST endpoint with dynamic URL, headers for
    `X-Worker-Auth` and `X-GitHub-Token`
  - `ChatApiRequest(message, history, page)` — history is list of
    `ChatHistoryMessage(role, content)`
  - `ChatApiResponse(reply, toolResults)` — toolResults is list of
    `ToolResult(tool, result)`
- **Unchanged:** Existing OpenAI models stay for now (removed in cleanup)
- **Verify:** Compiles

### Task 2. Rewrite ChatRepository.sendMessage()

- **Objective:** Replace OpenAI direct call + tool loop with single
  `/api/chat` call. Parse response for proposals.
- **Files:** `ChatRepository.kt`
- **Changes:**
  - Inject `ChatApiService` instead of `OpenAIService`
  - Remove `SYSTEM_PROMPT` companion constant
  - Remove all OpenAI tool loop code
  - New `sendMessage()`: build history, call chat API, parse
    `toolResults` for proposals, return reply text
  - Keep `onToolStart`/`onToolComplete` callbacks but simplify — show a
    single "Thinking..." tool status for the API call
  - Keep `publishProposal`, `cancelProposal`, `restoreProposalBackup`,
    `checkDeployForProposal` unchanged (they use `ToolExecutor`)
- **Unchanged:** `executeDirectTool()`, all proposal methods
- **Verify:** Compiles

### Task 3. Remove OpenAI key from settings

- **Objective:** Remove `openAiApiKey` from AppSettings, SettingsStore,
  SettingsScreen
- **Files:** `AppSettings.kt`, `SettingsStore.kt`, `SettingsScreen.kt`
- **Changes:**
  - `AppSettings`: remove `openAiApiKey` field, update `isConfigured`
  - `SettingsStore.load()`: no longer reads `KEY_OPENAI`
  - `SettingsStore.save()`: no longer writes `KEY_OPENAI`
  - `SettingsScreen`: remove OpenAI API Key text field
- **Unchanged:** All other settings fields
- **Verify:** Compiles, settings screen loads

### Task 4. Update DI and remove dead code

- **Objective:** Wire ChatApiService in Hilt, remove unused code
- **Files:** `AppModule.kt`, `ToolDefinitions.kt`, `McpToolService.kt`
- **Changes:**
  - `AppModule`: add `provideChatApiService()`, remove `provideOpenAIService()`
  - Delete `ToolDefinitions.kt`
  - `McpToolService`: remove `X-OpenAI-Key` header parameter
- **Unchanged:** `provideMcpToolService()`, database providers
- **Verify:** Compiles, Hilt graph resolves

### Task 5. Clean up unused OpenAI models

- **Objective:** Remove OpenAI-specific models no longer used
- **Files:** `ApiModels.kt`, `OpenAIService.kt`
- **Changes:**
  - Remove `ChatCompletionRequest`, `ChatCompletionResponse`, `Choice`,
    `ToolCallResponse`, `ToolCallFunction` if not referenced elsewhere
  - Keep `Message` if still used by anything (check)
  - Keep `McpToolRequest`, `McpToolResponse`, `ToolSpec`, `FunctionSpec`,
    `ParametersSpec`, `PropertySpec` if referenced
  - Delete `OpenAIService.kt` if no longer injected anywhere
- **Unchanged:** MCP models
- **Verify:** Full project compiles

### Task 6. Build and verify

- **Objective:** Android project compiles and all tests pass
- **Files:** All changed files
- **Verify:** `./gradlew assembleDebug`, `./gradlew test`

## Product Rules

- OpenAI API key must NOT appear anywhere in Android code
- The app must not call `api.openai.com` from the device
- Proposal cards (publish/cancel/restore) must still work via ToolExecutor
- Audio transcription via direct tool call must still work
- Settings screen shows: GitHub Token, Repo, MCP Server URL, Worker Auth
  Secret, Model, Auto-send toggle
- `isConfigured` requires GitHub token + MCP URL (+ worker auth if remote)
- Health check still works

## Risks / Watchouts

- `ToolExecutor` still passes `openAiApiKey` via `X-OpenAI-Key` to
  `McpToolService.executeTool()` — this header is now unused by the worker
  for most tools but removing it is safe since the worker ignores it
- `model` field in AppSettings is now unused by Android since the worker
  decides the model — keep it for future use but make it optional
- Removing `OpenAIService` from DI means any missed reference will cause
  a compile error (desired — catches stale code)

## Verification

- [ ] `./gradlew assembleDebug` succeeds
- [ ] `./gradlew test` passes
- [ ] No references to `openAiApiKey` in source (except migration compat)
- [ ] No imports of `OpenAIService` remain
- [ ] No imports of `ToolDefinitions` remain
- [ ] `ToolExecutor` still compiles and works
- [ ] `McpToolService` still compiles

## Completion Checklist

- [ ] ChatApiService.kt created
- [ ] Chat API models added to ApiModels.kt
- [ ] ChatRepository.sendMessage() rewritten
- [ ] SYSTEM_PROMPT removed from ChatRepository
- [ ] openAiApiKey removed from AppSettings
- [ ] openAiApiKey removed from SettingsStore
- [ ] OpenAI key field removed from SettingsScreen
- [ ] ChatApiService provided in AppModule
- [ ] OpenAIService removed from AppModule
- [ ] ToolDefinitions.kt deleted
- [ ] X-OpenAI-Key removed from McpToolService
- [ ] Unused OpenAI models removed from ApiModels.kt
- [ ] OpenAIService.kt deleted
- [ ] ./gradlew assembleDebug passes
- [ ] Sprint file moved to sprint/completed/
