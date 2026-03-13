# SPRINT-019 - Token Permissions and Setup Validation

**Status:** Completed  
**Priority:** High  
**Created:** 2026-03-13  
**Depends on:** SPRINT-017

---

## Problem

The product documentation tells users to grant only GitHub Contents write, but some shipped tools also require GitHub Actions read. This causes valid user setups to fail at runtime, especially for deploy-status tooling.

The setup flow also validates tokens too broadly and does not explain capability-specific permission requirements clearly enough.

---

## Goal

Make token requirements explicit, validate them earlier, and degrade gracefully when optional tool permissions are missing.

---

## Scope

### In scope

- Correct all permission documentation
- Define minimum permission sets per feature
- Improve setup validation and error messaging
- Add capability detection for optional features
- Make tool failures actionable

### Out of scope

- OAuth login
- GitHub App replacement for PATs

---

## Permission Matrix

### Required baseline

- GitHub repository Contents: read and write

### Required for deploy status

- GitHub Actions: read

### Required for OpenAI-backed tools

- valid OpenAI API key with billing/usage enabled

---

## Proposed Implementation

### Setup validation

- Keep baseline GitHub token validation
- Add a capability probe for Actions access
- Store capability flags in UI state
- Mark tools as unavailable when required permissions are missing

### UX behavior

- Setup screen explains:
  - required permissions for editing
  - optional permissions for deploy status
- Tool output for deploy status should say:
  - `GitHub token is missing Actions: read permission`
  - not just generic failure

### Documentation

- Update README, MANUAL, worker README, and any setup copy in admin UI
- Add a troubleshooting entry for permission mismatch

---

## TDD Plan

### Unit tests

- capability parser maps GitHub probe responses correctly
- permission-specific error formatter returns actionable messages
- unavailable tool state renders correctly

### Integration tests

- token with Contents only allows editing flow
- token without Actions read disables or clearly errors deploy status
- invalid OpenAI key blocks OpenAI-backed tools with clear message

### Manual verification

- configure token without Actions read and confirm editing still works
- run deploy status and confirm specific remediation guidance
- configure fully privileged fine-grained token and confirm all tools work

---

## Files Expected to Change

- `admin/index.html`
- `README.md`
- `MANUAL.md`
- `tools/mcp-remote/README.md`
- `tools/mcp-remote/src/index.js`

---

## Acceptance Criteria

- [x] Documentation lists correct GitHub permissions for each feature
- [x] Setup flow communicates required vs optional permissions
- [x] Deploy-status failures are permission-aware and actionable
- [x] Features unrelated to Actions permission still work when Actions is missing
- [x] Tests cover partial-permission scenarios

---

## Risks

- GitHub API probe strategy may vary by token type
- Over-validating during setup may slow first-run UX

---

## Exit Criteria

This sprint is complete only when a user who follows the docs gets the capabilities the docs promise, and when permission gaps are diagnosed clearly.
