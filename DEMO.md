# Proof-of-Concept Demo

This guide walks through the full content-update cycle in under 5 minutes.

---

## Prerequisites

- The repo is deployed on GitHub Pages (see [README — One-Minute Setup](README.md#one-minute-setup-for-classmates)).
- You know your live site URL: `https://YOUR-USERNAME.github.io/YOUR-REPO/`

---

## Demo Steps

### Step 1 — Open the live site

Navigate to your GitHub Pages URL. You should see:

- A navy-blue hero section with the headline: **"AI consulting that turns ideas into working systems"**
- Navigation links: Home / About / Services / Contact
- Service cards, how-we-work steps, and a call-to-action

### Step 2 — Open the admin panel

Go to: `https://YOUR-USERNAME.github.io/YOUR-REPO/admin/`

- If you've set up CMS authentication (see README), click **Login with GitHub**.
- You'll see the CMS dashboard with "All Site Content" listed.

### Step 3 — Edit content

1. Click **All Site Content** → the content editor opens.
2. Scroll to **Home Page → Headline**.
3. Change the headline to something like:  
   `"Practical AI consulting for growing businesses"`
4. Scroll down to **Services Page → Service Items**.
5. In the "Automation Design & Implementation Support" section, add a new bullet:  
   `"Error reduction through AI-powered quality checks"`

### Step 4 — Save (publish)

Click **Save** (or **Publish**) in the CMS.

Behind the scenes:
- The CMS commits the updated `content/site.json` to the `main` branch.
- This triggers the GitHub Actions deploy workflow.

### Step 5 — Watch GitHub Actions

1. Go to your repo's **Actions** tab on GitHub.
2. You'll see a new workflow run starting (triggered by the CMS commit).
3. Wait for it to complete (typically under 1 minute).

### Step 6 — Verify the update

1. Go back to your live site URL.
2. Hard-refresh the page (`Ctrl + Shift + R` or `Cmd + Shift + R`).
3. Confirm:
   - The homepage headline now reads "Practical AI consulting for growing businesses".
   - The Automation service section includes the new bullet about error reduction.

---

## Alternative: Quick Demo via GitHub Web Editor

If you haven't set up CMS auth yet, you can demo the same cycle using GitHub's built-in editor:

1. Go to `content/site.json` in your repo on GitHub.
2. Click the **pencil icon** (Edit this file).
3. Find `"headline"` and change its value.
4. Scroll down, add a commit message, and click **Commit changes**.
5. Go to **Actions** tab → watch the build.
6. Refresh your live site to see the change.

This proves the same principle: **edit one JSON file → site rebuilds automatically**.

---

## What This Proves

| Requirement | Demonstrated |
|---|---|
| Content updates without editing HTML | ✅ Only `site.json` was changed |
| No-code browser-based editing | ✅ CMS at `/admin` or GitHub web editor |
| Automatic deploy on content change | ✅ GitHub Actions triggered by commit |
| Single source of truth | ✅ `content/site.json` controls all pages |
| No subscriptions | ✅ GitHub Pages + GitHub Actions = free |
| Classmate can replicate | ✅ Fork → enable Pages → edit → publish |
