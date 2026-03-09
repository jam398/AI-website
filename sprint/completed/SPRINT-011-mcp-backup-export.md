# SPRINT-011 — MCP Tool: Backup & Export

**Status:** 📋 Planned  
**Priority:** High  
**Created:** 2026-03-06  
**Depends on:** SPRINT-008 (MCP Bridge)

## Tool Definition

| Property | Value |
|---|---|
| **Name** | `backup_site` |
| **Description** | Creates a timestamped backup of site.json and optionally exports it |
| **Input** | `{ action: "backup" | "list" | "restore", backupId?: string }` |
| **Output** | Backup confirmation, list of backups, or restore result |

## What It Does

### `backup` action
- Reads current site.json from GitHub
- Saves a timestamped copy to a `backups/` branch or `_backups/` folder
- Returns backup ID and timestamp

### `list` action
- Shows all available backups with timestamps and sizes
- Shows what changed in each (commit message)

### `restore` action
- Takes a backup ID
- Shows diff between current and backup version
- On confirmation, publishes the backup version

## Example Interaction

```
You: "Backup my site before I make big changes"
AI: calls backup_site({ action: "backup" })
AI: "✓ Backup created!
     - ID: backup-2026-03-06-1430
     - Size: 4.2 KB
     - You can restore anytime with 'restore my last backup'"
```

```
You: "I messed up, restore my last backup"
AI: calls backup_site({ action: "list" })
AI: calls backup_site({ action: "restore", backupId: "backup-2026-03-06-1430" })
AI: "Here's what will change: [shows diff]
     Want me to restore?"
```

## Acceptance Criteria

- [ ] Tool registered in MCP server with proper schema
- [ ] Creates timestamped backups of site.json
- [ ] Lists all available backups
- [ ] Restores from any backup with diff preview
- [ ] Stores backups in Git (branch or folder)
- [ ] Works via chatbox (through bridge) and Claude Desktop
