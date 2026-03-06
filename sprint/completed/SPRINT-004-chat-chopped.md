# SPRINT-004 — Chat Messages Chopped / Last Message Hidden

| Field       | Value                                          |
|-------------|------------------------------------------------|
| **ID**      | SPRINT-004                                     |
| **Status**  | ✅ Completed                                    |
| **Priority**| High                                           |
| **Type**    | Bug                                            |
| **File**    | `admin/index.html`                             |
| **Created** | 2026-03-06                                     |

---

## Problem

The last chat message (especially tall change-proposal cards) gets cut off at the bottom. The user cannot see the Apply/Reject buttons because the chat area doesn't scroll far enough.

### Root Cause

`scrollChat()` fires synchronously inside `addMsg()` before the browser has finished laying out the new element. For tall elements like change cards, `scrollHeight` is stale at call time.

Additionally, `.chat-messages` has only `padding: 14px` on all sides — the last element sits flush against the bottom edge of the scroll container.

---

## Fix History

### Round 1 (`dff763c`)
1. Wrapped `scrollTop` in single `requestAnimationFrame`.
2. Added `60px` bottom padding to `.chat-messages`.

**Result:** Partially fixed — still chopped on tall change cards.

### Round 2 (`f24304c`)
1. Strengthened `scrollChat()` with **double** `requestAnimationFrame` + `setTimeout(150ms)` fallback.
2. Changed confirmation flow to **auto-apply** pending changes when user types "ok"/"yes"/etc. instead of telling them to scroll up and find the Apply button.

**Result:** Fully fixed — chat always scrolls to bottom, and confirmation-by-text works seamlessly.

---

## Acceptance Criteria

- [x] Last message (including tall change cards) is fully visible
- [x] Apply/Reject buttons are visible without manual scrolling
- [x] Typing "ok", "yes", etc. auto-applies pending changes (no need to find button)
- [x] Chat scrolls correctly even for rapid successive messages

---

## Estimated Effort

~20 minutes total (across 2 rounds).
