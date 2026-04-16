# SPRINT-024 - Android Content Editing Contract

**Status:** Completed  
**Priority:** High  
**Created:** 2026-03-13  
**Depends on:** SPRINT-016, SPRINT-017, SPRINT-018

---

## Problem

The Android app can read and analyze site content, but it cannot publish edits. The model can still suggest headline rewrites in plain text and imply that changes are live, which is false. That is a contract gap between user expectations and actual system behavior.

---

## Goal

Add an explicit Android-safe content editing contract so the app can propose, validate, and publish `content/site.json` changes through the same hardened worker model instead of pretending a natural-language rewrite changed the site.

---

## Scope

### In scope

- Define worker-side editing tools for Android
- Define request and response payloads for Android edit flows
- Reuse existing protected-field and content-integrity policy
- Expose the new tool schemas to Android so the model can call them explicitly
- Ensure GitHub-backed publish writes commit to `main`
- Return commit/deploy-ready results to the Android client

### Out of scope

- Full visual diff renderer in the worker
- Multi-file editing beyond `content/site.json`
- CMS-style concurrent merge resolution

---

## Required Design Decisions

1. Android must not publish arbitrary free-form text. The worker must only publish a normalized `site.json` candidate that passed the proposal step.
2. Worker must enforce the same protected-field policy already used by the admin panel, from one shared validation source instead of duplicated rules.
3. Publish must be explicit. "Suggest" and "apply" are separate actions.
4. Publish must require a `proposal_hash` so the server can reject stale or tampered candidates before commit.
5. Worker responses must distinguish:
   - proposal success
   - validation failure
   - publish success
   - publish failure

---

## Proposed Worker Contract

### New tool: `propose_content_update`

- Purpose: take an instruction, read the current `content/site.json`, generate a candidate, validate it, and return a reviewable proposal payload
- Inputs:
  - `instruction`
  - `page` (optional)
- Outputs:
  - `proposal_hash`
  - `candidate_site_data`
  - `diff_summary`
  - `changed_paths`
  - `validation_errors`
  - `blocked_paths`

### Tool requirements

- Requires `X-GitHub-Token`
- Requires `X-OpenAI-Key`
- Must fail with explicit auth errors if either credential is missing

### New tool: `publish_content_update`

- Purpose: publish a previously validated candidate to GitHub
- Inputs:
  - `site_data`
  - `proposal_hash`
  - `commit_message`
- Outputs:
  - `commit_sha`
  - `commit_url`
  - `live_url`
  - `changed_paths`

### Publish guarantees

- Worker must recompute the canonical hash for `site_data`
- `proposal_hash` mismatch must reject the publish
- Worker must re-run full validation before GitHub write
- Publish must never accept a plain-text instruction directly

### Validation policy

- Reuse admin protected fields:
  - `meta.siteTitle`
  - `meta.consultant`
  - `meta.email`
  - `contact.email`
  - `nav`
- Reuse canonical email and `mailto:` integrity rules
- Reject invalid or partial `site.json`
- Keep the canonical validation logic in one shared pure-JS policy module used by both admin and worker

---

## TDD Plan

### Worker unit tests

- valid edit instruction returns `proposal_hash` + candidate + diff summary
- protected field edit is rejected
- partial or malformed candidate is rejected
- propose tool rejects missing GitHub or OpenAI credential
- publish tool rejects missing GitHub token
- publish tool rejects `proposal_hash` mismatch
- publish tool writes only validated site data

### Worker integration tests

- propose flow returns a non-empty diff for a valid headline change
- publish flow returns commit metadata on success
- rejected proposal never reaches GitHub write path

### Manual verification

- propose a home headline rewrite from Android
- verify Android receives a structured proposal
- publish and confirm a real GitHub commit is created

---

## Files Expected to Change

- `tools/mcp-remote/src/index.js`
- `tools/mcp-remote/src/policy.js`
- `admin/admin-logic.js`
- `C:\Users\jose-\Desktop\AI-android\app\src\main\java\com\jmai\assistant\tools\ToolDefinitions.kt`
- `C:\Users\jose-\Desktop\AI-android\app\src\test\java\com\jmai\assistant\tools\ToolDefinitionsTest.kt`
- `tools/mcp-remote/README.md`
- `README.md`
- `MANUAL.md`

---

## Acceptance Criteria

- [x] Worker exposes explicit Android editing tools
- [x] Android exposes explicit tool schemas for propose/publish
- [x] Protected-field policy is enforced server-side for Android publishes
- [x] Publish action creates a real GitHub commit to `content/site.json`
- [x] Worker responses clearly distinguish propose vs publish outcomes
- [x] Tests cover valid and blocked edit paths plus publish hash mismatch handling

---

## Risks

- Publishing raw `site.json` candidates increases blast radius if validation is incomplete
- Android edit UX will stay confusing if proposal/publish are not separated clearly

---

## Exit Criteria

This sprint is complete. The worker now exposes `propose_content_update` and `publish_content_update`, both reuse the shared site policy, Android knows the tool schemas, and the consultant test suite covers the new contract.
