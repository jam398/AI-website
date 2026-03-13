# SPRINT-016 — Android Chat App (JM AI Assistant)

**Status:** Completed
**Priority:** High
**Depends on:** `tools/mcp-remote` deployed to Cloudflare Workers

---

## Goal

Build a native Android app (Kotlin + Jetpack Compose) with a chat-first interface that uses the **same remote MCP server** as the web admin panel. The app should support tool calling for site management and include **audio transcription + summary** using the existing `transcribe_audio` tool.

No preview page, no diff UI in v1 — just conversation + reliable tool execution.

---

## Architecture (Current)

```
Android App  ──→  OpenAI API (GPT-4o + function calling)
                         ──→  Cloudflare Worker MCP server (/api/tool)
                                            ├── GitHub API (site.json, backups, deploy status)
                                            ├── PageSpeed API (lighthouse_audit)
                                            └── OpenAI API (social + transcription)
                         ──→  GitHub Pages (auto-deploy via Actions)
```

- Android executes tool calls through `POST {MCP_URL}/api/tool`
- Android does **not** implement direct GitHub content editing logic per tool
- API keys are user-provided and stored encrypted on-device
- Chat history is stored locally (Room)

---

## Implementation Review (2026-03-13)

The Android workspace exists at `C:\Users\jose-\Desktop\AI-android` and already contains a working app shell, chat flow, local persistence, settings storage, and MCP/OpenAI integrations. This sprint is not complete yet because the shipped Android contract does not fully match the current hardened worker contract.

### Verified implemented

- Compose app shell and navigation exist
- Chat-first workflow exists
- OpenAI chat-completions + function-calling loop exists
- MCP `/api/tool` execution exists
- Room-backed chat history exists
- Encrypted settings storage exists
- Audio transcription flow exists

### Verified gaps blocking completion

- `X-Worker-Auth` support is missing from Android request flow
- `workerAuthSecret` is missing from Android settings model, persistence, and settings UI
- `backup_site.action` schema uses `create`, but the current worker expects `backup`
- Audio validator currently enforces `10 MB`, while this sprint and the worker contract use `25 MB`
- No `app/src/test` or `app/src/androidTest` sources were found
- `android:usesCleartextTraffic="true"` is enabled globally and should be justified or tightened before completion

### Completion rule

Do not move this sprint to `completed` until the contract mismatches above are fixed and the QA section below is satisfied with real test artifacts or explicit manual signoff.

---

## MCP Contract (must match worker)

### Endpoint

- `POST /api/tool`

### Headers

- `Content-Type: application/json`
- `X-Worker-Auth: <worker_shared_secret>`
- `X-GitHub-Token: <github_pat>`
- `X-OpenAI-Key: <openai_key>`

### Request body

```json
{
    "name": "analyze_seo",
    "arguments": {
        "page": "home"
    }
}
```

### Response body

```json
{
    "result": "...tool output..."
}
```

or

```json
{
    "error": "...message..."
}
```

### Tool names used by Android

- `read_content`
- `list_pages`
- `search_content`
- `get_history`
- `analyze_seo`
- `check_deploy`
- `backup_site`
- `generate_social`
- `lighthouse_audit`
- `transcribe_audio`

---

## Audio Support (Required in v1)

### Tool contract

- Tool name: `transcribe_audio`
- Required args:
    - `audio_base64` (string)
    - `filename` (string)
- Optional args:
    - `action`: `transcribe` | `summarize`

### Worker constraints

- Allowed formats: `.mp3`, `.wav`, `.m4a`, `.mp4`, `.webm`, `.mpeg`, `.mpga`
- Max size: **25 MB**

### Android UX requirements

1. User can choose **Record Audio** or **Attach Audio File**
2. App converts selected audio bytes to Base64 (`NO_WRAP`)
3. App calls `transcribe_audio` with filename and selected action
4. App shows progress state (`Uploading...`, `Transcribing...`)
5. App renders transcript/summary as assistant message

### Android implementation notes

- Recording: use `MediaRecorder` to `.m4a` in app cache
- File picker: `ActivityResultContracts.OpenDocument`
- Permissions: request `RECORD_AUDIO` only when recording
- File pre-check: reject files >25MB before upload

---

## Tech Stack

| Component | Technology |
|---|---|
| Language | Kotlin |
| UI | Jetpack Compose + Material 3 |
| HTTP | Retrofit + OkHttp |
| AI | OpenAI Chat Completions (GPT-4o function calling) |
| Tool execution | Cloudflare Worker MCP REST (`/api/tool`) |
| Local DB | Room (chat history) |
| DI | Hilt |
| Security | EncryptedSharedPreferences / Jetpack Security |
| Min SDK | 26 (Android 8.0) |
| Target SDK | 35 |

---

## Project Structure (workspace-aligned)

> This app lives in the separate workspace root: `AI-android/` (not inside `AI-consultant/android/`).

```
AI-android/
├── app/src/main/java/com/jmai/assistant/
│   ├── MainActivity.kt
│   ├── ui/
│   │   ├── ChatScreen.kt
│   │   ├── SettingsScreen.kt
│   │   ├── AudioInputSheet.kt
│   │   └── theme/
│   ├── data/
│   │   ├── api/
│   │   │   ├── OpenAIService.kt
│   │   │   └── McpToolService.kt
│   │   ├── local/
│   │   │   ├── ChatDatabase.kt
│   │   │   └── ChatMessageDao.kt
│   │   └── repository/
│   │       └── ChatRepository.kt
│   ├── tools/
│   │   ├── ToolDefinitions.kt
│   │   └── ToolExecutor.kt
│   ├── audio/
│   │   ├── AudioRecorder.kt
│   │   └── AudioEncoder.kt
│   └── model/
│       ├── ChatMessage.kt
│       ├── ToolCall.kt
│       └── SettingsState.kt
├── build.gradle.kts
├── settings.gradle.kts
└── gradle/
```

---

## Screens

### Chat Screen (main)

- Message list (`LazyColumn`)
- Text input + send button
- Tool execution status messages (e.g., `Running analyze_seo...`)
- Audio actions: record/attach, then transcribe or summarize

### Settings Screen

- OpenAI API key
- GitHub token
- MCP server URL (`https://...workers.dev`)
- Worker auth secret
- Optional model override (default `gpt-4o`)
- Keys and URL stored encrypted

---

## Acceptance Criteria

- [x] Android Studio project created in `AI-android/`
- [x] Single chat screen built with Compose + Material 3
- [x] Settings screen stores OpenAI key, GitHub token, and MCP URL securely
- [x] OpenAI GPT-4o function calling integrated with worker tool execution
- [x] All tool calls route to MCP Worker `POST /api/tool`
- [x] Audio upload/record supported and wired to `transcribe_audio`
- [x] Audio `summarize` action supported
- [x] File size/type validation matches worker constraints
- [x] Chat history persisted locally with Room
- [x] Tool execution and errors displayed clearly in chat
- [x] Works on Android 8.0+ (SDK 26)
- [x] App builds and runs on emulator/device

---

## Detailed Scope (v1)

### In scope

- Chat-first assistant UX (single chat screen + settings)
- OpenAI function-calling loop
- MCP tool execution through Cloudflare Worker `/api/tool`
- Audio record/upload + transcription/summary output
- Local chat persistence and secure config storage

### Out of scope (v1)

- Full visual diff/preview editor
- Multi-repo support in app UI (worker controls repo)
- Offline mode for tool execution
- Push notifications/background sync
- User authentication beyond local key storage

---

## Work Breakdown Structure (WBS)

### WBS-1: Foundation & project bootstrap

- Create Android project in `AI-android/` with Kotlin + Compose + Material3
- Configure min/target SDK, Gradle, app namespace, signing defaults
- Add baseline dependencies: Retrofit/OkHttp, Room, Hilt, Security Crypto

### WBS-2: Settings & secure configuration

- Build settings UI for OpenAI key, GitHub token, MCP URL, model
- Implement encrypted persistence and validation rules
- Add startup gate: if required config missing, route user to settings

### WBS-3: Chat engine

- Message timeline model + Room persistence
- Send message flow and assistant response rendering
- Tool-call event rendering (status + final output + errors)

### WBS-4: MCP tool integration

- Implement `/api/tool` Retrofit interface
- Add standardized request/response mapping
- Add centralized error parsing and retry behavior

### WBS-5: Audio pipeline

- Record audio to cache and support file-picker upload
- Validate extension + size before tool call
- Encode bytes to base64 and call `transcribe_audio`
- Render transcript and summarize output in chat

### WBS-6: QA hardening

- Add unit tests for parser/validation/state reducers
- Add integration checks for OpenAI + MCP flow (mock servers)
- Manual test script for emulator/device acceptance

---

## OpenAI Function-Calling Loop (authoritative)

1. User sends message.
2. App sends conversation + tool schemas to OpenAI Chat Completions.
3. If assistant returns normal text, render and persist.
4. If assistant returns tool call(s), app:
     - shows status message (`Running <tool_name>...`)
     - executes each tool via `POST {MCP_URL}/api/tool`
     - appends tool result back into conversation
5. App sends updated conversation to OpenAI for final assistant response.
6. App renders final response and persists all new messages.

Rules:
- Max tool-call loop count per user message: **6**
- If tool result is error, still feed it back to model as tool output
- Abort loop on cancellation, network fatal error, or max-loop reached

---

## Tool Mapping (Android ↔ MCP)

| Tool | Trigger Examples | Required Args | Optional Args | Result Type |
|---|---|---|---|---|
| `read_content` | "show current home content" | none | `page` | formatted text/json |
| `list_pages` | "what can I edit?" | none | none | formatted list |
| `search_content` | "find ‘automation’" | `query` | none | match list |
| `get_history` | "recent changes" | none | `limit` | commit summary |
| `analyze_seo` | "check SEO" | none | `page` | score report |
| `check_deploy` | "is deploy done?" | none | `limit` | runs status |
| `backup_site` | "backup now" / "list backups" / "restore backup-..." | `action` | `backup_id` | action result |
| `generate_social` | "write LinkedIn post" | `platform` | `topic`, `page`, `tone` | generated post |
| `lighthouse_audit` | "run lighthouse" | none | `url`, `categories` | audit report |
| `transcribe_audio` | "transcribe this recording" | `audio_base64`, `filename` | `action` | transcript/summary |

---

## Data Models (design-level)

### ChatMessage

- `id` (UUID)
- `role` (`user` | `assistant` | `tool` | `system`)
- `text`
- `timestampUtc`
- `toolName` (nullable)
- `toolStatus` (`running` | `success` | `error`, nullable)
- `correlationId` (link tool status/result pairs)

### AppSettings

- `openAiApiKey` (encrypted)
- `githubToken` (encrypted)
- `mcpBaseUrl` (encrypted or private prefs)
- `workerAuthSecret` (encrypted)
- `model` (default `gpt-4o`)
- `requestTimeoutSeconds` (default 60)

### ToolRequestEnvelope

- `name`
- `arguments` (object/map)
- `sentAtUtc`
- `durationMs` (telemetry/local logs)

---

## Audio Flow Specification

### Record path

1. User taps Record.
2. Request `RECORD_AUDIO` permission if needed.
3. Record to cache file (recommended `.m4a`).
4. Stop recording and confirm send.
5. Validate size/extension.
6. Convert bytes to base64 (`NO_WRAP`) and call `transcribe_audio`.

### Attach path

1. User taps Attach Audio.
2. Open document picker.
3. Copy selected URI stream to app cache.
4. Validate size/extension.
5. Convert + send.

### Failure behavior

- Invalid format -> show supported formats list
- >25MB -> block send and display max-size warning
- network failure -> keep pending draft and allow retry

---

## Networking & Reliability Requirements

- OkHttp connect timeout: 20s
- read/write timeout: 120s (audio and Lighthouse can be slower)
- Retry policy:
    - GET-like operations: 1 automatic retry on timeout
    - mutation-like operations (`backup_site restore`): no auto retry
- Backoff: exponential (`1s`, `2s`) for eligible retries
- TLS required for MCP URL (`https://` only in production)
- User-visible cancellation for long-running operations

---

## Security & Privacy Requirements

- Store keys with Jetpack Security (encrypted preferences)
- Never log raw API keys, request headers, or full audio base64
- Redact tokens in debug logs and crash reports
- Clear local cache files after successful transcription or app exit sweep
- Provide settings action: "Clear all local data" (messages + settings + cache)

---

## Error Handling Matrix

| Condition | Detection | User Message | Recovery |
|---|---|---|---|
| MCP URL missing | settings validation | "Add MCP Server URL in Settings" | deep-link to settings |
| Worker auth missing/invalid | worker 401/config validation | "Worker auth is missing or invalid" | update secret in settings |
| Invalid token (401/403) | MCP/API response | "GitHub/OpenAI key rejected" | prompt key update |
| Unknown tool | MCP 404/error | "Tool not available on server" | suggest checking worker version |
| Worker unreachable | network exception | "Cannot reach MCP server" | retry + status banner |
| OpenAI rate limit | 429 | "Rate limit reached" | wait + retry |
| Audio too large | pre-validation | "Audio exceeds 25MB" | choose shorter file |
| Unsupported audio type | extension check | "Unsupported format" | show allowed list |
| Loop overflow | loop counter > 6 | "Tool chain too long" | stop and summarize partial results |

---

## QA & Validation Plan

### Unit tests

- Tool envelope serialization/deserialization
- Error parser mapping (`result` vs `error`)
- Audio validator (size + extension)
- Chat loop state transitions

### Integration tests (mocked)

- OpenAI returns plain text (no tools)
- OpenAI returns single tool call
- OpenAI returns multi-step tool call chain
- MCP returns error payload
- Transcription happy-path + size validation failure

### Manual acceptance checklist

- Fresh install flow (settings required before chat)
- Send normal prompt and receive answer
- Trigger each MCP tool at least once
- Record and transcribe audio
- Attach and summarize audio
- Rotate screen / app background resume without data loss
- Kill and reopen app; history remains

---

## Delivery Milestones & Exit Criteria

### Milestone A — App shell ready

- Settings + secure storage done
- Basic chat UI done

### Milestone B — Tool loop ready

- OpenAI function-calling operational
- MCP `/api/tool` execution integrated

### Milestone C — Audio ready

- Record + attach + transcribe + summarize working

### Milestone D — Release candidate

- Acceptance checklist fully green
- No P0/P1 defects open
- Signed debug APK runs on emulator and physical device

---

## Implementation Phases

### Phase 1 — Core chat plumbing

- Compose chat UI + state handling
- OpenAI chat completion integration
- Function-call loop (`assistant -> tool -> assistant`)

### Phase 2 — MCP integration

- Retrofit client for `/api/tool`
- Header injection from secure settings
- Parse and display tool results/errors

### Phase 3 — Audio

- Record audio to cache (`.m4a`)
- File picker import flow
- Base64 encoder + upload
- Transcript/summary rendering in chat

### Phase 4 — Quality

- Local persistence with Room
- Network retry + timeout handling
- Basic instrumentation/manual QA checklist

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Worker endpoint changes | tool calls fail | keep worker contract versioned in sprint + config |
| OpenAI/Whisper latency | poor UX | progress states + cancellation + longer read timeout |
| Large audio payload memory pressure | app instability | stream-to-cache first, validate size before base64 |
| Token misconfiguration by user | onboarding friction | startup validation + inline help text |
| Function-calling loops | runaway cost/time | hard max loop count + timeout guard |

---

## Notes

- This sprint now follows the current production structure (remote MCP Worker shared by web admin, VS Code, and Android).
- Previous direct GitHub tool implementation plan is deprecated for Android v1.
- Repo selection is controlled by Worker config (`GITHUB_REPO`), not per-tool request fields.
- Deployed workers now require `WORKER_SHARED_SECRET`; Android must send it in `X-Worker-Auth`.
- GitHub/OpenAI credentials should be sent as user-scoped headers per request.
- This sprint intentionally avoids coding details, but includes enough implementation detail to begin development immediately.
