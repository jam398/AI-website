# SPRINT-010 — MCP Tool: GitHub Deploy Status

**Status:** 📋 Planned  
**Priority:** High  
**Created:** 2026-03-06  
**Depends on:** SPRINT-008 (MCP Bridge)

## Tool Definition

| Property | Value |
|---|---|
| **Name** | `check_deploy_status` |
| **Description** | Checks GitHub Actions workflow status to verify if the latest deploy succeeded |
| **Input** | `{ limit?: number }` — how many recent deploys to show (default 5) |
| **Output** | Deploy status, timestamp, commit message, duration, URL |

## What It Does

- Calls GitHub Actions API (`/repos/{owner}/{repo}/actions/runs`)
- Returns the latest workflow runs with status (success/failure/in-progress)
- Shows commit message, timestamp, and duration for each
- Can check if a specific commit has been deployed
- Reports the live site URL and when it was last updated

## Example Interaction

```
You: "Did my last change go live?"
AI: calls check_deploy_status tool
AI: "✓ Your last deploy succeeded!
     - Commit: 'AI edit: change headline to Hello World'
     - Deployed: 2 minutes ago
     - Build time: 45 seconds
     - Live at: https://jam398.github.io/AI-website/"
```

```
You: "Show me my last 3 deploys"
AI: calls check_deploy_status({ limit: 3 })
AI: "Here are your last 3 deploys:
     1. ✓ 'AI edit: update email' — 5 min ago (42s)
     2. ✓ 'AI edit: change headline' — 1 hour ago (38s)
     3. ✗ 'AI edit: add service' — 2 hours ago (FAILED)"
```

## Acceptance Criteria

- [ ] Tool registered in MCP server with proper schema
- [ ] Reads GitHub Actions API for workflow runs
- [ ] Shows success/failure/in-progress status
- [ ] Includes commit message, timestamp, duration
- [ ] Reports live site URL
- [ ] Works via chatbox (through bridge) and Claude Desktop
