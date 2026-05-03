(async () => {
  try {
    const { default: app } = await import('./dist/index.mjs');
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log('Server running on port ' + port);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
