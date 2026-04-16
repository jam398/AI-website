# SPRINT-016 - Android Chat App (JM AI Assistant)

**Status:** Completed  
**Priority:** High  
**Depends on:** `tools/mcp-remote` deployed to Cloudflare Workers

---

## Goal

Build a native Android app (Kotlin + Jetpack Compose) with a chat-first interface that uses the same remote MCP server as the web admin panel. The app should support tool calling for site management and include audio transcription and summary using the existing `transcribe_audio` tool.

No preview page, no diff UI, and no direct content publishing in v1. This sprint only covers conversation, tool execution, secure settings, local persistence, and audio.

---

## Architecture (Current)

```text
Android App  -->  OpenAI API (GPT-4o + function calling)
                     -->  Cloudflare Worker MCP server (/api/tool)
                                |- GitHub API (site.json, backups, deploy status)
                                |- PageSpeed API (lighthouse_audit)
                                \- OpenAI API (social + transcription)
                     -->  GitHub Pages (auto-deploy via Actions)
```

- Android executes tool calls through `POST {MCP_URL}/api/tool`
- Android does not implement direct GitHub content editing logic per tool
- API keys are user-provided and stored encrypted on-device
- Chat history is stored locally with Room

---

## Implementation Review (2026-03-13)

The Android workspace at `C:\Users\jose-\Desktop\AI-android` now matches the hardened worker contract for the v1 feature set.

### Verified implemented

- Compose app shell and chat workflow exist
- OpenAI chat completions and function-calling loop exist
- MCP `/api/tool` execution exists
- `X-Worker-Auth` support is implemented end to end
- `workerAuthSecret` is stored and editable in settings
- Room-backed chat history exists
- Encrypted settings storage exists
- Audio transcription flow exists
- Audio validation matches the worker contract (`25 MB`)
- `backup_site.action` matches the worker contract (`backup`, `list`, `restore`)
- Local JVM tests exist under `app/src/test`
- Cleartext traffic is tightened through a network security config instead of being globally open

### Deferred to later sprints

- Android does not publish `content/site.json` yet
- Android does not render structured proposal/review/publish cards yet
- Android rollback and deploy verification for content publishing are deferred

Those capabilities move into `SPRINT-024`, `SPRINT-025`, and `SPRINT-026`.

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
- Max size: `25 MB`

### Android UX requirements

1. User can choose `Record Audio` or `Attach Audio File`.
2. App converts selected audio bytes to Base64 (`NO_WRAP`).
3. App calls `transcribe_audio` with filename and selected action.
4. App shows progress state (`Uploading...`, `Transcribing...`).
5. App renders transcript or summary as an assistant message.

---

## Acceptance Criteria

- [x] Android Studio project created in `AI-android/`
- [x] Single chat screen built with Compose + Material 3
- [x] Settings screen stores OpenAI key, GitHub token, MCP URL, and worker auth secret securely
- [x] OpenAI GPT-4o function calling integrated with worker tool execution
- [x] All tool calls route to MCP Worker `POST /api/tool`
- [x] Audio upload and recording are wired to `transcribe_audio`
- [x] Audio `summarize` action is supported
- [x] File size and type validation match worker constraints
- [x] Chat history is persisted locally with Room
- [x] Tool execution and errors display clearly in chat
- [x] App builds and runs on emulator/device

---

## QA Evidence

### Local verification completed

- `testDebugUnitTest`
- `assembleDebug`
- debug APK installed on emulator
- app launched successfully

### Current limits

- Android content publishing is intentionally out of scope here
- Proposal/review/publish UX is intentionally deferred

---

## Exit Criteria

This sprint is complete because the Android app now satisfies the v1 read, analyze, backup, deploy-status, social, Lighthouse, and transcription contract. Content publishing is deliberately split into `SPRINT-024` through `SPRINT-026`.
