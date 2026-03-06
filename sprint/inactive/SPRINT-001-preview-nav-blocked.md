# SPRINT-001 — Preview Nav Links Blocked by CSP

| Field       | Value                                          |
|-------------|------------------------------------------------|
| **ID**      | SPRINT-001                                     |
| **Status**  | 🔴 Inactive                                    |
| **Priority**| High                                           |
| **Type**    | Bug                                            |
| **File**    | `admin/index.html`                             |
| **Created** | 2026-03-06                                     |

---

## Problem

Clicking any link inside the **preview iframe** (the site nav rendered with the consultant's header — "Home / About / Services / Contact") shows a browser error:

> **"This content is blocked. Contact the site owner to fix the issue."**

The admin nav bar at the top (the dark bar with ⚡ JM AI Admin) works fine — those are real tab buttons. But the mock site nav **inside the preview** triggers CSP navigation blocking.

### Screenshots

- Contact preview loads correctly on first render.
- Clicking a nav link inside the preview → "This content is blocked" (red blocked icon).

---

## Root Cause Analysis

1. The preview is rendered using `iframe.srcdoc` (line ~682 in `admin/index.html`):
   ```javascript
   frame.srcdoc = html;
   ```

2. The `srcdoc` iframe inherits the parent page's **Content Security Policy** (line 7):
   ```
   frame-src blob: data:;
   ```

3. Inside the preview, nav links are rendered as `<a href="#">`:
   ```javascript
   const nav = data.nav.items.map(i =>
     `<li><a href="#" ...>${esc(i.label)}</a></li>`
   ).join('');
   ```

4. When the user clicks one of these `<a href="#">` links, the browser attempts to navigate the iframe. In the context of an `srcdoc` iframe with CSP restrictions, this navigation is **blocked** — even though it's just a `#` anchor.

5. Other clickable elements that cause the same issue:
   - CTA buttons: `<a href="#" class="btn btn-primary">`
   - Mailto link on Contact page: `<a href="mailto:...">`

---

## Solution Plan

### Fix A — Inject click interceptor in preview (recommended)

Add a small inline `<script>` at the end of the `buildPreviewHTML()` function that intercepts **all link clicks** inside the preview and prevents navigation:

**File:** `admin/index.html` → `buildPreviewHTML()` function (~line 688)

**Current code:**
```javascript
return `<!DOCTYPE html><html lang="en"><head>...
</head><body>${header}<main>${main}</main>${footer}</body></html>`;
```

**New code:**
```javascript
return `<!DOCTYPE html><html lang="en"><head>...
</head><body>${header}<main>${main}</main>${footer}
<script>
document.addEventListener('click', function(e) {
  var link = e.target.closest('a');
  if (link) e.preventDefault();
});
</script>
</body></html>`;
```

This works because:
- The parent CSP includes `script-src 'unsafe-inline'`, which is inherited by the `srcdoc` iframe.
- Prevents ALL navigation inside the preview — nav clicks, CTA clicks, mailto clicks.
- The preview is read-only anyway; no links should actually navigate.

### Fix B — Alternative: Sandbox the iframe

Add `sandbox="allow-same-origin"` attribute to the iframe element. This blocks all navigation and script execution inside the iframe.

**Pros:** No JS injection needed.
**Cons:** Also blocks any future interactive features in the preview.

---

## Acceptance Criteria

- [ ] Clicking nav links inside the preview does **not** show "This content is blocked"
- [ ] Clicking CTA buttons inside the preview does **not** navigate
- [ ] Clicking the email mailto link inside the preview does **not** open email client
- [ ] The preview still renders correctly after the fix
- [ ] The admin nav bar (top bar tabs) still works as before

---

## Estimated Effort

~15 minutes — single function change in `buildPreviewHTML()`.
