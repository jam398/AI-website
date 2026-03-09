# SPRINT-013 — MCP Tool: Lighthouse Audit

**Status:** 📋 Planned  
**Priority:** Medium  
**Created:** 2026-03-06  
**Depends on:** SPRINT-008 (MCP Bridge)

## Tool Definition

| Property | Value |
|---|---|
| **Name** | `run_lighthouse_audit` |
| **Description** | Runs a full Google Lighthouse audit on the live site for performance, accessibility, best practices, and SEO |
| **Input** | `{ url?: string, categories?: string[] }` — defaults to live site URL, all categories |
| **Output** | Scores per category, detailed issues, recommendations |

## What It Does

- Uses Google PageSpeed Insights API (free, no key needed for basic usage) or runs Lighthouse CLI
- Audits 4 categories:
  - **Performance** — load time, largest contentful paint, cumulative layout shift
  - **Accessibility** — color contrast, alt text, ARIA labels, keyboard nav
  - **Best Practices** — HTTPS, no console errors, image aspect ratios
  - **SEO** — meta tags, crawlability, mobile-friendly
- Returns overall scores (0-100) per category
- Lists specific issues with severity and fix suggestions
- Can compare scores over time (before/after changes)

## Example Interaction

```
You: "Run a full audit on my site"
AI: calls run_lighthouse_audit tool
AI: "Lighthouse Audit Results for jam398.github.io/AI-website:

     📊 Performance:    92/100 ✓
     ♿ Accessibility:   88/100 ⚠
     ✅ Best Practices:  95/100 ✓
     🔍 SEO:            82/100 ⚠

     Top issues:
     1. ⚠ Accessibility: Color contrast ratio 3.8:1 on footer text (needs 4.5:1)
     2. ⚠ SEO: Meta description missing on /about page
     3. ⚠ Accessibility: Button lacks accessible name
     4. ℹ Performance: Images not in next-gen format

     Want me to fix the accessibility and SEO issues?"
```

## API Options

| Option | Pros | Cons |
|---|---|---|
| **PageSpeed Insights API** | Free, no install, HTTPS from browser | Rate limited, no custom config |
| **Lighthouse CLI** | Full control, offline | Needs Node.js, runs locally |
| **WebPageTest API** | Very detailed, real devices | Needs API key |

**Recommendation:** PageSpeed Insights API for the MCP tool (works via HTTP, no install). Falls back to Lighthouse CLI if running locally.

## Acceptance Criteria

- [ ] Tool registered in MCP server with proper schema
- [ ] Returns scores for all 4 Lighthouse categories
- [ ] Lists specific issues with severity levels
- [ ] Provides actionable fix suggestions
- [ ] Uses PageSpeed Insights API (free tier)
- [ ] Works via chatbox (through bridge) and Claude Desktop
