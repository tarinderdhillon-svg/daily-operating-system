# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Daily Operating System (Daily-OS) is a task/project management dashboard application built with Express.js backend and vanilla JavaScript frontend. The project uses a monorepo structure with pnpm workspaces, with the primary application in `/artifacts/api-server/`.

## Build and Development Commands

### Building the API Server
```bash
cd artifacts/api-server
pnpm run build
```
- Uses esbuild to bundle the Express app into CommonJS format for Vercel serverless functions
- Outputs to `dist/` directory with source maps
- Automatically copies `public/` directory to `dist/public/` for static file serving
- Externalizes many packages (native modules, cloud SDKs, etc.) to avoid bundling issues

### Running Locally
```bash
cd artifacts/api-server
npm start  # or node dist/index.js
```

### Type Checking
```bash
pnpm typecheck  # Check all workspace types
```

## Architecture

### Core Application Structure (`/artifacts/api-server/src/`)

**app.ts** - Main Express application setup:
- Configures CORS, JSON/URL-encoded middleware, pino-http logging
- Serves static files from `public/` directory (frontend dashboard)
- Mounts API routes at `/api` prefix
- Uses middleware-based catch-all routing to serve `index.html` for SPA (Single Page Application) navigation
- Uses `process.cwd()` for path resolution (more reliable in serverless environments than `__dirname`)

**index.ts** - Entry point that:
- Starts Express server on configured PORT
- Initializes daily learning scheduler (runs at 5:30 AM UK time via node-cron)

**routes/** - API endpoints:
- `health.ts` - Health check endpoint at `/api/healthz`
- `tasks.ts`, `calendar.ts`, `chat.ts`, `learning.ts`, etc. - Domain-specific endpoints

### Frontend Dashboard (`/artifacts/api-server/public/`)

**index.html** - Single Page Application with tabs for:
- Dashboard (quick stats overview)
- Tasks (task management)
- Projects (project tracking)
- Calendar (calendar events)
- Chat (AI assistant)
- Learning (daily lessons)

**script.js** - Vanilla JavaScript (~400 lines):
- Handles tab navigation and UI interactions
- Fetches data from API endpoints: `/api/tasks`, `/api/projects`, `/api/calendar`, `/api/chat`, `/api/learning`
- Renders DOM elements dynamically

**styles.css** - Modern responsive design (~300 lines):
- Purple gradient header with blue/green accent colors
- Fully responsive mobile/tablet/desktop layouts
- CSS custom properties for theming

## Build Process (`build.mjs`)

The build configuration:
1. Bundles TypeScript to CommonJS using esbuild
2. Includes source maps for debugging
3. Externalizes native modules and cloud SDKs (sharp, better-sqlite3, @aws-sdk/*, @google-cloud/*, etc.)
4. Uses esbuildPluginPino to handle pino logging worker files
5. **Critically**: Copies the `public/` directory to `dist/public/` after bundling
   - This ensures static files are available in the Vercel deployment
   - Without this step, frontend assets will not be served

## Path Resolution in Serverless Environments

**Important**: Vercel's serverless functions have different working directory behavior than local Node.js.

- **Local development**: Use relative paths from project root
- **Vercel deployment**: Use `process.cwd()` for reliable path resolution
  - `__dirname` may point to unexpected locations in bundled CommonJS
  - `process.cwd()` reliably points to the deployment root where `dist/public/` exists

Current app.ts uses:
```typescript
const publicPath = path.join(process.cwd(), "public");
app.use(express.static(publicPath));
```

## SPA Routing

The application uses middleware-based catch-all routing for Single Page Application support:
```typescript
app.use("/api", router);  // API routes

app.use((req, res) => {   // Catch-all for SPA
  const indexPath = path.join(publicPath, "index.html");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.sendFile(indexPath);
});
```

**Note**: Avoid route patterns like `app.get("*")` or `app.get(/.*/)` as Express v5's path-to-regexp parser rejects them. Middleware approach is more reliable.

## Vercel Deployment

- Builds via the command in `package.json` (runs `pnpm run build` which triggers `build.mjs`)
- Deploys the bundled `dist/` directory as a serverless function
- Static files from `public/` must be copied to `dist/public/` during build (handled by `build.mjs`)
- Environment variables needed: GOOGLE_API_KEY, NOTION_TOKEN, MICROSOFT_GRAPH_TOKEN (check `.env.local`)

## Current Known Issues & Troubleshooting

### Static Files Not Serving
- Check that `build.mjs` includes the `cp()` command to copy `public/` to `dist/public/`
- Verify `public/` directory exists with expected files (index.html, script.js, styles.css)
- Confirm path resolution uses `process.cwd()` not `__dirname`

### FUNCTION_INVOCATION_FAILED Errors on Vercel
- Check Vercel runtime logs for actual error stack trace (click on failed requests)
- Verify environment variables are configured in Vercel dashboard
- Test locally with `node dist/index.js` before deploying
- Check if any middleware is failing on startup (logger, CORS, etc.)
- Ensure all imported dependencies are available (no missing npm packages)

### API Routes Returning 404
- Verify routes are mounted at `/api` prefix in app.ts
- Check that route files are being imported in `/routes/index.ts`
- Confirm endpoints exist and are being called from frontend with correct paths

### Build Failures
- Run `pnpm run build` locally to test build process before pushing
- Check for missing dependencies or type errors
- Verify esbuild external modules list includes any newly added native dependencies
- Ensure `public/` directory exists before running build

## Testing the Deployment

Once deployed to Vercel:
1. Test health endpoint: `GET /api/healthz` should return `{ status: "ok" }`
2. Test frontend: `GET /` should return dashboard HTML
3. Test API endpoints: Each tab should load data from corresponding endpoint
4. Check browser console for JavaScript errors
5. Verify all environment variables are accessible to the app
