const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files from the dist directory
app.use('/breakline-gen', express.static(path.join(__dirname, 'dist')));

// Handle all routes under /breakline-gen
app.get('/breakline-gen*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Redirect root to /breakline-gen
app.get('/', (req, res) => {
  res.redirect('/breakline-gen');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT}/breakline-gen`);
});