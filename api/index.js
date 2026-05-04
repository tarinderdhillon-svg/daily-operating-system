// Vercel serverless handler for Express app
// This file is required for Vercel to properly invoke the Express application

const app = require('../artifacts/api-server/dist/index.js').default;

module.exports = app;
