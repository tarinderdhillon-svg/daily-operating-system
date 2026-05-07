# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Daily Operating System (Daily-OS) is a personal productivity dashboard with a Kanban task board, calendar, AI chat, daily briefing, and AI learning module. Built with Express.js v5 backend and React 19 (Tailwind CSS + Radix UI) frontend, deployed as a Vercel serverless function. Data lives in Notion; AI features use Google Gemini (chat, briefing, learning) and OpenAI Whisper (transcription). Calendar events integrated via Microsoft Graph API.

## Build and Development Commands

```bash
# Build the entire workspace (Vite React app, then Express api-server)
pnpm run build

# Build only the React app (Vite)
cd artifacts/daily-os && pnpm run build

# Build only the api-server
cd artifacts/api-server && pnpm run build

# Run locally (after build)
cd artifacts/api-server && node dist/index.js

# Type-check all workspaces
pnpm typecheck

# Dev server (api-server with ts-node watch mode)
pnpm --filter @workspace/api-server run dev

# Dev server (React app with Vite hot module replacement)
cd artifacts/daily-os && pnpm run dev
```

**Build Workflow**:
1. Vite bundles React app to root `/public` directory with code splitting (vendor-react, vendor-query, vendor-icons, vendor-date chunks)
2. esbuild bundles Express app: TypeScript → CommonJS, externalises native/cloud packages, runs pino's transport plugin
3. Build output copied to `artifacts/api-server/dist/` for Vercel deployment

**Local Build Issues**:
If you get errors about missing native modules (`@rollup/rollup-darwin-arm64`, `lightningcss`, etc.) during local builds:
- These are optional dependencies for Vite/Rollup
- Run `rm -rf node_modules pnpm-lock.yaml && pnpm install` to reinstall with proper native module detection
- Vercel's build environment handles these automatically, so local build failures don't block deployment

## Architecture

### Entry Points

| File | Purpose |
|------|---------|
| `artifacts/api-server/src/index.ts` | Server entry: exports app for Vercel, starts local listener (non-production only), registers 5:30 AM UK cron for daily learning lesson |
| `artifacts/api-server/src/app.ts` | Express app factory: middleware, API routes, SPA fallback handler (serves `index.html` for non-API routes) |
| `api/index.js` | **Vercel serverless handler** — requires the compiled app from `artifacts/api-server/dist/index.js` and re-exports it |
| `artifacts/daily-os/src/main.tsx` | React entry point: mounts app to `#root` element |

### Frontend (React + Tailwind CSS + Radix UI)

Built with Vite, outputs to root `/public` directory. Six main tabs:
- **Dashboard**: summary of today's tasks, upcoming events, learning concept
- **Tasks**: Kanban board with columns (Not Started, In Progress, In Review, Done)
- **Projects**: list of all projects from Notion
- **Calendar**: today/tomorrow events from Microsoft Outlook
- **Chat**: natural language interface for creating/updating tasks
- **Learning**: AI-generated daily concept with refresh button

React Query (`@tanstack/react-query`) manages async state for all API calls. Components use Radix UI primitives (Dialog, Dropdown, etc.) styled with Tailwind.

### API Routes (`artifacts/api-server/src/routes/`)

All routes mounted at `/api` prefix:

| File | Endpoints |
|------|-----------|
| `health.ts` | `GET /api/healthz` |
| `tasks.ts` | `GET /api/tasks`, `POST /api/tasks`, `PATCH /api/tasks/:taskId`, `DELETE /api/tasks/:taskId` |
| `projects.ts` | `GET /api/projects` |
| `calendar.ts` | `GET /api/calendar` — today/tomorrow events via Microsoft Graph API (requires OAuth refresh token) |
| `briefing.ts` | `GET /api/briefing`, `POST /api/briefing` — AI-generated news (Gemini) |
| `chat.ts` | `POST /api/chat` — natural language task/schedule commands (Gemini, multi-turn) |
| `transcribe.ts` | `POST /api/transcribe` — Whisper audio transcription (multipart, `audio` field) |
| `learning.ts` | `GET /api/learning/concept`, `GET /api/learning/recap`, `POST /api/learning/answer`, `POST /api/learning/refresh` |

### Notion Schema

Tasks DB fields: `Name` (title), `Due Date` (date), `Priority` (select: Urgent/High/Medium/Low), `Status` (status: Not started/In progress/In Review/Done), `Notes` (rich_text), `Owner` (people), `Related Project` (relation).

Task categorisation logic:
- **Overdue**: `due_date < today`
- **Due Soon**: `due_date` within next 7 days
- **In Progress**: status = "In progress" with no imminent due date
- **Completed**: status = Done/Complete

### Chat Multi-Turn Protocol

`chat.ts` supports a pending-task continuation flow:
- If fields are missing, response returns `action_taken: "task_pending"` with `missing_fields` list
- Continuation turns prefix the body with `__PENDING_TASK__|{json}|user_reply:text`
- "none"/"n/a"/"skip" values are treated as field-skip signals

### Microsoft Graph API Integration (Calendar)

`lib/outlookCalendar.ts` provides:
- `getAccessToken(refreshToken)` — exchanges refresh token for access token via `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`
- `getCalendarView(accessToken, startDateTime, endDateTime)` — fetches events from `https://graph.microsoft.com/v1.0/me/calendarView`

Requires environment variables: `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_REFRESH_TOKEN`

## Vercel Deployment Structure

```
/                           ← project root deployed to Vercel
├── api/index.js            ← Vercel serverless handler
├── public/                 ← static React app (generated by Vite during build)
├── artifacts/
│   ├── daily-os/           ← React source (builds to root /public)
│   └── api-server/
│       └── dist/           ← compiled Express app
│           └── index.js    ← exported as .default
└── vercel.json             ← build command + rewrites config
```

**vercel.json rewrites**:
```json
"rewrites": [
  { "source": "/api/(.*)", "destination": "/api" },
  { "source": "/(.*)", "destination": "/index.html" }
]
```

This ensures:
- `/api/*` requests route to the Express function
- All other requests (including `/assets/*`, `/`) are served statically from `/public` without being bundled through the function

**Handler pattern** (`api/index.js`):
```js
const app = require('../artifacts/api-server/dist/index.js').default;
module.exports = app;
```

### Current Frontend Status

**IMPORTANT**: The React frontend (`artifacts/daily-os/`) is not currently deployed. The app uses the vanilla JS frontend in `artifacts/api-server/public/` instead.

**Why**: Deploying a React SPA through a Vercel serverless function (at `/api/index.js`) creates an architectural mismatch:
- Serving static files from a serverless function causes bundling/path issues
- Vercel's static asset handler and function routing don't cleanly separate for SPA + API patterns
- Previous attempts to integrate the React frontend caused function crashes

**Future Solution**: To activate the React frontend, either:
1. Host React on Netlify/Vercel static hosting + API separately
2. Switch to a platform like Railway/Render with full-stack support
3. Use Next.js to combine API and frontend in one codebase

For now, `app.ts` only mounts `/api` routes and falls back to serving static files. The React app exists and is buildable (`pnpm --filter @workspace/daily-os run build`) but is not included in Vercel deployments.

## Environment Variables

Required in Vercel dashboard (not committed):

| Variable | Used by |
|----------|---------|
| `NOTION_API_KEY` | All Notion routes (tasks, projects, learning) |
| `TASKS_PAGE_ID` | `tasks.ts` — Notion tasks DB ID |
| `PROJECTS_PAGE_ID` | `projects.ts` — Notion projects DB ID |
| `GOOGLE_API_KEY` | `chat.ts`, `briefing.ts`, `learning.ts` (Gemini) |
| `OPENAI_API_KEY` | `transcribe.ts` (Whisper) |
| `MICROSOFT_TENANT_ID` | `calendar.ts` — Azure AD tenant ID |
| `MICROSOFT_CLIENT_ID` | `calendar.ts` — Azure AD app client ID |
| `MICROSOFT_CLIENT_SECRET` | `calendar.ts` — Azure AD app secret |
| `MICROSOFT_REFRESH_TOKEN` | `calendar.ts` — long-lived refresh token for Outlook API |

## Known Deployment Issues

### SPA + Serverless Function Architectural Mismatch

**The Core Issue**: Serving a React SPA through a Vercel serverless function creates fundamental problems:

1. **Static File Serving**: Vercel's static handler and function routing don't cleanly separate when both are needed
2. **Module Bundling**: Files served through the function get transformed by Vercel's bundler (ESM → CommonJS), breaking browser code
3. **Path Resolution**: Distinguishing between "should be a static file" vs "should route to function" is ambiguous

**Current Workaround**: The React frontend (`artifacts/daily-os/`) is *not* deployed. Instead, the vanilla JS frontend in `artifacts/api-server/public/` is used.

### FUNCTION_INVOCATION_FAILED

Appears when the serverless function crashes. Root causes:

1. **Path resolution failure** — `api/index.js` cannot `require()` the compiled app. Always use `__dirname`-relative paths
2. **Module crash on load** — compiled app throws during module init (missing env var, Express v5 route parse error)
3. **Rewrites misconfiguration** — `vercel.json` destination must be valid

**Debugging steps**:
1. Check runtime logs: Vercel dashboard → Deployment → Logs
2. If no runtime logs, crash is at module load time (check build logs instead)
3. Test locally: `node -e "require('./api/index.js')"` should have no errors
4. Test compiled app: `node dist/index.js` from `artifacts/api-server/`

## Workspace Layout

```
artifacts/
  daily-os/       ← React app (Vite, outputs to ../public)
    src/
      main.tsx    ← entry point
      pages/
      components/
    vite.config.ts
  api-server/     ← Express backend
    src/
      app.ts      ← Express factory
      index.ts    ← server entry
      routes/     ← API endpoints
      lib/        ← utilities (logger, outlookCalendar)
    public/       ← old frontend (deprecated, replaced by daily-os)
    build.mjs     ← esbuild config
    dist/         ← build output (gitignored)
  mockup-sandbox/ ← excluded from Vercel
api/
  index.js        ← Vercel handler
public/           ← Vite output (generated at root, gitignored)
vercel.json
.vercelignore
```
