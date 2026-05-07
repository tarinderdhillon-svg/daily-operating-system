// Vercel serverless handler for Express app
// This file is automatically detected by Vercel as a serverless function handler.
// It loads the compiled Express app from the build output and re-exports it.

const path = require('path');
const fs = require('fs');

// After build, this file is at /api/index.js and the app is at /artifacts/api-server/dist/index.js
// __dirname here is the /api directory on the deployed container
const app = require(path.join(__dirname, '..', 'artifacts', 'api-server', 'dist', 'index.js')).default;

// Vercel routing strategy:
// 1. In Vercel, files from /public are served as static assets automatically
// 2. This handler is called for /api/* routes and any routes that don't match static files
// 3. For the SPA root route, we serve index.html from the public directory
// 4. This allows React Router to handle client-side navigation

// Middleware to serve index.html for non-API SPA routes
const indexMiddleware = (req, res, next) => {
  // If it's an API route or a static asset request, let Express handle it
  if (req.path.startsWith('/api')) {
    return next();
  }

  // For SPA root and any unmapped routes, serve index.html
  const indexPath = path.join(__dirname, '..', 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  // If index.html doesn't exist, continue to Express for a 404
  next();
};

app.use(indexMiddleware);

module.exports = app;
