// Vercel serverless handler for Express app
// This file is required for Vercel to properly invoke the Express application

const path = require('path');

// In Vercel serverless, use process.cwd() which points to the deployment root
// The built app is at artifacts/api-server/dist/index.js
const appPath = path.join(process.cwd(), 'artifacts', 'api-server', 'dist', 'index.js');
const app = require(appPath).default;

module.exports = app;
