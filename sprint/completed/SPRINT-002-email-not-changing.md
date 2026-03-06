# SPRINT-002 — AI Cannot Change Email (Protected Fields Too Restrictive)

| Field       | Value                                          |
|-------------|------------------------------------------------|
| **ID**      | SPRINT-002                                     |
| **Status**  | ✅ Completed                                    |
| **Priority**| Critical                                       |
| **Type**    | Bug                                            |
| **File**    | `admin/index.html`                             |
| **Created** | 2026-03-06                                     |

---

## Problem

When the user asks the AI to change the email (e.g., "change the email to example@hotmail.com"), the AI proposes changes but the email **never actually changes**. Two sub-issues:

### Sub-issue A: Protected fields silently block email changes

The AI correctly identifies the email fields to change, but the **protected-fields security check** (lines ~655–662) silently restores them:

```javascript
const PROTECTED = ['meta.siteTitle', 'meta.consultant', 'meta.email', 'contact.email'];
for (const p of PROTECTED) {
  const [a, b] = p.split('.');
  if (state.siteData[a]?.[b] !== parsed[a]?.[b]) {
    parsed[a][b] = state.siteData[a][b]; // Silently restore protected value
  }
}
```

**What happens step by step:**
1. User asks: "Change the email to example@hotmail.com"
2. GPT-4o modifies `meta.email`, `contact.email`, `home.ctaButtonUrl`, and `services.ctaButtonUrl`
3. Protected-fields check **silently restores** `meta.email` and `contact.email` back to the original values
4. Only `home.ctaButtonUrl` and `services.ctaButtonUrl` (mailto: links) survive → shown in the diff
5. The actual email addresses remain unchanged — the user sees a partial diff that doesn't include the real email fields

### Sub-issue B: "Yes do it" interpreted as new instruction, not confirmation

When the user types "yes do it" or "yes change it" instead of clicking the **✓ Apply & Publish** button, the text goes to the AI as a brand-new instruction. The AI re-processes against the original `state.siteData` (unchanged, since Apply was never clicked), tries the same email change, hits the same protected-fields logic, and this time returns with **zero diffs** → "No changes needed — the content already matches your request."

### Current email fields in `content/site.json`:
- `meta.email`: `jose--addiel@hotmail.com` (line 6)
- `contact.email`: `jose--addiel@hotmail.com` (line 157)
- `home.ctaButtonUrl`: `mailto:jose--addiel@hotmail.com` (line 74)
- `services.ctaButtonUrl`: `mailto:jose--addiel@hotmail.com` (line 151)

---

## Root Cause Analysis

The PROTECTED array was added during Security Audit #1 to prevent the AI from accidentally changing critical identity fields. However, the protection is **too aggressive** — the site admin should be able to change their own email address through the admin panel they control.

The original threat model assumed an attacker might craft a prompt injection to change the email. But since:
1. The admin panel requires both an OpenAI key AND a GitHub write token
2. Only the authenticated admin can send instructions
3. The admin explicitly reviews the diff before publishing

...protecting email from the admin's own instructions is counterproductive.

---

## Solution Plan

### Fix A — Remove email from PROTECTED array (recommended)

**File:** `admin/index.html` → PROTECTED constant (~line 655)

**Current code:**
```javascript
const PROTECTED = ['meta.siteTitle', 'meta.consultant', 'meta.email', 'contact.email'];
```

**New code:**
```javascript
const PROTECTED = ['meta.siteTitle', 'meta.consultant'];
```

This allows the admin to change emails via AI while still protecting the site title and consultant name (which are structural/branding fields that rarely change).

### Fix B — Add special handling for "yes" / confirmation messages

Detect when the user types a confirmation-like message ("yes", "do it", "yes change it", "apply it") and redirect them to click the Apply button instead:

**Add before the `callAI()` call in `handleSend()`:**
```javascript
const confirmPhrases = /^(yes|do it|yes do it|go ahead|apply|confirm|yes change it|ok|okay)\s*[.!]?$/i;
if (confirmPhrases.test(instruction) && Object.keys(state.pendingChanges).length > 0) {
  addMsg('ai', 'It looks like you\'re confirming the previous change. Please click the <strong>✓ Apply & Publish</strong> button on the change card above to save it.');
  state.isLoading = false;
  document.getElementById('btn-send').disabled = false;
  return;
}
```

### Fix C — Sync all email fields together

When the AI changes any email field, ensure ALL email-related fields are updated consistently (meta.email, contact.email, home.ctaButtonUrl mailto:, services.ctaButtonUrl mailto:). Add a post-processing step after `callAI()` returns.

---

## Acceptance Criteria

- [ ] "Change the email to example@hotmail.com" updates ALL email fields (meta, contact, ctaButtonUrl mailto: links)
- [ ] The diff shows all changed email fields to the user
- [ ] Clicking **✓ Apply & Publish** commits the changes to GitHub
- [ ] Typing "yes do it" in chat shows a helpful redirect to the Apply button (if pending changes exist)
- [ ] Site title (`JM AI Consulting`) and consultant name (`Jose Martinez`) remain protected
- [ ] Nav structure remains protected

---

## Estimated Effort

~30 minutes — modify PROTECTED array, add confirmation detection, test email change flow.
