# SPRINT-003 — Chat Shows "Editing Home" Even on Other Tabs

| Field       | Value                                          |
|-------------|------------------------------------------------|
| **ID**      | SPRINT-003                                     |
| **Status**  | 🔴 Inactive                                    |
| **Priority**| Medium                                         |
| **Type**    | Bug                                            |
| **File**    | `admin/index.html`                             |
| **Created** | 2026-03-06                                     |

---

## Problem

The chat panel always displays "✓ Loaded site data. You're editing the **home** page." even when the user has switched to the Contact, About, or Services tab using the admin nav bar.

### Steps to reproduce:
1. Open the admin panel → chat says "You're editing the **home** page."
2. Click the **Contact** tab in the admin nav bar
3. Preview updates to show the Contact page
4. Chat still says "You're editing the **home** page." ← stale
5. User sends a message about contact content but thinks the AI doesn't know what page they're on

---

## Root Cause Analysis

The system message is set **once** during initialization in `initApp()` (~line 993):

```javascript
addMsg('system', `✓ Loaded site data. You're editing the <strong>${state.currentPage}</strong> page.`);
```

At init time, `state.currentPage` is `'home'` (the default). This message is a static DOM element that is never updated when the user switches tabs.

**Important note:** The AI context is actually correct — `switchPage()` correctly updates `state.currentPage`, and `callAI()` sends the current page to GPT-4o:

```javascript
content: `...The user is currently viewing the "${state.currentPage}" page.\n\n...`
```

So the AI **does** know the correct page. The bug is purely visual — the stale chat message confuses the user into thinking the AI is editing the wrong page.

---

## Solution Plan

### Fix A — Update system message on tab switch (recommended)

Add a new system message (or update the existing one) when `switchPage()` is called.

**File:** `admin/index.html` → `switchPage()` function (~line 950)

**Current code:**
```javascript
function switchPage(page) {
  state.currentPage = page;
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.page === page)
  );
  document.getElementById('preview-label').textContent =
    `Preview — ${page.charAt(0).toUpperCase() + page.slice(1)}`;
  updatePreview();
  updateQuickActions();
}
```

**New code:**
```javascript
function switchPage(page) {
  state.currentPage = page;
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.page === page)
  );
  document.getElementById('preview-label').textContent =
    `Preview — ${page.charAt(0).toUpperCase() + page.slice(1)}`;
  updatePreview();
  updateQuickActions();
  addMsg('system', `Switched to <strong>${page}</strong> page.`);
}
```

This adds a small system message each time the user switches tabs so they always know which page is active in the chat context.

### Fix B — Alternative: Use a persistent status indicator

Instead of adding chat messages, show the current page in a fixed element above the chat messages (e.g., a subtle "Editing: Contact" badge). Update it on every tab switch.

---

## Acceptance Criteria

- [ ] Switching from Home to Contact tab shows "Switched to **contact** page." in chat
- [ ] Switching to any tab updates the chat context indicator
- [ ] The AI still receives the correct `state.currentPage` in its prompt
- [ ] Quick actions update to match the new tab (already works)
- [ ] No duplicate or excessive messages when switching tabs rapidly

---

## Estimated Effort

~10 minutes — one line added to `switchPage()`.
