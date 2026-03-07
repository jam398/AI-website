# SPRINT-015 — Floating Chat Bubble

**Status:** 🔵 Active  
**Priority:** High  
**Created:** 2026-03-06

## Problem

The chat panel takes 400px of width as a side panel, reducing preview space. Users want a floating circle button that opens/closes the chat as an overlay.

## Changes

1. **Floating circle button** (bottom-right) replaces the topbar "Chat" button
2. **Chat panel becomes a floating overlay** — positioned fixed, doesn't affect layout
3. **Preview takes full width** — always, whether chat is open or closed
4. **Smooth open/close animation** — scale + fade
5. **Remove chat from main-layout flex** — no longer a flex child

## Acceptance Criteria

- [x] Circle button visible at bottom-right corner
- [x] Click opens floating chat overlay
- [x] Click again (or X) closes it
- [x] Preview always uses full width
- [x] Chat overlay doesn't push/shift any content
- [x] Works on mobile
- [x] No layout breakage
