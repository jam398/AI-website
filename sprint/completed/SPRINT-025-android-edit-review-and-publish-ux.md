# SPRINT-025 - Android Edit Review and Publish UX

**Status:** Completed  
**Priority:** High  
**Created:** 2026-03-13  
**Depends on:** SPRINT-024

---

## Problem

Even with a publish-capable worker contract, Android still needs a user-facing flow that separates suggestion, review, confirmation, and publish. Without that, the app will either remain misleading or become too risky.

---

## Goal

Design and implement an Android editing workflow that shows a proposed change, asks for confirmation, and only then publishes it.

---

## Scope

### In scope

- Proposal cards in chat
- Diff summary rendering for content edits
- Explicit confirm/cancel publish actions
- Publish success and failure messaging
- Durable local state for pending proposals

### Out of scope

- Full JSON diff viewer with per-line syntax coloring
- WYSIWYG preview
- Offline draft sync

---

## Proposed UX

### Phase 1: user requests a change

Example:
- "Change the home headline to be more direct"

### Phase 2: app requests proposal

- call `propose_content_update`
- render:
  - original summary
  - proposed summary
  - changed paths
  - explicit warning that nothing is live yet

### Phase 3: user confirms

- buttons:
  - `Publish`
  - `Cancel`
  - `Revise`

### Phase 4: app publishes

- call `publish_content_update`
- render:
  - commit confirmation
  - deploy guidance
  - optional "Check deploy status" shortcut

---

## State Model

### Pending proposal entity

- `proposalId`
- `proposalHash`
- `instruction`
- `page`
- `diffSummary`
- `changedPaths`
- `candidateSiteData`
- `createdAtUtc`
- `status` (`pending`, `publishing`, `published`, `rejected`, `error`)

### UI behavior rules

- only one publish action may be in-flight per proposal
- proposal must survive process death and app restart until published, canceled, or chat history is cleared
- tool errors must display verbatim, not be paraphrased into fake success
- proposal cards must be rendered from structured tool output, not from assistant prose alone

### Persistence decision

- Add a dedicated Room-backed pending-proposal model instead of overloading `ChatMessage`
- Bump the Room schema version and add migration coverage
- Clear pending proposals when the user clears chat history or app data

---

## TDD Plan

### Unit tests

- proposal state reducer creates pending proposal correctly
- publish confirmation transitions proposal to publishing then published
- cancel removes or marks proposal as rejected
- worker error renders exact error string
- Room mapping persists and reloads a pending proposal after process restart

### UI/integration tests

- valid headline change shows proposal card with publish button
- tapping publish calls worker publish tool
- publish success shows commit confirmation
- protected-field rejection shows blocked edit message
- stale proposal hash is rejected and surfaced to the user without fake success

### Manual verification

- request content change from Android
- confirm proposal is shown instead of fake "now live" text
- publish and verify commit exists
- cancel and confirm nothing changed upstream

---

## Files Expected to Change

- `C:\Users\jose-\Desktop\AI-android\app\src\main\java\com\jmai\assistant\model\PendingProposal.kt`
- `C:\Users\jose-\Desktop\AI-android\app\src\main\java\com\jmai\assistant\data\local\PendingProposalDao.kt`
- `C:\Users\jose-\Desktop\AI-android\app\src\main\java\com\jmai\assistant\data\local\ChatDatabase.kt`
- `C:\Users\jose-\Desktop\AI-android\app\src\main\java\com\jmai\assistant\data\repository\ChatRepository.kt`
- `C:\Users\jose-\Desktop\AI-android\app\src\main\java\com\jmai\assistant\ChatViewModel.kt`
- `C:\Users\jose-\Desktop\AI-android\app\src\main\java\com\jmai\assistant\model\ChatMessage.kt`
- `C:\Users\jose-\Desktop\AI-android\app\src\main\java\com\jmai\assistant\ui\ChatScreen.kt`
- `C:\Users\jose-\Desktop\AI-android\app\src\main\java\com\jmai\assistant\ui\components\MessageBubble.kt`
- Android tests under `app/src/test`

---

## Acceptance Criteria

- [x] Android no longer claims a content suggestion is already live
- [x] Content-edit requests produce a publishable proposal card
- [x] User can explicitly publish or cancel a proposal
- [x] Publish success surfaces commit/deploy information
- [x] Pending proposals survive restart and clear correctly
- [x] Parser tests and build verification cover the proposal/publish flow entry points

---

## Risks

- Too much proposal detail may make the mobile UX hard to read
- Too little detail may make publishes unsafe

---

## Exit Criteria

This sprint is complete. Android now stores proposals in Room, renders explicit proposal cards, and only publishes through an app-driven confirmation flow.
