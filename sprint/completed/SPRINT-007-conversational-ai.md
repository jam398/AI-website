# SPRINT-007 — Conversational AI Chat

**Status:** 🔵 Active  
**Priority:** High  
**Created:** 2026-03-06

## Problem

The AI only understands edit commands. When the user asks a question like "what can I change on this tab?" or "what's the current headline?", the AI tries to return JSON and responds with "no changes needed" — it can't hold a conversation.

## Solution: Dual-Mode AI Response

Enhance the system prompt so GPT-4o can operate in two modes:

### Mode 1 — Conversation (questions, explanations, suggestions)
When the user asks a question, wants advice, or is chatting, the AI responds with **plain text** (no JSON). Examples:
- "What can I change on this page?" → AI lists the editable fields and their current values
- "What's the current headline?" → AI tells them
- "Make it sound more professional" → AI might ask clarifying questions first
- "What do you suggest for the services page?" → AI gives creative suggestions

### Mode 2 — Edit (content changes)
When the user clearly wants to change content, the AI responds with the **full JSON** wrapped in ```json fences, exactly like today.

### How it works (code changes):
1. **Updated system prompt** — tells the AI it can either chat naturally OR return JSON when the user wants edits. Describes both modes clearly.
2. **Smart response parser** — after receiving the AI response:
   - If it contains a valid JSON code block → extract it, diff, show proposal card (existing flow)
   - If it's plain text → show as a normal AI chat message
3. **Conversation context** — include the last few chat messages in the API call so the AI remembers the conversation (not just the current instruction)

### Benefits:
- AI can answer questions about the site content
- AI can suggest changes before making them
- AI can ask for clarification on vague requests
- AI remembers what was discussed earlier in the session
- Edit flow stays exactly the same — Apply & Publish button still required

## Acceptance Criteria

- [x] AI responds conversationally to questions (plain text)
- [x] AI still returns JSON proposals for edit requests
- [x] Conversation context (last 10 messages) sent with each request
- [x] "What can I change?" type questions get helpful answers
- [x] Edit flow unchanged — diff card + Apply & Publish button
- [x] No regression on existing edit functionality
