# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Daily Operating System (Daily-OS) is a task/project management dashboard application built with an Express.js backend and vanilla JavaScript frontend. The project uses a monorepo structure with pnpm workspaces; the primary application lives in `/artifacts/api-server/`.

## Build and Development Commands

```bash
# Build the entire workspace (runs api-server + scripts)
pnpm run build

# Build only the api-server
cd artifacts/api-server && pnpm run build

# Run locally (after build)
cd artifacts/api-server && node dist/index.js

# Type-check all workspaces
pnpm typecheck
```

The build (`build.mjs`) uses esbuild to bundle TypeScript → CommonJS, externalises native/cloud packages, runs pino's transport plugin, and copies `public/` → `dist/public/` for static file serving.

## Architecture

### Entry Points

| File | Purpose |
|------|---------|
| `artifacts/api-server/src/index.ts` | Server entry: exports app for Vercel, starts local listener (non-production only), registers 5:30 AM cron job |
| `artifacts/api-server/src/app.ts` | Express app factory: middleware, static files, API routes, root `GET /` handler |
| `api/index.js` | **Vercel serverless handler** — requires the compiled app from `artifacts/api-server/dist/index.js` and re-exports it |

### API Routes (`artifacts/api-server/src/routes/`)

All routes are mounted at `/api` prefix in `app.ts`:
- `health.ts` → `GET /api/healthz`
- `tasks.ts`, `calendar.ts`, `chat.ts`, `learning.ts`, `briefing.ts`, `transcribe.ts`

### Frontend (`artifacts/api-server/public/`)

Single-page vanilla JS app with tabs: Dashboard, Tasks, Projects, Calendar, Chat, Learning. Static assets are served by `express.static()` pointed at `dist/public/` in the built output.

## Vercel Deployment Structure

```
/                           ← project root deployed to Vercel
├── api/index.js            ← Vercel auto-detects as a serverless function handler
├── artifacts/api-server/
│   └── dist/               ← built by pnpm run build during Vercel's build step
│       ├── index.js        ← compiled Express app (exported as .default)
│       └── public/         ← static frontend assets
└── vercel.json             ← { "buildCommand": "pnpm run build" }
```

**Handler pattern** (`api/index.js`):
```js
const app = require('../artifacts/api-server/dist/index.js').default;
module.exports = app;
```

The handler must use a path relative to `__dirname` (the `/api` directory on the deployed container) to locate the compiled app. `process.cwd()` is unreliable here because Vercel resolves it to the function's isolated directory, not the project root.

### Path Resolution in `app.ts`

Static files are resolved using:
```typescript
const publicPath = path.join(__dirname || process.cwd(), "public");
```
After esbuild, `dist/index.js` sits alongside `dist/public/`, so `__dirname` correctly resolves to `dist/` at runtime.

### Express v5 Routing Constraints

Express v5's path-to-regexp parser **rejects** wildcard patterns like `app.get("*")` or `app.get(/.*/)`. The app avoids these entirely:
- Static files → `express.static(publicPath)`
- Root HTML → explicit `app.get("/", ...)`
- No SPA catch-all middleware (removed to prevent path-to-regexp crashes)

## Known Deployment Issues

### FUNCTION_INVOCATION_FAILED

This error appears in the Vercel error page when the serverless function crashes *before* it can handle a request. Root causes seen in this project:

1. **Path resolution failure** — `api/index.js` cannot `require()` the compiled app. Happens when the path is constructed incorrectly. Always use `__dirname`-relative paths from the `/api` directory.
2. **Module crash on load** — The compiled app throws during module initialisation (e.g. missing env var, Express v5 route parse error).
3. **Wrong `vercel.json` schema** — The `public` key expects a boolean, not a path string.
4. **Incorrect `outputDirectory`** — Setting `outputDirectory` to `artifacts/api-server/dist` causes Vercel to look for an entrypoint inside it rather than using `api/index.js`.

**Debugging steps:**
1. Check runtime logs in Vercel dashboard → Deployment → Logs.
2. If no runtime logs appear at all, the crash is at module load time.
3. Test the handler locally: `node -e "require('./api/index.js')"` — should print no errors.
4. Run `node dist/index.js` from `artifacts/api-server/` to test the compiled app independently.

### Environment Variables

Required in Vercel dashboard (not committed to repo):
- `GOOGLE_API_KEY`
- `NOTION_TOKEN`
- `MICROSOFT_GRAPH_TOKEN`
- `OPENAI_API_KEY` (optional; learning route uses lazy initialisation to avoid crash if absent)

## Workspace Layout

```
artifacts/
  api-server/     ← main application (TypeScript, Express v5)
    src/
      app.ts
      index.ts
      routes/
      lib/
    public/       ← frontend (HTML/CSS/JS)
    build.mjs     ← esbuild config
    dist/         ← build output (gitignored)
  daily-os/       ← excluded from Vercel via .vercelignore
  mockup-sandbox/ ← excluded from Vercel via .vercelignore
api/
  index.js        ← Vercel serverless handler
vercel.json
.vercelignore
```
