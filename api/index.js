// Vercel serverless handler for Express app
// Test handler to diagnose deployment issue

module.exports = (req, res) => {
  res.status(200).json({
    message: 'Handler is working!',
    timestamp: new Date().toISOString(),
    path: req.url
  });
};
