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
| **No-code editing** | Browser-based CMS at `/admin` (Sveltia CMS, Decap-compatible) |
| **CI/CD** | GitHub Actions — auto-builds on every push to `main` |
| **Optional AI helper** | Local Ollama script in `tools/` (no cloud subscription) |

---

## One-Minute Setup (for classmates)

> **Prerequisites:** a browser + a free GitHub account. No local installs required.

### 1. Fork the repo

Click **Fork** on the GitHub repo page. This creates your own copy.

### 2. Configure the CMS backend

Open `admin/config.yml` in GitHub's web editor and change this line:

```yaml
repo: OWNER/REPO          # ← CHANGE to your-username/your-repo
```

For example: `repo: janedoe/jm-ai-consulting`

Commit the change.

### 3. Enable GitHub Pages

1. Go to your fork's **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. That's it — the included workflow handles the rest.

### 4. Wait for the first deploy

Go to the **Actions** tab. You should see a workflow running. When it finishes (≈ 1 min), your site is live at:

```
https://YOUR-USERNAME.github.io/YOUR-REPO/
```

### 5. Update content

**Option A — GitHub web editor (fastest start)**

1. Open `content/site.json` in GitHub.
2. Click the pencil icon to edit.
3. Change any text (headline, service description, etc.).
4. Commit → GitHub Actions rebuilds → site updates in ~1 minute.

**Option B — CMS at `/admin` (richer editing UI)**

See the [CMS Setup](#cms-setup-admin) section below.

---

## Repository Structure

```
.
├── content/
│   └── site.json              ← SINGLE SOURCE OF TRUTH (all page content)
├── src/
│   ├── _includes/
│   │   └── base.njk           ← Base HTML layout
│   ├── index.njk              ← Home page template
│   ├── about.njk              ← About page template
│   ├── services.njk           ← Services page template
│   ├── contact.njk            ← Contact page template
│   └── css/
│       └── style.css          ← Stylesheet
├── admin/
│   ├── index.html             ← CMS entry point
│   └── config.yml             ← CMS field definitions
├── public/
│   └── .nojekyll              ← Tells GitHub not to use Jekyll
├── tools/
│   └── ollama-helper.py       ← Optional local AI copy assistant
├── .github/workflows/
│   └── deploy.yml             ← GitHub Actions: build + deploy
├── .eleventy.js               ← Eleventy configuration
├── package.json               ← Node dependencies
├── README.md                  ← This file
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

## CMS Setup (`/admin`)

The `/admin` route provides a visual editor that commits changes to `content/site.json` via GitHub's API.

### Default CMS: Sveltia CMS

[Sveltia CMS](https://github.com/sveltia/sveltia-cms) is an open-source, Decap CMS-compatible editor. It supports **GitHub PKCE authentication** — meaning you do **not** need to deploy an external OAuth proxy server.

**Setup steps:**

1. Go to **GitHub Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Fill in:
   - **Application name:** `JM AI Consulting CMS` (any name)
   - **Homepage URL:** `https://YOUR-USERNAME.github.io/YOUR-REPO/`
   - **Authorization callback URL:** `https://YOUR-USERNAME.github.io/YOUR-REPO/admin/`
3. Click **Register application**.
4. Copy the **Client ID** (you do **not** need the client secret for PKCE).
5. Update `admin/config.yml` — make sure `repo` is set to your username/repo.
6. Visit `https://YOUR-USERNAME.github.io/YOUR-REPO/admin/` and click **Login with GitHub**.

> Sveltia CMS uses the Client ID from your OAuth App registration automatically via the PKCE flow. No server-side secret exchange is needed.

### Alternative CMS: Decap CMS

If you prefer Decap CMS, edit `admin/index.html`:
- Comment out the Sveltia CMS script.
- Uncomment the Decap CMS script.

Decap CMS requires an **OAuth proxy server** to exchange auth codes. Options:

- **Cloudflare Workers** (free tier — 100k requests/day)
- **Netlify Functions** (free tier)
- Any server that implements the [Decap OAuth spec](https://decapcms.org/docs/external-oauth-clients/)

Add `base_url` to `admin/config.yml`:

```yaml
backend:
  name: github
  repo: your-username/your-repo
  branch: main
  base_url: https://your-oauth-proxy.workers.dev
```

### Local CMS testing (requires Node.js)

```bash
npm install
npx decap-server &      # Starts local auth proxy on port 8081
npm start                # Starts 11ty dev server on port 8080
```

Uncomment `local_backend: true` in `admin/config.yml` for this mode.

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

### CMS login fails

- **Sveltia CMS:** Make sure you registered a GitHub OAuth App with the correct callback URL (`https://…/admin/`). The trailing slash matters.
- **Decap CMS:** Ensure your OAuth proxy is running and `base_url` is correct in `admin/config.yml`.
- **Both:** Make sure `repo` in `admin/config.yml` matches your actual GitHub username and repo name.

### CMS saves but site doesn't update

- The CMS commits to `main` by default. Verify the commit appeared in your repo.
- Check the **Actions** tab — a new workflow run should trigger within seconds.
- Deployments typically take under 1 minute.

### "Template render error" during build

- You probably have a syntax error in `content/site.json`. Validate it at [jsonlint.com](https://jsonlint.com/).
- Make sure all string values are properly escaped (no unescaped quotes or backslashes).

---

## Optional: Ollama Copy Helper

> **This is entirely optional.** The required no-code update path is the CMS or GitHub's web editor.

A Python script in `tools/ollama-helper.py` lets you use a **local LLM** (via [Ollama](https://ollama.com/)) to rewrite content in `site.json` using natural language instructions.

**Requirements (local machine only):**
- Python 3.8+
- Ollama running locally (`http://localhost:11434`)
- A model pulled (e.g., `ollama pull llama3`)

**Usage:**

```bash
cd tools
python ollama-helper.py
```

The tool will:
1. Load `content/site.json`
2. Ask you for an instruction (e.g., "Make the headline more formal")
3. Send the request to your local Ollama
4. Show a before/after diff
5. Ask for confirmation before writing
6. Optionally commit and push the change

See `tools/ollama-helper.py` header comments for full details.

---

## License

This project is provided as a proof-of-concept for educational purposes.
