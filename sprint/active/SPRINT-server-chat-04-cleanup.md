# Sprint: Cleanup & Cross-Platform Verification

## Goal

Final QA pass for the server-side chat migration. Verify no OpenAI secrets
remain on clients, all test suites pass, both clients work with the worker,
remove any dead code missed in Sprints 1-3, build and deploy web admin.

## Governing Spec

`sprint/planned/SPEC-server-side-chat.md`

## Status

Active

## Scope

- Run all test suites (web + Android)
- Grep both projects for leftover OpenAI key references
- Verify MANUAL.md is up to date (no stale OpenAI key instructions)
- Build web admin (`npm run build`)
- Deploy updated admin to GitHub Pages (commit + push)
- Mark SPEC as Complete

## Non-Goals

- New features
- Streaming / SSE
- Changing the worker endpoint

## Tasks

### Task 1. Run web test suite

- `npm test` — all 19 tests pass
- `npm run build` — Eleventy build succeeds

### Task 2. Run Android test suite

- `./gradlew test` — all tests pass

### Task 3. Audit for leftover OpenAI references

- Grep AI-consultant for `openaiKey`, `openAiKey`, `OPENAI_API_KEY`,
  `X-OpenAI-Key`, `sk-` in client code (admin HTML, settings)
- Grep AI-android for `openAiApiKey`, `OpenAIService`, `ToolDefinitions`,
  `SYSTEM_PROMPT`
- Allowed: worker code (index.js), README docs, mcp.json config
- Not allowed: admin/index.html storing/sending OpenAI key, Android
  settings reading/writing OpenAI key

### Task 4. Verify MANUAL.md

- Check for stale references to OpenAI key in admin setup instructions
- Update if needed

### Task 5. Deploy web admin

- `npm run build`
- Commit and push to trigger GitHub Pages deploy

### Task 6. Close sprint and SPEC

- Mark this sprint Complete, move to sprint/completed/
- Mark SPEC status as Complete

## Verification

- `npm test` passes
- `./gradlew test` passes
- `./gradlew assembleDebug` passes
- Zero client-side OpenAI key references (outside docs/worker)
- Web admin builds cleanly

## Completion Checklist

- [ ] Web tests pass
- [ ] Android tests pass
- [ ] Android build passes
- [ ] No OpenAI key in client code
- [ ] MANUAL.md updated
- [ ] Web admin built and deployed
- [ ] SPEC marked Complete
