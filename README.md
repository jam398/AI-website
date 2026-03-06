# JM AI Consulting — Website

A professional, multi-page website for **JM AI Consulting** (Jose Martinez), built with [Eleventy](https://www.11ty.dev/) and deployable to **GitHub Pages** — with **no monthly subscriptions**.

All site content lives in **one file** (`content/site.json`). Update that file and the site rebuilds automatically.

---

## Quick Overview

| Feature | Detail |
|---|---|
| **Static generator** | Eleventy (11ty) v2 |
| **Hosting** | GitHub Pages (free) |
| **Content source** | `content/site.json` — single source of truth |
| **Content editing** | AI-powered admin panel at `/admin` (GPT-4o chatbot) |
| **CI/CD** | GitHub Actions — auto-builds on every push to `main` |
| **Optional local AI** | Ollama terminal tool in `tools/` (free, offline) |

> 📖 **Full usage guide:** See [MANUAL.md](MANUAL.md) for detailed instructions on using the admin panel and Ollama tool.

---

## One-Minute Setup (for classmates)

> **Prerequisites:** a browser + a free GitHub account. No local installs required.

### 1. Fork the repo

Click **Fork** on the GitHub repo page. This creates your own copy.

### 2. Enable GitHub Pages

1. Go to your fork's **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. That's it — the included workflow handles the rest.

### 3. Wait for the first deploy

Go to the **Actions** tab. You should see a workflow running. When it finishes (≈ 1 min), your site is live at:

```
https://YOUR-USERNAME.github.io/YOUR-REPO/
```

### 4. Update content

**Option A — AI Admin Panel at `/admin` (recommended)**

See the [Admin Panel Setup](#admin-panel-setup-admin) section below, or the full [MANUAL.md](MANUAL.md).

**Option B — GitHub web editor (no setup needed)**

1. Open `content/site.json` in GitHub.
2. Click the pencil icon to edit.
3. Change any text (headline, service description, etc.).
4. Commit → GitHub Actions rebuilds → site updates in ~1 minute.

---

## Repository Structure

```
.
├── content/
│   └── site.json              ← SINGLE SOURCE OF TRUTH (all page content)
├── src/
│   ├── _includes/
│   │   └── base.njk           ← Base HTML layout (+ favicon, OG meta tags)
│   ├── index.njk              ← Home page template
│   ├── about.njk              ← About page template
│   ├── services.njk           ← Services page template
│   ├── contact.njk            ← Contact page template
│   └── css/
│       └── style.css          ← Stylesheet
├── admin/
│   └── index.html             ← AI admin panel (GPT-4o chatbot + GitHub publish)
├── public/
│   ├── .nojekyll              ← Tells GitHub not to use Jekyll
│   └── favicon.svg            ← Site favicon
├── tools/
│   └── ollama-helper.py       ← Optional local AI content editor (Ollama)
├── .github/workflows/
│   └── deploy.yml             ← GitHub Actions: build + deploy
├── .eleventy.js               ← Eleventy configuration
├── package.json               ← Node dependencies
├── README.md                  ← This file
├── MANUAL.md                  ← Full user guide for admin panel + Ollama tool
└── DEMO.md                    ← Proof-of-concept walkthrough
```

---

## Content: The Single Source of Truth

**`content/site.json`** controls everything visitors see:

| Key | Controls |
|---|---|
| `meta` | Site title, description, consultant name, email |
| `nav` | Navigation menu items |
| `home` | Headline, subheadline, services summary, how-we-work steps, CTA |
| `about` | Bio, working style, focus areas, industries |
| `services` | Three service sections with bullets + deliverables |
| `contact` | Email, suggested email template |
| `footer` | Copyright + tagline |

**To change anything on the site, edit this file.** The HTML templates read from it automatically.

---

## Admin Panel Setup (`/admin`)

The `/admin` route provides an AI-powered content editor that lets you update your site using natural language. It uses **OpenAI GPT-4o** to interpret your instructions and commits changes to `content/site.json` via the GitHub API.

**What you need:**
- An **OpenAI API key** (~$5 credit) — [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- A **GitHub Fine-grained Personal Access Token** with Contents: Read and write on your repo — [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)

**How it works:**
1. Open `https://YOUR-USERNAME.github.io/YOUR-REPO/admin/`
2. Enter your OpenAI API key and GitHub token (stored in your browser only)
3. Type what you want to change in plain English (e.g., "Make the headline shorter")
4. Review the diff (red = removed, green = added)
5. Click **Apply & Publish** — the site rebuilds in ~1 minute

> 📖 **For the complete guide** with screenshots, tips, and troubleshooting, see [MANUAL.md](MANUAL.md).

---

## Local Development (optional)

If you want to preview the site locally before pushing:

```bash
# Requires Node.js 18+
npm install
npm start
# → opens http://localhost:8080
```

---

## Troubleshooting

### Site shows 404 after enabling Pages

- Make sure **Settings → Pages → Source** is set to **GitHub Actions** (not "Deploy from a branch").
- Check the **Actions** tab for build errors.

### CSS or links are broken

The deploy workflow auto-detects whether you need a path prefix (for project sites like `username.github.io/repo-name`). If links are still broken:

1. Check that the workflow ran successfully.
2. Ensure you didn't hard-code any absolute paths in `site.json`.

### Admin panel: "OpenAI API key is invalid"

- Verify your key starts with `sk-` and your OpenAI account has credit.
- Check [platform.openai.com/usage](https://platform.openai.com/usage).

### Admin panel: "GitHub token is invalid"

- Create a new **Fine-grained PAT** at [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new).
- Set **Repository access** to your specific repo and **Contents** permission to **Read and write**.

### Changes published but site doesn't update

- Wait 1–2 minutes for GitHub Actions to finish.
- Hard-refresh with `Ctrl+Shift+R`.
- Check the **Actions** tab for build errors.

### "Template render error" during build

- You probably have a syntax error in `content/site.json`. Validate it at [jsonlint.com](https://jsonlint.com/).
- Make sure all string values are properly escaped (no unescaped quotes or backslashes).

> 📖 **More troubleshooting:** See [MANUAL.md](MANUAL.md#troubleshooting) for additional solutions.

---

## Optional: Ollama Copy Helper

> **This is entirely optional.** The primary editing method is the AI admin panel at `/admin`.

A Python script in `tools/ollama-helper.py` lets you use a **local LLM** (via [Ollama](https://ollama.com/)) to rewrite content in `site.json` using natural language instructions — completely free and offline.

**Requirements (local machine only):**
- Python 3.8+
- Ollama running locally (`http://localhost:11434`)
- A model pulled (e.g., `ollama pull qwen3:8b`)

**Usage:**

```bash
cd tools
python ollama-helper.py            # uses qwen3:8b (default)
python ollama-helper.py gemma3:1b  # faster, lower quality
```

The tool will:
1. Load `content/site.json`
2. Ask you for an instruction (e.g., "Make the headline more formal")
3. Send the request to your local Ollama
4. Show a before/after diff
5. Ask for confirmation before writing
6. Optionally commit and push the change

> 📖 **Full details:** See [MANUAL.md](MANUAL.md#alternative-ollama-terminal-tool) for model recommendations and troubleshooting.

---

## License

This project is provided as a proof-of-concept for educational purposes.
