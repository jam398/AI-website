# SPRINT-014 — MCP Tool: Audio Transcription

**Status:** 📋 Planned  
**Priority:** Medium  
**Created:** 2026-03-06  
**Depends on:** SPRINT-008 (MCP Bridge)

## Tool Definition

| Property | Value |
|---|---|
| **Name** | `transcribe_audio` |
| **Description** | Transcribes audio/video files to text using OpenAI Whisper API |
| **Input** | `{ file?: string, url?: string, action?: "transcribe" | "summarize" | "to_content" }` |
| **Output** | Full transcript text, summary, or site content suggestions |

## What It Does

### `transcribe` action (default)
- Takes an audio file (mp3, wav, m4a, mp4, webm) or URL
- Sends to OpenAI Whisper API for transcription
- Returns full text transcript with timestamps

### `summarize` action
- Transcribes first, then summarizes key points
- Groups by topics discussed
- Highlights action items

### `to_content` action
- Transcribes audio, then converts relevant parts to site content
- E.g., transcribe a talk about your services → update services page
- Shows diff for approval before publishing

## Example Interactions

```
You: "Transcribe this meeting recording" [attaches audio]
AI: calls transcribe_audio({ action: "transcribe" })
AI: "Here's the transcript (12 minutes, 1,847 words):
     
     [00:00] Hi everyone, today we're discussing the AI strategy...
     [00:45] The first thing we need to look at is automation...
     [03:12] For the client portal, I'm thinking we should...
     ..."
```

```
You: "I recorded a pitch about my services, use it to update the services page"
AI: calls transcribe_audio({ action: "to_content" })
AI: "I transcribed your pitch and found content relevant to your services page.
     Here are the proposed changes: [shows diff card]"
```

## API Options

| Option | Cost | Quality | Speed |
|---|---|---|---|
| **OpenAI Whisper API** | $0.006/min | Excellent | Fast |
| **Local Whisper** | Free | Excellent | Slow (CPU) |
| **AssemblyAI** | $0.01/min | Excellent + speaker labels | Fast |
| **Deepgram** | $0.01/min | Good, real-time capable | Very fast |

**Recommendation:** OpenAI Whisper API — you already have an OpenAI key, excellent quality, cheap.

## File Upload Options

For the browser chatbox:
- Drag & drop audio file → sends to bridge → bridge calls Whisper API
- Paste a URL to audio/video → bridge downloads and transcribes

For Claude Desktop:
- Attach file directly in chat → MCP tool processes it

## Acceptance Criteria

- [ ] Tool registered in MCP server with proper schema
- [ ] Transcribes audio files (mp3, wav, m4a, mp4, webm)
- [ ] Supports URL input for remote audio/video
- [ ] Summarize mode extracts key points
- [ ] to_content mode converts transcript to site content proposals
- [ ] Uses OpenAI Whisper API
- [ ] File upload supported in chatbox (via bridge)
- [ ] Works via chatbox (through bridge) and Claude Desktop
