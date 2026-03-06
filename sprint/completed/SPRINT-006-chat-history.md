# SPRINT-006 — Chat History Persistence

**Status:** 🔵 Active  
**Priority:** Medium  
**Created:** 2026-03-06

## Feature Request

Users lose all chat messages when they reload the admin panel. Add persistent chat history using localStorage so conversations survive page refreshes.

## Implementation

1. **`saveChatHistory()`** — serializes all chat messages (type + innerHTML) to localStorage after every new message.
2. **`restoreChatHistory()`** — on init, reads saved messages and renders them into the chat panel. Pending change buttons are disabled since proposals become stale after reload.
3. **Clear history button** — 🗑️ icon in chat panel header to wipe history and reset the chat.
4. **50-message cap** — only the latest 50 messages are kept to avoid localStorage bloat.

## Acceptance Criteria

- [x] Chat messages persist after page reload
- [x] Restored change cards have disabled buttons (stale)
- [x] Clear history button wipes all messages
- [x] History capped at 50 messages
- [x] Welcome message re-appears on fresh/cleared history
