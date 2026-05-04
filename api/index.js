// Vercel serverless handler for Express app
// This file is required for Vercel to properly invoke the Express application

const fs = require('fs');
const path = require('path');

// Construct the path to the built app
// In Vercel, __dirname is /var/task/api and we need to go up to /var/task
const appDir = path.dirname(path.dirname(__dirname));
const appPath = path.join(appDir, 'artifacts', 'api-server', 'dist', 'index.js');

// Log for debugging
console.log('[Handler] __dirname:', __dirname);
console.log('[Handler] appDir:', appDir);
console.log('[Handler] appPath:', appPath);
console.log('[Handler] File exists:', fs.existsSync(appPath));

// Require the app
const app = require(appPath).default;

module.exports = app;
