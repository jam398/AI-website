# SPRINT-020 - Live URL and Path Prefix Correctness

**Status:** Completed  
**Priority:** Medium  
**Created:** 2026-03-13  
**Depends on:** None

---

## Problem

The app and worker compute the live site URL as `https://owner.github.io/repo/` for every repository. That is wrong for user and organization sites where the correct URL is `https://owner.github.io/`.

This breaks "Open Live Site", default Lighthouse targets, and deploy-status context for a real class of GitHub Pages deployments.

---

## Goal

Centralize GitHub Pages URL resolution so the worker, admin panel, and documentation all resolve project sites and user sites correctly.

---

## Scope

### In scope

- Fix live URL calculation in admin panel
- Fix live URL calculation in worker
- Reuse the same rule as the deploy workflow
- Add tests for both site types
- Document examples for both URL shapes

### Out of scope

- Custom domain discovery
- arbitrary Pages branch/source detection

---

## Proposed Rule

If `repo === owner + ".github.io"`:

- live URL = `https://owner.github.io/`

Else:

- live URL = `https://owner.github.io/repo/`

This must match the workflow logic already used for Eleventy `pathPrefix`.

---

## Proposed Implementation

- Introduce a shared helper contract in both codepaths
- Add explicit tests for:
  - `jam398/AI-website` -> `https://jam398.github.io/AI-website/`
  - `jam398/jam398.github.io` -> `https://jam398.github.io/`
- Verify admin "Open Live Site" button behavior
- Verify worker `getLiveUrl` default used by Lighthouse and deploy status

---

## TDD Plan

### Unit tests

- project site URL resolution
- user site URL resolution
- malformed repo input handling

### Integration tests

- admin live-link renders correct URL for both repo shapes
- worker default Lighthouse target matches expected URL for both repo shapes

### Manual verification

- test with a project-site repo
- test with a user-site repo
- confirm no double slashes or duplicate repo path segments

---

## Files Expected to Change

- `admin/index.html`
- `tools/mcp-remote/src/index.js`
- `README.md`
- `MANUAL.md`

---

## Acceptance Criteria

- [x] Admin panel computes correct live URL for project sites
- [x] Admin panel computes correct live URL for user sites
- [x] Worker computes correct default live URL for project sites
- [x] Worker computes correct default live URL for user sites
- [x] Tests cover both URL patterns

---

## Risks

- Future custom-domain support may need a different resolution path

---

## Exit Criteria

This sprint is complete only when all generated live-site URLs are correct for both standard GitHub Pages deployment shapes.
