# SPRINT-005 — Proposed Changes Card Chopped / No Visible Apply Button

**Status:** 🔵 Active  
**Priority:** High  
**Created:** 2026-03-06  
**Related:** SPRINT-004

## Problem

1. The Proposed Changes card is cut off — users cannot scroll to see all changed fields and the Apply & Publish button is hidden below the visible area.
2. Users must type "ok" or "change it" to confirm, when they just want to click the Apply button directly.

## Root Cause

- `.diff-list` had `max-height: 300px` creating an internal scrollbar, but the entire `.msg-change` card had no flex layout to keep buttons visible.
- The card's Apply & Publish buttons live at the bottom of the card and get pushed out of the chat viewport.
- Text-based confirmation (`confirmPattern`) was the only reliable way to apply changes because the button wasn't visible.

## Fix

### Round 1
1. **Restructure `.msg-change` as flex column with max-height** — card gets capped at 420px, diff-list scrolls internally, buttons are always pinned at bottom via `flex-shrink: 0`.
2. **Remove `max-height` from `.diff-list`** — replaced with `flex: 1; min-height: 0;` so it fills available space and scrolls.
3. **Remove text-based confirmation handler** — no more `confirmPattern` matching in `handleSend()`. The Apply & Publish button is the only way to confirm.
4. **Improve `scrollChat()`** — add 300ms fallback delay to ensure card fully renders before scrolling.

### Round 2
Round 1's `max-height: 420px` + `overflow: hidden` on `.msg-change` collapsed the card, hiding diff content and buttons entirely.

1. **Remove `max-height` and `overflow: hidden` from `.msg-change`** — card renders at natural height, chat container handles scrolling.
2. **Restore `max-height: 300px` on `.diff-list`** — only the diff list scrolls internally when there are many fields; header and buttons always visible.
3. **Remove flex layout from `.msg-change`** — no longer needed since the card is unconstrained.

## Acceptance Criteria

- [x] All proposed change fields visible by scrolling within the card
- [x] Apply & Publish / Reject buttons always visible at bottom of card
- [x] Typing "ok" sends to AI as a normal message, not auto-apply
- [x] Chat auto-scrolls to show the change card
