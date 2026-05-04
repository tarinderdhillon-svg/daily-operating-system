// Vercel serverless handler for Express app
// This file is automatically detected by Vercel as a serverless function handler.
// It loads the compiled Express app from the build output and re-exports it.

const path = require('path');

// After build, this file is at /api/index.js and the app is at /artifacts/api-server/dist/index.js
// __dirname here is the /api directory on the deployed container
const app = require(path.join(__dirname, '..', 'artifacts', 'api-server', 'dist', 'index.js')).default;

module.exports = app;
