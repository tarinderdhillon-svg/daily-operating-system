// Vercel serverless handler for Express app
// This file is automatically detected by Vercel as a serverless function handler.
// It loads the compiled Express app from the build output and re-exports it.

const path = require('path');

// After build, this file is at /api/index.js and the app is at /artifacts/api-server/dist/index.js
// __dirname here is the /api directory on the deployed container
const app = require(path.join(__dirname, '..', 'artifacts', 'api-server', 'dist', 'index.js')).default;

// Vercel routing strategy:
// 1. This function handler ONLY runs for /api/* routes
// 2. Static files from /public are served automatically by Vercel's static asset handler
// 3. For SPA routes (e.g., /dashboard, /tasks), Vercel serves /public/index.html
// 4. React Router handles all client-side navigation

module.exports = app;
