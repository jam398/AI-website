# Proof-of-Concept Demo

This guide walks through the full content-update cycle in under 5 minutes.

---

## Prerequisites

- The repo is deployed on GitHub Pages (see [README — One-Minute Setup](README.md#one-minute-setup-for-classmates)).
- You know your live site URL: `https://YOUR-USERNAME.github.io/YOUR-REPO/`
- You have an **OpenAI API key** and a **GitHub Fine-grained PAT** (see [MANUAL.md](MANUAL.md#getting-started--admin-panel) for setup).

---

## Demo Steps

### Step 1 — Open the live site

Navigate to your GitHub Pages URL. You should see:

- A navy-blue hero section with the headline: **"AI consulting that turns ideas into working systems"**
- Navigation links: Home / About / Services / Contact
- Service cards, how-we-work steps, and a call-to-action

### Step 2 — Open the AI admin panel

Go to: `https://YOUR-USERNAME.github.io/YOUR-REPO/admin/`

- Enter your **OpenAI API key** and **GitHub token** on the setup screen.
- Click **Get Started**. The panel loads your current site content and shows a live preview.

### Step 3 — Edit content using AI

1. Make sure the **Home** tab is selected in the preview.
2. In the chat panel on the right, type:  
   `Change the headline to "Practical AI consulting for growing businesses"`
3. Press **Send** (or hit Enter).
4. The AI responds with a **diff card** showing:
   - **Red line (−):** the old headline being removed
   - **Green line (+):** the new headline replacing it
5. The preview on the left updates immediately to show how the new headline looks.

### Step 4 — Publish the change

Click **✓ Apply & Publish** on the diff card.

Behind the scenes:
- The admin panel commits the updated `content/site.json` to the `main` branch via GitHub's API.
- This triggers the GitHub Actions deploy workflow.

### Step 5 — Watch GitHub Actions

1. Go to your repo's **Actions** tab on GitHub.
2. You'll see a new workflow run starting (triggered by the admin panel commit).
3. Wait for it to complete (typically under 1 minute).

### Step 6 — Verify the update

1. Go back to your live site URL.
2. Hard-refresh the page (`Ctrl + Shift + R`).
3. Confirm the homepage headline now reads **"Practical AI consulting for growing businesses"**.

---

## Alternative: Quick Demo via GitHub Web Editor

If you haven't set up the admin panel yet, you can demo the same cycle using GitHub's built-in editor:

1. Go to `content/site.json` in your repo on GitHub.
2. Click the **pencil icon** (Edit this file).
3. Find `"headline"` and change its value.
4. Scroll down, add a commit message, and click **Commit changes**.
5. Go to **Actions** tab → watch the build.
6. Refresh your live site to see the change.

This proves the same principle: **edit one JSON file → site rebuilds automatically**.

---

## Bonus: Try the Built-in Tools

After completing the basic edit/publish demo, try these built-in tools — they run entirely in the browser with no extra setup:

1. Type **"Analyze my SEO"** — the AI scores each page and suggests improvements.
2. Type **"Check deploy status"** — shows your most recent GitHub Actions runs.
3. Click the **📦 Backup** quick-action button — saves a snapshot of your site content.
4. Type **"Write a LinkedIn post about my services"** — generates a ready-to-post social media update.

All 10 built-in tools are documented in [MANUAL.md — Built-in Tools](MANUAL.md#built-in-tools).

---

## What This Proves

| Requirement | Demonstrated |
|---|---|
| Content updates without editing HTML | ✅ Only `site.json` was changed |
| AI-powered natural language editing | ✅ Admin panel with GPT-4o chatbot |
| Automatic deploy on content change | ✅ GitHub Actions triggered by commit |
| Single source of truth | ✅ `content/site.json` controls all pages |
| No subscriptions | ✅ GitHub Pages + GitHub Actions = free |
| Classmate can replicate | ✅ Fork → enable Pages → open admin → edit → publish |
