# SPRINT-026 - Android Publish Verification and Rollback

**Status:** Completed  
**Priority:** Medium  
**Created:** 2026-03-13  
**Depends on:** SPRINT-024, SPRINT-025

---

## Problem

Publishing content from Android is not complete until the app can verify what happened after publish and offer a safe recovery path when something goes wrong.

---

## Goal

Add verification and rollback support so Android content publishing is observable, trustworthy, and recoverable.

---

## Scope

### In scope

- post-publish deploy verification hooks
- commit/deploy status linking from Android
- backup-before-publish policy
- rollback guidance or one-tap rollback path via existing backup tooling
- end-to-end test coverage

### Out of scope

- full git history browser
- arbitrary branch management

---

## Proposed Flow

### Before publish

- automatic backup before publish using `backup_site` with `backup`
- store returned backup id with proposal metadata
- if backup creation fails, block publish in v1 instead of proceeding blindly

### After publish

- show commit SHA and commit URL
- offer:
  - `Check deploy status`
  - `Restore previous backup`
- if the GitHub token lacks `Actions: Read`, show that limitation explicitly and keep the commit URL available

### On failure

- if publish commit succeeded but deploy later fails:
  - show deploy failure clearly
  - preserve backup id
  - allow restore
- if deploy status cannot be checked, do not collapse that into a generic connectivity error

---

## TDD Plan

### Unit tests

- proposal metadata stores backup id correctly
- rollback action calls correct backup restore path
- deploy verification summary maps worker output into UI-friendly status
- backup failure blocks publish

### Integration tests

- publish flow triggers backup before commit
- publish success enables deploy verification shortcut
- restore flow reuses stored backup id
- deploy-status permission failure remains actionable
- restore action updates proposal state after rollback completes

### Manual verification

- publish a content change from Android
- verify backup exists
- verify deploy status from Android
- restore the prior backup and confirm content reverts

---

## Files Expected to Change

- `C:\Users\jose-\Desktop\AI-android\app\src\main\java\com\jmai\assistant\data\repository\ChatRepository.kt`
- `C:\Users\jose-\Desktop\AI-android\app\src\main\java\com\jmai\assistant\tools\ToolDefinitions.kt`
- `C:\Users\jose-\Desktop\AI-android\app\src\main\java\com\jmai\assistant\ui\components\MessageBubble.kt`
- `C:\Users\jose-\Desktop\AI-android\app\src\main\java\com\jmai\assistant\ui\ChatScreen.kt`
- `C:\Users\jose-\Desktop\AI-android\app\src\main\java\com\jmai\assistant\model\PendingProposal.kt`
- `tools/mcp-remote/src/index.js`
- Android tests under `app/src/test`

---

## Acceptance Criteria

- [x] Android publish flow creates or references a recoverable backup
- [x] Android can verify post-publish deploy state
- [x] Android surfaces rollback guidance or action clearly
- [x] Backup failure blocks publish instead of silently proceeding
- [x] Publish/deploy/rollback flow is covered by parser tests plus build-and-run verification

---

## Risks

- Additional backup and verify steps may slow down mobile publishing
- Rollback UX can become dangerous if commit identity and backup identity diverge

---

## Exit Criteria

This sprint is complete. Android now backs up before publish, preserves backup ids, supports deploy-status checks, and can restore the previous backup from the proposal card.
