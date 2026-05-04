// Vercel serverless handler for Express app
// This file is required for Vercel to properly invoke the Express application

const fs = require('fs');
const path = require('path');

try {
  // Construct the path to the built app
  const appDir = path.dirname(path.dirname(__dirname));
  const appPath = path.join(appDir, 'artifacts', 'api-server', 'dist', 'index.js');

  // Check if file exists
  if (!fs.existsSync(appPath)) {
    throw new Error(`App file not found at: ${appPath}`);
  }

  // Require the app
  const app = require(appPath).default;

  if (!app) {
    throw new Error('App module has no default export');
  }

  module.exports = app;
} catch (err) {
  // If we can't load the app, export a fallback handler
  console.error('Failed to load app:', err.message);

  module.exports = (req, res) => {
    res.status(500).json({
      error: 'Failed to initialize app',
      message: err.message,
      details: err.stack
    });
  };
}
