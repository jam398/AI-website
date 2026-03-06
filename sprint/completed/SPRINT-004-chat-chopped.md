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

### Fix

1. Wrap `scrollTop` assignment in `requestAnimationFrame` so the browser lays out the content first.
2. Add extra `padding-bottom` to `.chat-messages` so the last message has breathing room.

---

## Estimated Effort

~10 minutes.
