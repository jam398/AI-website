# SPRINT-021 - Content Integrity and Contact Configuration

**Status:** Completed  
**Priority:** Medium  
**Created:** 2026-03-13  
**Depends on:** SPRINT-018

---

## Problem

The current content points to a placeholder contact address, and there is no explicit content-integrity check to catch demo placeholders or inconsistent derived fields such as mirrored `mailto:` links.

That undermines the site's business value even when the code works.

---

## Goal

Add content-integrity safeguards so production-facing contact information is coherent, intentional, and easy to validate before release.

---

## Scope

### In scope

- Review and normalize contact data fields
- Decide whether email is protected or editable
- Add validation for derived `mailto:` fields
- Add content-lint checks for placeholder/demo values
- Update docs to distinguish demo content from production content

### Out of scope

- CRM integration
- form backend

---

## Required Decisions

1. Is `example@hotmail.com` intentional demo data or a mistake?
2. Should contact email remain protected in the admin panel?
3. Should CTA mailto links be derived automatically from a single canonical email field?

Recommended direction:

- one canonical email source
- derived mailto values generated, not hand-maintained
- explicit placeholder detection in release checks

---

## Proposed Implementation

### Content model cleanup

- Define canonical email field
- Either:
  - derive CTA mailto URLs at render time, or
  - validate all mailto fields against canonical email before publish

### Integrity checks

- flag placeholder patterns such as:
  - `example@`
  - `[Your Company Name]`
  - leftover demo text in contact copy

### Release readiness checklist

- add a documented pre-release content checklist
- include contact path verification across home, services, and contact pages

---

## TDD Plan

### Unit tests

- canonical email validation
- mailto normalization
- placeholder detector for demo values
- template subject/body sanity checks where applicable

### Integration tests

- rendering uses canonical email everywhere
- invalid placeholder content is detected before release
- protected-field policy and content-integrity policy do not conflict

### Manual verification

- click all contact CTAs
- verify contact page copy, visible email, and mailto links align
- confirm production content no longer uses demo placeholders

---

## Files Expected to Change

- `content/site.json`
- `src/index.njk`
- `src/services.njk`
- `src/contact.njk`
- `admin/index.html`
- `README.md`
- `MANUAL.md`

---

## Acceptance Criteria

- [x] Contact information is intentional and consistent
- [x] Placeholder/demo content is either removed or explicitly marked as demo-only
- [x] CTA contact links are derived or validated against a canonical source
- [x] Integrity checks exist for future edits
- [x] Tests cover contact consistency and placeholder detection

---

## Risks

- If email is intentionally editable, protected-field policy needs a refined exception model
- Deriving mailto links at render time may affect current content-editing expectations

---

## Exit Criteria

This sprint is complete only when contact flows are internally consistent and no accidental placeholder business data remains in production content.
