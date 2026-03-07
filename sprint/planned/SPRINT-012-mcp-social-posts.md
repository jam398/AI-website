# SPRINT-012 — MCP Tool: Social Media Post Generator

**Status:** 📋 Planned  
**Priority:** Medium  
**Created:** 2026-03-06  
**Depends on:** SPRINT-008 (MCP Bridge)

## Tool Definition

| Property | Value |
|---|---|
| **Name** | `generate_social_post` |
| **Description** | Generates social media posts from site content for LinkedIn, Twitter/X, or other platforms |
| **Input** | `{ platform: "linkedin" | "twitter" | "facebook", topic?: string, page?: string, tone?: string }` |
| **Output** | Generated post text, hashtags, character count |

## What It Does

- Reads site content (specific page or all) for context
- Generates platform-appropriate posts:
  - **LinkedIn** — professional, longer form (up to 3000 chars), story-driven
  - **Twitter/X** — concise (280 chars), punchy, with hashtags
  - **Facebook** — conversational, mid-length
- Includes relevant hashtags
- Adapts tone based on user preference (professional, casual, thought-leader)
- Can generate multiple variations to choose from

## Example Interaction

```
You: "Write a LinkedIn post about my AI consulting services"
AI: calls generate_social_post({ platform: "linkedin", page: "services" })
AI: "Here's a LinkedIn post:

     🤖 AI isn't just for tech giants anymore.
     
     Small and mid-size businesses are using AI to automate workflows,
     make smarter decisions, and unlock growth — without hiring a
     full data science team.
     
     At JM AI Consulting, I help businesses:
     → Build their first AI strategy
     → Implement practical automation
     → Train teams to work with AI tools
     
     Ready to explore what AI can do for your business?
     Let's talk. ✉️ jose--addiel@hotmail.com
     
     #AIConsulting #ArtificialIntelligence #BusinessAutomation
     
     (1,847 characters — well within LinkedIn's limit)
     
     Want me to adjust the tone or create a Twitter version?"
```

## Acceptance Criteria

- [ ] Tool registered in MCP server with proper schema
- [ ] Generates posts for LinkedIn, Twitter, Facebook
- [ ] Uses actual site content as source material
- [ ] Includes character count and platform limits check
- [ ] Supports tone customization
- [ ] Generates hashtags relevant to consulting/AI
- [ ] Works via chatbox (through bridge) and Claude Desktop
