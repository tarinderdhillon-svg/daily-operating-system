// Vercel serverless handler for Express app
// This file is required for Vercel to properly invoke the Express application

const path = require('path');

// In Vercel, the working directory is the project root
// The built app is at artifacts/api-server/dist/index.js
const appPath = path.join(__dirname, '..', 'artifacts', 'api-server', 'dist', 'index.js');
const app = require(appPath).default;

module.exports = app;
