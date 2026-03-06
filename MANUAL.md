# JM AI Admin Panel — User Manual

A complete guide to editing your website using the AI-powered admin panel and the optional Ollama terminal tool.

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started — Admin Panel](#getting-started--admin-panel)
3. [Using the AI Chatbot](#using-the-ai-chatbot)
4. [Understanding the Diff View](#understanding-the-diff-view)
5. [Page Preview Mode](#page-preview-mode)
6. [Quick Actions](#quick-actions)
7. [Settings & Security](#settings--security)
8. [Alternative: Ollama Terminal Tool](#alternative-ollama-terminal-tool)
9. [Alternative: GitHub Web Editor](#alternative-github-web-editor)
10. [How It All Works (Behind the Scenes)](#how-it-all-works)
11. [Troubleshooting](#troubleshooting)
12. [Cost Estimates](#cost-estimates)

---

## Overview

Your website content lives in **one file**: `content/site.json`. Every page on your site (Home, About, Services, Contact) reads from this file.

You have **three ways** to edit it:

| Method | Best For | Requires |
|--------|----------|----------|
| **AI Admin Panel** (recommended) | Natural language edits in your browser | OpenAI API key + GitHub token |
| **Ollama Terminal Tool** | Offline/free edits using local AI | Python + Ollama installed |
| **GitHub Web Editor** | Quick manual text changes | Just a browser |

---

## Getting Started — Admin Panel

### Step 1: Open the Admin Panel

Go to your site's admin URL:

```
https://jam398.github.io/AI-website/admin/
```

(Replace `jam398/AI-website` with your own repo if you forked it.)

### Step 2: Enter Your Credentials (First Time Only)

You'll see a setup screen asking for three things:

#### OpenAI API Key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click **Create new secret key**
3. Copy the key (starts with `sk-`)
4. Paste it into the admin panel

> **Cost**: ~$0.01–0.05 per edit. You need at least $5 of credit in your OpenAI account.

#### GitHub Personal Access Token

1. Go to [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
2. Name it something like `JM AI Admin`
3. Under **Repository access**, select **Only select repositories** → choose your website repo
4. Under **Permissions → Repository permissions**, set **Contents** to **Read and write**
5. Click **Generate token**
6. Copy the token (starts with `github_pat_`)

> **Security**: Use a Fine-grained token limited to one repo. Never use a classic token with full `repo` scope.

#### Repository

This should already be filled in (e.g., `jam398/AI-website`). Change it only if you forked to a different repo.

### Step 3: Click "Get Started"

The panel validates both keys, loads your site data, and shows the editor.

> **Your keys are saved in your browser's localStorage.** They are never sent to GitHub or stored on any server. If you clear browser data, you'll need to enter them again.

---

## Using the AI Chatbot

The chat panel is on the right side of the screen. Type what you want to change in plain English.

### Example Instructions

**Simple edits:**
- `Change the headline to "AI Solutions for Modern Business"`
- `Update my subheadline to be shorter and punchier`
- `Change the footer tagline to "Empowering businesses through intelligent automation"`

**Content additions:**
- `Add a fourth service called "Chatbot Development" with 3 bullets and 2 deliverables`
- `Add a new step to How We Work called "Optimization"`
- `Add "education" to the industries list`

**Rewrites:**
- `Make the about bio sound more confident and experienced`
- `Rewrite the Training service description to emphasize hands-on workshops`
- `Make the contact intro shorter — just 1 sentence`

**Removals:**
- `Remove the third bullet from the AI Strategy service`
- `Remove the "Quarterly review framework" deliverable`

### Tips for Best Results

1. **Be specific.** "Change the headline" is vague. "Change the headline to something about AI transformation" is better. "Change the headline to 'AI That Works'" is best.

2. **Reference the page.** Click the page tab (Home, About, Services, Contact) before chatting. The AI knows which page you're looking at.

3. **One change at a time.** "Change the headline and rewrite the bio and add a service" may work, but separate requests give you better control over each change.

4. **Review the diff carefully.** The AI sometimes makes small extra changes. Check every red/green line before approving.

---

## Understanding the Diff View

When the AI proposes changes, you'll see a **diff card** with:

- **Field path** (grey) — which part of the JSON changed (e.g., `home.headline`)
- **Red line (−)** — the old value being removed
- **Green line (+)** — the new value replacing it
- **Change count** — total number of fields modified

### Buttons

| Button | What It Does |
|--------|-------------|
| **✓ Apply & Publish** | Saves the changes to GitHub. Your site rebuilds in ~1 minute. |
| **✕ Reject** | Discards the proposed changes. Nothing is saved. |

### What "Publish" Actually Does

When you click Apply & Publish:

1. The updated `site.json` is committed to the `main` branch on GitHub
2. GitHub Actions automatically detects the push
3. Eleventy rebuilds all 4 pages from the new JSON
4. The new site is deployed to GitHub Pages
5. **Total time: ~1 minute**

---

## Page Preview Mode

The left side of the screen shows a **live preview** of your site rendered with your actual CSS.

### Switching Pages

Click the tabs at the top: **Home**, **About**, **Services**, **Contact**

Each tab shows that page exactly as it appears on your live site (with minor rendering differences — see note below).

### Full-Width Preview

Click the **✕ Close** button (where the Chat button is) to hide the chat panel. The preview expands to full width — this is your "production view" mode. Click **💬 Chat** to bring the chat back.

### "Open Live Site" Link

Click **Open Live Site ↗** in the preview header to open your actual deployed site in a new tab.

> **Note:** The preview is an approximation. It renders your CSS faithfully, but small differences may exist (e.g., the `pathPrefix` for links). Always check the live site after publishing for the final result.

---

## Quick Actions

Below the chat messages, you'll see **quick action buttons** that change based on which page tab is active:

| Page | Quick Actions |
|------|--------------|
| Home | Change the headline, Update the subheadline, Edit a service card, Modify CTA text |
| About | Rewrite the bio, Update focus areas, Change industries served |
| Services | Edit a service title, Add a bullet point, Update deliverables |
| Contact | Change email template, Update intro text |

Clicking a quick action fills the chat input with that text. You can edit it before sending or just hit Enter/Send.

---

## Settings & Security

### Settings (⚙ button)

Click the gear icon in the top bar to update your:
- OpenAI API key
- GitHub token
- Repository name

### Logout (🚪 button)

Click the door icon to **clear all stored keys** from your browser and return to the setup screen. Use this:
- When using a shared/public computer
- If you want to switch to a different OpenAI account
- If your token expires and you need to enter a new one

### What's Protected

The AI **cannot change** these fields, even if you ask:
- Site title (`JM AI Consulting`)
- Consultant name (`Jose Martinez`)
- Email addresses
- Navigation menu structure

These are enforced client-side. The AI's response is checked and protected values are silently restored if tampered with.

### Rate Limiting

There is a **3-second cooldown** between AI requests to prevent accidental rapid-fire API calls. Instructions are limited to **2,000 characters**.

---

## Alternative: Ollama Terminal Tool

If you prefer **free, offline** editing using a local AI model (no API key needed):

### Requirements

- Python 3.8+ installed
- [Ollama](https://ollama.com/) installed and running
- A model pulled: `ollama pull qwen3:8b`

### Usage

Open a terminal and run:

```bash
cd c:\Users\jose-\OneDrive\AI-consultant\tools
python ollama-helper.py
```

The script will:

1. Show you all editable fields in `site.json`
2. Ask for an instruction (e.g., `Make the home headline more formal`)
3. Send the request to your local Ollama (qwen3:8b by default)
4. Show a before/after diff
5. Ask you to confirm (`y`/`n`)
6. Optionally commit and push to GitHub

### Using a Different Model

```bash
python ollama-helper.py gemma3:1b      # Faster, lower quality
python ollama-helper.py deepseek-r1:8b  # Slower, reasoning model
```

### Available Models on Your System

| Model | Speed | Quality | Best For |
|-------|-------|---------|----------|
| `qwen3:8b` (default) | ~30 sec | Good | General edits |
| `gemma3:1b` | ~5 sec | Basic | Quick simple changes |
| `deepseek-r1:8b` | ~3–5 min | Good (but slow) | Complex rewrites |

### Limitations

- Runs in terminal only (no visual preview)
- Local models are less capable than GPT-4o
- Requires Ollama to be running (`ollama serve`)
- May occasionally return invalid JSON (the script handles this gracefully)

---

## Alternative: GitHub Web Editor

The simplest method — no tools needed at all:

1. Go to your repo on GitHub: `github.com/jam398/AI-website`
2. Navigate to `content/site.json`
3. Click the **pencil icon** (Edit this file)
4. Find the text you want to change and edit it directly
5. Click **Commit changes**
6. Wait ~1 minute for the site to rebuild

**Risks:** If you break the JSON syntax (missing comma, unclosed quote), the build will fail. Use [jsonlint.com](https://jsonlint.com/) to validate if unsure.

---

## How It All Works

```
You type: "Make the headline shorter"
              │
              ▼
    ┌─────────────────┐
    │   AI Admin Panel  │  (browser)
    │   or Ollama CLI   │  (terminal)
    └────────┬──────────┘
             │ sends instruction + current site.json
             ▼
    ┌─────────────────┐
    │   GPT-4o (cloud) │  ← Admin Panel
    │   or qwen3:8b    │  ← Ollama (local)
    └────────┬──────────┘
             │ returns modified JSON
             ▼
    ┌─────────────────┐
    │  You review diff  │
    │  and approve (y)  │
    └────────┬──────────┘
             │ commits site.json to GitHub
             ▼
    ┌─────────────────┐
    │  GitHub Actions   │  (auto-triggered)
    │  builds 4 pages   │
    │  with Eleventy    │
    └────────┬──────────┘
             │ deploys to GitHub Pages
             ▼
    ┌─────────────────┐
    │  Live site        │
    │  updated! (~1 min)│
    └─────────────────┘
```

### What Can Be Edited

| Section | Fields | Example |
|---------|--------|---------|
| **Home** | headline, subheadline, credibility, whoWeHelp, 3 service cards, 4 how-we-work steps, CTA text/button | `"AI consulting that turns ideas into working systems"` |
| **About** | bio, extended bio, working style, 3 focus areas, industries | `"Jose Martinez is an IT-focused AI consultant..."` |
| **Services** | 3 services, each with title, description, bullets, deliverables, plus intro and CTA | `"AI Training & Enablement"` |
| **Contact** | intro, email template subject, email template body | `"AI Consulting Inquiry — [Your Company Name]"` |
| **Footer** | copyright text, tagline | `"© 2026 JM AI Consulting. All rights reserved."` |
| **Meta** | site description (for SEO) | `"AI consulting that turns ideas into working systems..."` |

### What Cannot Be Changed via AI

- Site title, consultant name, email addresses, navigation structure — these are protected fields.
- CSS styles, page layouts, HTML templates — these require code editing.
- Images — there are currently no images on the site.

---

## Troubleshooting

### Admin Panel

| Problem | Solution |
|---------|----------|
| **"OpenAI API key is invalid"** | Check that your key starts with `sk-` and your account has credit at [platform.openai.com/usage](https://platform.openai.com/usage) |
| **"GitHub token is invalid"** | Create a new Fine-grained PAT with **Contents: Read and write** for your repo |
| **"AI returned an invalid response"** | Rephrase your request. Be more specific. Avoid very long instructions. |
| **"File was modified externally"** | Someone else edited site.json (or you edited it on GitHub). Click Apply again — it auto-refreshes. |
| **Changes published but site doesn't update** | Wait 1–2 minutes. Then hard-refresh (`Ctrl+Shift+R`). Check the Actions tab for build errors. |
| **Blank page** | JavaScript must be enabled. Try a different browser if issues persist. |
| **Keys disappeared** | You cleared browser data. Re-enter your keys on the setup screen. |

### Ollama Tool

| Problem | Solution |
|---------|----------|
| **"Could not reach Ollama"** | Make sure Ollama is running: `ollama serve` |
| **"Ollama timed out"** | Use a faster model: `python ollama-helper.py gemma3:1b` |
| **"Invalid JSON" from model** | Try again — local models occasionally produce bad output. Or switch to `qwen3:8b` which is more reliable. |
| **"Protected field was changed"** | The tool blocked an unsafe edit. Rephrase your instruction to target only content fields. |
| **Git push fails** | Run `git pull --rebase` first, then try the tool again. |

### General

| Problem | Solution |
|---------|----------|
| **Build fails in GitHub Actions** | Check `content/site.json` for syntax errors. Validate at [jsonlint.com](https://jsonlint.com/). |
| **CSS looks wrong** | Hard-refresh the page. GitHub Pages caches aggressively. |
| **Want to undo a change** | Go to your repo → Commits → find the commit → click "Revert" |

---

## Cost Estimates

### Admin Panel (OpenAI GPT-4o)

| Usage | Estimated Cost |
|-------|---------------|
| 1 edit | $0.01–0.05 |
| 10 edits/week | ~$1–2/month |
| Heavy editing session (50 edits) | ~$1–3 |

> OpenAI charges by tokens. Each edit sends ~5KB of JSON + your instruction and receives ~5KB back. At GPT-4o pricing (~$2.50/M input, $10/M output), each edit costs roughly 1–5 cents.

### Ollama (Local)

| Item | Cost |
|------|------|
| Software | Free |
| Models | Free |
| API calls | Free |
| Electricity | ~$0.01/edit |

### GitHub Pages + Actions

| Item | Cost |
|------|------|
| Hosting | Free |
| CI/CD (2,000 min/month) | Free |
| Custom domain (optional) | ~$12/year |

**Total monthly cost for typical use: $1–3** (just OpenAI API).

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────┐
│              JM AI ADMIN — QUICK REFERENCE           │
├─────────────────────────────────────────────────────┤
│                                                      │
│  OPEN ADMIN:  /admin/  (on your GitHub Pages URL)   │
│                                                      │
│  EDIT:  Type what to change → Review diff → Apply   │
│                                                      │
│  TABS:  Home | About | Services | Contact           │
│                                                      │
│  PREVIEW:  Close chat for full-width production view│
│                                                      │
│  LOGOUT:  🚪 button clears all stored keys          │
│                                                      │
│  UNDO:  GitHub repo → Commits → Revert              │
│                                                      │
│  DEPLOY TIME:  ~1 minute after Apply & Publish      │
│                                                      │
│  COST:  ~$0.01-0.05 per edit (OpenAI GPT-4o)       │
│                                                      │
└─────────────────────────────────────────────────────┘
```
