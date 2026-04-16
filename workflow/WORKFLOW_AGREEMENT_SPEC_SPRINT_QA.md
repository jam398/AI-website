# Working Agreement: Spec, Sprint, QA Workflow

## Purpose

This document defines the development workflow for this project. It ensures
meaningful work is captured in durable artifacts rather than lost in chat
memory.

## Core Rule

Do not rely on chat memory as the system of record.

For meaningful work, preserve intent in durable artifacts:

- specs
- sprint docs
- QA reports
- change notes

---

## Path Selection

Before starting work, classify the request into one of two paths.

### 1. Full Spec + Sprint Path

Use when work is:

- foundational or architectural
- ambiguous or under-defined
- high-impact or multi-file
- likely to span multiple sessions
- likely to need real QA as a separate pass

Lifecycle:

1. Write or confirm the spec
2. QA the spec
3. Write sprint doc(s)
4. QA the sprint doc(s)
5. Implement one sprint at a time
6. QA the implementation
7. Rerun verification after fixes

Do not merge these phases casually.

### 2. Lightweight Change Path

Use when work is:

- narrow and low-risk
- low-ambiguity
- easy to verify directly
- localized to one file or one small surface

Artifact: a Change Note (see template) with Problem, Scope, Invariants,
Files, Plan, Verification, Outcome.

**When in doubt, choose the full path.**

---

## What A Spec Must Contain

A spec defines the WHAT and WHY. Required sections:

- **Problem Statement** — what is wrong, who it affects, why it matters
- **Goals** — intended outcomes
- **Non-Goals** — what this spec will not solve
- **Current State** — existing files, flows, limitations
- **Proposed Approach** — how the feature works, how it fits the system
- **Architecture / Data / Flow Notes** — as needed
- **Invariants** — what must not break
- **Risks** — realistic failure modes
- **Verification Strategy** — how the work will be checked
- **Sprint Plan** — breakdown into bounded units
- **Completion Criteria** — what must be true to count as complete

## What A Sprint Must Contain

A sprint defines the exact HOW for one bounded unit. Required sections:

- **Goal** — one clear paragraph
- **Governing Spec** — reference to the parent spec
- **Scope / Non-Goals** — what is in and out of bounds
- **Available Assets / Current State** — files, components, APIs this sprint
  depends on (paths, roles, limitations)
- **Files Expected To Change** — explicit list
- **Ordered Tasks** — each with objective, files, what changes, what stays,
  verify-after
- **Product Rules** — behavior invariants that must hold post-sprint
- **Risks / Watchouts** — likely failure points
- **Verification** — exact commands or checks to run
- **Completion Checklist** — checkbox list
- **QA Notes** — issues found, fixes applied, deviations

---

## QA Rules

QA is a real pass, not a summary.

A QA pass must:

1. Read the governing spec
2. Read the sprint doc
3. Read the changed files
4. Compare implementation against actual requirements
5. Identify real gaps
6. Fix gaps if needed
7. Rerun verification after fixes

If no issues remain, record that clearly.

### QA Fix Loop

If QA finds a problem, do not treat the fix as the end of QA.

1. Patch the issue
2. Re-QA the **entire file** — not just the patched line or the area around it
3. Compare the full file against the **original intent** (spec, sprint, or
   change note) — not against the fix itself
4. Rerun the required verification commands
5. If the re-QA finds another issue, go back to step 1
6. Keep looping until a full-file QA pass finds zero issues

**Do not stop after one re-QA.** Every fix can introduce or reveal something
else. The loop ends only when a complete pass over the whole file is clean.

### When To Stop Patching And Rollback

Patching is for small gaps. If QA keeps finding problems, the issue may be
architectural — and more patches won't fix architecture.

**Stop the fix loop and rollback if:**

1. The same area breaks again after being fixed twice — the fix isn't
   solving the root cause
2. Fixes keep creating new problems elsewhere — the change is destabilizing
   something fundamental
3. The implementation has drifted so far from the spec's proposed approach
   that it no longer matches the original design

**When you rollback:**

1. Revert or shelve the sprint's changes
2. Document what failed and why in the sprint's QA Notes
3. Go back to the spec and re-evaluate the approach
4. Either revise the spec or write a new sprint with a different approach
5. Do not retry the same approach that already failed twice

### What QA Should NOT Flag

Do not flag trivial style issues that have no functional impact:

- Extra blank lines or spacing differences
- Minor formatting preferences
- Comment wording or punctuation
- Import ordering (unless it causes a bug)

QA catches **functional problems, logic errors, missing behavior, security
gaps, and spec violations** — not cosmetic preferences.

### QA Reporting

Append a **QA Report** section with:

- Verdict (PASS / FAIL with count)
- Issues found and how they were resolved
- Final verification results

Do not merge QA into implementation. QA is a separate recorded pass.

---

## Sequential Sprint Carry-Forward

When sprints are chained, QA on Sprint N can change files, behavior, or
assumptions that Sprint N+1 depends on.

Rules:

1. Finish QA for Sprint N
2. Capture any file, behavior, or constraint changes from that QA
3. Before implementing Sprint N+1, **update the Sprint N+1 document** with
   the new information — especially if Sprint N is related to Sprint N+1
4. If Sprint N QA changed files Sprint N+1 will touch, carry forward
   explicitly into the sprint doc's Available Assets / Current State section
5. Record what changed and why in the sprint doc so the implementation
   starts from accurate assumptions, not stale ones
6. Downstream sprint QA must verify both the original intent AND the updated
   state from prior QA

**Do not start a new sprint on stale information.** If the previous sprint
found problems, the next sprint's document must reflect those findings
before implementation begins.

This prevents chained work from drifting against outdated assumptions.

---

## Scope Discipline

- No unrelated features or refactors
- No rewriting adjacent systems without approval
- No "helpful expansion" that redefines scope
- Bounded work is the default

## Verification Rule

Do not claim work is done because it looks done.

Completion requires the relevant checks to pass. Pick the verification level
matching scope: lint, tests, build, manual UI, etc.

## Dependency Verification

For every UI or runtime element, explicitly verify its required dependencies
function (e.g., a form depends on JS, an API depends on auth, a deploy
depends on CI). Record this verification in the QA report.

---

## Testing Strategy

Write tests when adding or changing logic. Follow TDD when practical: write
the test first, see it fail, implement, then pass.

### Test Types

The types below are the baseline. When working on a feature, **search for
additional test types that apply** to the specific technology or domain —
do not limit yourself to this list alone.

#### 1. Unit — Positive

Test that valid inputs produce the correct expected output.

- Cover every exported function and method.
- Each distinct behavior path gets its own test.
- Example: `validateCandidateData(validSite, validCandidate)` returns `{ ok: true }`.

#### 2. Unit — Negative

Test that invalid, null, empty, undefined, or malicious inputs are rejected
gracefully — with the correct error message or behavior, not a crash.

- Pass `null`, `undefined`, `""`, `0`, wrong types, objects with missing keys.
- Verify the error is specific (not a generic crash or unhandled exception).
- Example: `validateCandidateData(null, null)` returns an error, not a TypeError.

#### 3. Boundary / Edge-Case

Test at the exact limits of valid and invalid ranges.

- Empty arrays, empty objects, empty strings.
- Maximum allowed length (e.g., input cap of 2000 characters — test 2000 and 2001).
- Zero, negative numbers, off-by-one.
- Missing optional fields vs. missing required fields.
- Unicode, special characters, very long strings.
- Example: `getLiveUrl("a/b")` works; `getLiveUrl("")` does not crash.

#### 4. Integration

Test that multiple modules work together correctly end-to-end within the
system, using mocks for external services.

- Wire up the real internal modules but mock external APIs (GitHub, OpenAI, etc.).
- Verify the full request → handler → logic → response chain.
- Example: Worker receives a `propose_content_update` request → calls policy
  validation → uses mocked GitHub fetch → returns the expected proposal hash.

#### 5. Contract

Test that interfaces between systems agree on shape and behavior.

- If module A sends data to module B, verify A's output matches B's expected input.
- If a shared module (e.g., `site-policy.js`) is used by both client and server,
  test that both sides agree on the exported API.
- Example: Admin panel's `TOOL_DEFINITIONS` array matches the worker's `TOOLS`
  array in name and parameter shapes.

#### 6. Smoke

Quick, lightweight checks that the overall build and deployment are healthy.

- Build output contains expected files (e.g., `_site/index.html` exists).
- Key pages render with expected content (title, heading, nav links).
- Health or status endpoints respond with 200.
- CSS file is present and non-empty.
- Example: After build, `_site/admin/index.html` exists and contains `<title>`.

#### 7. Security

Test that security controls are enforced, not just present.

- Protected fields cannot be changed through any code path.
- Auth is required — requests without credentials are rejected.
- XSS: HTML/script injection in user input is escaped or stripped.
- Input sanitization: SQL injection, path traversal, oversized payloads.
- Secrets are not leaked in responses, logs, or error messages.
- Example: `validateCandidateData` blocks changes to `contact.email` even
  when nested in a larger valid change.

#### 8. Regression

When fixing a bug, write a test that reproduces the bug BEFORE writing the fix.

- The test must fail with the old code and pass with the fix.
- Name the test descriptively: what was broken and what the fix ensures.
- Never delete a regression test — it guards against recurrence.
- Example: Sprint-002 fixed email not changing → regression test confirms
  `meta.email` is protected and `contact.email` is protected.

#### 9. Data Integrity / Validation

Test that data structures conform to their required schema.

- Required fields are present and correctly typed.
- Cross-field consistency (e.g., `home.ctaButtonUrl` must match `mailto:` + `meta.email`).
- No orphaned references (e.g., nav links point to existing pages).
- Example: `validateContentIntegrity(site)` confirms all sections exist, emails
  match, and no placeholder content remains.

#### 10. Idempotency

Test that operations produce the same result when run multiple times.

- Applying the same content update twice does not corrupt data.
- Running build twice produces identical output.
- Example: `stableStringify(obj)` returns the same string regardless of key
  insertion order, on every call.

### Additional Types — Research When Relevant

The above covers the project's current needs. When working on new features or
technologies, **search the internet for test types specific to that domain**
and add them. Examples of types that may become relevant:

- **Accessibility (a11y):** Screen reader compatibility, ARIA attributes, color contrast.
- **Snapshot:** Capture rendered output and compare against a saved baseline.
- **API / Schema validation:** Validate request/response payloads against OpenAPI or JSON Schema.
- **Concurrency:** Multiple simultaneous operations don't corrupt shared state.
- **Compatibility:** Works across target browsers, Node versions, or environments.
- **Error recovery:** System returns to a valid state after failures (network timeout, disk full, etc.).

Do not limit testing to what is listed here. If the feature needs it, research it.

### Types NOT Needed (at this scale)

- Performance / load testing
- Property-based / fuzz testing
- Mutation testing
- Full E2E with real API keys (use mocks instead)

### Test Organization

- One test file per module or concern
- Naming: `{module}.test.{js,mjs}`
- Group related assertions under descriptive test names
- Use the project's existing test runner

### TDD Flow

1. Write a failing test that describes the expected behavior
2. Run it — confirm it fails for the right reason
3. Implement the minimal code to pass the test
4. Run again — confirm it passes
5. Refactor if needed, re-run tests

### When Tests Are Required

- Any new exported function or method
- Any bug fix (regression test)
- Any validation rule change
- Any API contract change (request/response shape)
- Any security-critical logic

### When Tests Are Optional

- Pure template/markup changes with no logic
- CSS-only changes
- Documentation-only changes

---

## Operating Checklist

**Before implementation:**

1. Classify the work (full or lightweight)
2. Read existing relevant artifacts
3. Verify current repo/file state
4. Define allowed file scope

**During implementation:**

1. Stay inside the sprint or change note scope
2. Verify progress against the artifact, not memory
3. Avoid unrelated refactors

**After implementation:**

1. Run the required verification
2. Do the QA pass
3. If QA finds a problem, fix and re-QA the full affected scope
4. Record any deviations
5. Only then mark the work complete

---

## Artifact Placement

Planning artifacts live in the project's designated workflow/sprint directory.
Each project decides where (e.g., `workflow/`, `sprint/`, `docs/_specs/`).

This includes: specs, sprint docs, QA reports, change notes, handoff notes.
