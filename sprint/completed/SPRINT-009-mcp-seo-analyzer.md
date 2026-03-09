# SPRINT-009 — MCP Tool: SEO Analyzer

**Status:** 📋 Planned  
**Priority:** High  
**Created:** 2026-03-06  
**Depends on:** SPRINT-008 (MCP Bridge)

## Tool Definition

| Property | Value |
|---|---|
| **Name** | `analyze_seo` |
| **Description** | Analyzes site content for SEO quality and provides actionable recommendations |
| **Input** | `{ page?: string }` — optional page name, defaults to all pages |
| **Output** | Score, issues list, recommendations |

## What It Checks

- **Title tag** — length (50-60 chars optimal), keyword presence
- **Meta description** — length (150-160 chars optimal), compelling copy
- **Headings** — H1 present, proper hierarchy (H1 → H2 → H3)
- **Content length** — minimum word count per page
- **Keyword density** — checks for key consulting/AI terms
- **CTA presence** — every page should have a call-to-action
- **Email/contact accessibility** — contact info easy to find
- **Image alt text** — when images are added later
- **Internal linking** — nav items link to all pages

## Example Interaction

```
You: "How's my SEO?"
AI: calls analyze_seo tool
AI: "Your SEO score is 78/100. Here are the issues:
     - Homepage title is 72 chars (should be under 60)
     - About page missing meta description
     - Services page has no H2 headings
     Want me to fix these?"
You: "Yes fix them all"
AI: calls edit_content → shows diff → you click Apply & Publish
```

## Acceptance Criteria

- [ ] Tool registered in MCP server with proper schema
- [ ] Scores each page 0-100
- [ ] Identifies specific issues with line-level detail
- [ ] Provides fix suggestions the AI can act on
- [ ] Works via chatbox (through bridge) and Claude Desktop
