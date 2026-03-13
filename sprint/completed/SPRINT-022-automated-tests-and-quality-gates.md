# SPRINT-022 - Automated Tests and Quality Gates

**Status:** Completed  
**Priority:** High  
**Created:** 2026-03-13  
**Depends on:** SPRINT-017, SPRINT-018, SPRINT-019, SPRINT-020, SPRINT-021

---

## Problem

The project currently builds, but it does not have meaningful automated coverage for the admin panel logic, worker authorization rules, or content-integrity guarantees. High-risk behavior is validated mostly by manual use.

That is not enough for a tool that manages credentials and writes content.

---

## Goal

Create a practical automated quality gate that protects the hardening work and catches regressions before deploy.

---

## Scope

### In scope

- choose a test runner strategy for worker code
- extract testable logic from large inline scripts where needed
- add worker unit and integration tests
- add content validation checks
- wire tests into CI

### Out of scope

- full browser E2E suite if it requires a large framework jump
- visual snapshot testing

---

## Test Strategy

### Worker tests

- authorization middleware
- tool policy matrix
- URL resolution
- deploy-status permission handling
- error response contract

### Admin logic tests

- protected-field validation
- AI JSON parsing and schema checks
- content-integrity rules
- live URL helper

### Build checks

- Eleventy build
- JS syntax check
- Python compile check
- content lint for placeholders and broken assumptions

---

## Proposed Implementation

### Refactor for testability

- extract worker helper functions into small pure functions
- extract admin validation logic into isolated script modules if needed
- keep the current app behavior while improving separability

### CI additions

- run tests on push and PR
- fail build on:
  - auth regression
  - protected-field regression
  - placeholder content regression
  - live URL regression

---

## TDD Plan

This sprint itself is the TDD enforcement sprint. Each new rule added in previous hardening sprints must have a failing test before final implementation merge.

### Minimum required test files

- worker auth policy tests
- worker URL resolution tests
- admin protected-field tests
- admin JSON validation tests
- content placeholder/integrity tests

### Manual verification

- confirm CI runs locally and in GitHub Actions
- deliberately break a protected-field rule and verify CI fails
- deliberately reintroduce placeholder email and verify CI fails

---

## Files Expected to Change

- `package.json`
- `.github/workflows/deploy.yml` or new CI workflow
- `tools/mcp-remote/src/index.js`
- new `tests/` or equivalent directories
- possibly `admin/` extracted helper modules

---

## Acceptance Criteria

- [x] Automated tests cover worker auth policy
- [x] Automated tests cover protected-field enforcement
- [x] Automated tests cover live URL correctness
- [x] Automated tests cover content-integrity placeholder checks
- [x] CI fails on regression in any of the above
- [x] Local developer command for full verification is documented

---

## Risks

- Current monolithic `admin/index.html` may need light refactoring before testing is practical
- Adding too much tooling could overshoot the project's size

---

## Exit Criteria

This sprint is complete only when the project has a repeatable automated gate that protects the hardening work from regression.
