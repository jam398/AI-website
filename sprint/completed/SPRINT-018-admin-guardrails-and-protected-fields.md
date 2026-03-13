# SPRINT-018 - Admin Guardrails and Protected Fields

**Status:** Completed  
**Priority:** High  
**Created:** 2026-03-13  
**Depends on:** SPRINT-017

---

## Problem

The admin panel claims some fields are protected, but the current implementation does not actually enforce those guarantees before publishing. The AI can still modify site identity, email addresses, and navigation if the model returns those changes.

That is a product trust issue and a data integrity issue.

---

## Goal

Make the admin panel enforce a real content policy before any GitHub write occurs, and make the UI/documentation match actual behavior.

---

## Scope

### In scope

- Add explicit protected-field enforcement in the admin panel
- Add schema and shape validation for AI-produced JSON
- Add targeted diff validation before publish
- Add clear UI feedback when blocked fields are changed
- Align chat examples and docs with actual allowed behavior

### Out of scope

- Replacing the current JSON editing UX
- Moving policy enforcement into a separate backend service

---

## Protected Data Policy

### Must remain protected

- `meta.siteTitle`
- `meta.consultant`
- `meta.email`
- `contact.email`
- `nav`

### Configurable decision

Confirm whether these should also be protected:

- `home.ctaButtonUrl`
- `services.ctaButtonUrl`
- any future repo-level or deployment URLs

If email addresses remain protected, any derived `mailto:` links that mirror those values should also be normalized or blocked.

---

## Proposed Implementation

### Validation pipeline

1. AI response parsed to candidate JSON
2. Candidate checked for required top-level sections
3. Candidate checked against expected structure
4. Protected fields compared to current state
5. Derived field policy applied
6. Only validated candidate can enter `pendingChanges`

### Behavior on blocked change

- Do not silently publish
- Show a system message like:
  - `Blocked protected field change: contact.email`
- Keep the original content unchanged
- Encourage the user to rephrase the request

### Optional enhancement

- Auto-restore protected fields and still show the remaining valid diff
- If implemented, the UI must explicitly say protected fields were restored

---

## TDD Plan

### Unit tests

- valid full JSON passes validation
- missing required section fails validation
- protected `meta.siteTitle` change is blocked
- protected `contact.email` change is blocked
- full `nav` replacement is blocked
- allowed content-only change passes
- derived `mailto:` policy behaves as specified

### Integration tests

- AI response containing protected-field edits never reaches publish
- AI response with valid content-only changes renders diff card
- blocked changes show user-visible explanation
- docs examples do not instruct disallowed changes

### Manual verification

- ask to change the email address and confirm publish is blocked
- ask to change home headline and confirm publish is allowed
- ask to change navigation labels and confirm publish is blocked

---

## Files Expected to Change

- `admin/index.html`
- `MANUAL.md`
- `README.md`
- possibly `tools/ollama-helper.py` if policy parity is desired

---

## Acceptance Criteria

- [x] Protected fields are enforced by code before publish
- [x] Invalid AI JSON cannot enter publish flow
- [x] Blocked changes show clear, specific feedback
- [x] Docs and onboarding text match the real policy
- [x] Examples suggesting forbidden edits are removed or rewritten
- [x] Tests cover allowed vs blocked edit scenarios

---

## Risks

- Overblocking legitimate edits if policy is too broad
- Inconsistent enforcement between admin panel and Ollama helper

---

## Exit Criteria

This sprint is complete only when the admin panel's claims about protected data are true in code, not just in documentation.
