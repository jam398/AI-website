# SPRINT-023 - Operator Docs and Release Hardening

**Status:** Completed  
**Priority:** Medium  
**Created:** 2026-03-13  
**Depends on:** SPRINT-017, SPRINT-018, SPRINT-019, SPRINT-020, SPRINT-021, SPRINT-022

---

## Problem

The repo has useful documentation, but some of it is out of sync with the real system. There is no single operator-facing release checklist for secure worker deployment, permissions, content readiness, and verification after publish.

Without that, the project stays fragile even after code fixes.

---

## Goal

Make the project operable by documenting the secure deployment path, required permissions, release checklist, rollback path, and known support scenarios.

---

## Scope

### In scope

- align README, MANUAL, DEMO, and worker README
- add secure deployment and secret management guidance
- add release checklist
- add rollback and incident response notes
- document sprint execution order for the hardening backlog

### Out of scope

- full external docs site
- video tutorials

---

## Documentation Gaps to Close

- secure worker auth setup
- GitHub token permission matrix
- protected-field behavior
- user-site vs project-site URL behavior
- contact/content readiness before release
- local path drift such as OneDrive vs Dropbox references

---

## Proposed Deliverables

### Release checklist

- worker auth configured
- worker public proxy risk closed
- GitHub PAT permissions verified
- OpenAI key verified
- contact information verified
- Pages URL verified
- all tests green
- deploy confirmed

### Runbooks

- first-time secure setup
- rotate worker shared secret
- rotate GitHub token
- rotate OpenAI key
- recover from bad content publish
- verify deploy status after release

### Sprint execution notes

Recommended order:

1. SPRINT-017
2. SPRINT-018
3. SPRINT-019
4. SPRINT-020
5. SPRINT-021
6. SPRINT-022
7. SPRINT-023

Android work in `SPRINT-016` should start only after the hardening baseline is complete.

---

## TDD / Verification Plan

This sprint is documentation-heavy, but it still needs verification.

### Verification checks

- every documented setup step maps to real current code
- no stale path references remain
- no doc claims exceed actual implementation
- release checklist can be executed end-to-end against the repo

### Manual validation

- follow README from a clean clone
- follow MANUAL for admin setup
- follow worker README for secure deploy
- confirm no contradictions remain

---

## Files Expected to Change

- `README.md`
- `MANUAL.md`
- `DEMO.md`
- `tools/mcp-remote/README.md`
- possibly new release checklist doc under `sprint/` or project root

---

## Acceptance Criteria

- [x] Docs no longer recommend unsafe worker-secret usage without auth
- [x] Docs state correct GitHub permission requirements
- [x] Docs explain protected-field behavior accurately
- [x] Docs explain project-site vs user-site URL handling accurately
- [x] Docs contain no stale local path references
- [x] A release checklist exists and is actionable

---

## Risks

- Docs may drift again if code changes without process discipline

---

## Exit Criteria

This sprint is complete only when a new operator can deploy, secure, validate, and maintain the system using the repo docs without tribal knowledge.
