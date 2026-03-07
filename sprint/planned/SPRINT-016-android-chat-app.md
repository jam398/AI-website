# SPRINT-016 — Android Chat App (JM AI Assistant)

**Status:** Planned
**Priority:** High
**Depends on:** SPRINT-008 (MCP Bridge — function calling patterns)

---

## Goal

Build a native Android app (Kotlin + Jetpack Compose) that provides a chat-only interface for managing the JM AI Consulting website. The app connects to OpenAI GPT-4o with function calling (tools) and uses the GitHub API to read/write site content. No preview, no diff viewer — just a smart conversation.

---

## Architecture

```
Android App  ──→  OpenAI API (GPT-4o + function calling)
             ──→  GitHub API (Contents API, Actions API)
             ──→  GitHub Pages (auto-deploy via Actions)
```

- App stores API keys locally (EncryptedSharedPreferences)
- All site changes go through GitHub Contents API (same as web admin)
- Deploys trigger automatically via existing GitHub Actions workflow
- Chat history persisted in local Room database

---

## Tech Stack

| Component | Technology |
|---|---|
| Language | Kotlin |
| UI | Jetpack Compose + Material 3 |
| HTTP | Retrofit + OkHttp |
| AI | OpenAI GPT-4o with function calling |
| Local DB | Room (chat history) |
| DI | Hilt |
| Security | EncryptedSharedPreferences (API keys) |
| Min SDK | 26 (Android 8.0) |
| Target SDK | 35 |

---

## Project Structure

```
android/
├── app/src/main/java/com/jmai/assistant/
│   ├── MainActivity.kt
│   ├── ui/
│   │   ├── ChatScreen.kt           ← Single screen — chat interface
│   │   ├── SettingsScreen.kt       ← API key entry
│   │   └── theme/Theme.kt
│   ├── data/
│   │   ├── api/
│   │   │   ├── OpenAIService.kt    ← GPT-4o + function calling
│   │   │   └── GitHubService.kt    ← Contents API + Actions API
│   │   ├── local/
│   │   │   ├── ChatDatabase.kt
│   │   │   └── ChatMessageDao.kt
│   │   └── repository/
│   │       └── ChatRepository.kt
│   ├── tools/                       ← Function calling tool implementations
│   │   ├── ToolDefinitions.kt       ← OpenAI function schemas
│   │   ├── SiteEditor.kt           ← Read/write site.json
│   │   ├── DeployStatus.kt         ← Check GitHub Actions status
│   │   └── SeoChecker.kt           ← Validate meta tags from site.json
│   └── model/
│       ├── ChatMessage.kt
│       └── SiteContent.kt
├── build.gradle.kts
├── settings.gradle.kts
└── gradle/
```

---

## v1 Tools (Function Calling)

### 1. Site Editor (`edit_site_content`)
- Read current site.json from GitHub
- Update specific fields (tagline, descriptions, services, etc.)
- Commit changes via GitHub Contents API
- Auto-triggers deploy

### 2. Deploy Status (`check_deploy_status`)
- Query GitHub Actions API for latest workflow run
- Report: running / success / failed + timestamp

### 3. SEO Checker (`check_seo`)
- Fetch site.json, validate meta descriptions, titles, keywords
- Report missing or weak SEO fields

---

## Screens

### Chat Screen (main)
- Message list (RecyclerView or LazyColumn)
- Text input + send button
- Floating style — Material 3 chat bubbles
- Tool activity shown as subtle status messages ("Checking deploy status...")

### Settings Screen
- OpenAI API key input
- GitHub token input
- Repo owner/name config (default: jam398/AI-website)
- Keys stored encrypted

---

## Acceptance Criteria

- [ ] Android Studio project created in `android/` folder
- [ ] `android/` folder added to .gitignore (not deployed with website)
- [ ] Single chat screen with Material 3 design
- [ ] Settings screen for API key entry (encrypted storage)
- [ ] OpenAI GPT-4o integration with function calling
- [ ] Site Editor tool — read and update site.json via GitHub API
- [ ] Deploy Status tool — check GitHub Actions workflow status
- [ ] SEO Checker tool — validate meta tags from site.json
- [ ] Chat history persisted locally (Room database)
- [ ] Tool execution shown as status messages in chat
- [ ] Works on Android 8.0+ (SDK 26)
- [ ] App builds and runs on emulator or device

---

## Notes

- The app uses the SAME APIs as the web admin panel — no new backend needed
- API keys are entered once and stored encrypted on device
- Future sprints can add more tools (Lighthouse, social posts, transcription)
- App will be built/distributed separately (sideload APK or Play Store later)
- The `android/` folder is gitignored — website and app are independent at build time
