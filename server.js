const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Normalize and clean the URL path
  let safeUrl = req.url.split('?')[0].split('#')[0];
  if (safeUrl === '/') {
    safeUrl = '/index.html';
  }

  // Prevent directory traversal attacks
  const filePath = path.join(__dirname, safeUrl.replace(/^\//, ''));
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Handle test results POST request
  if (req.method === 'POST' && safeUrl === '/api/test-results') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      const resultsPath = path.join(__dirname, 'test-results.json');
      fs.writeFile(resultsPath, body, 'utf8', (err) => {
        if (err) {
          console.error("Error writing test results file:", err);
        }
        console.log("\n=================== TEST RESULTS RECEIVED ===================");
        try {
          const resObj = JSON.parse(body);
          console.log(`Summary: Passed: ${resObj.passed}, Failed: ${resObj.failed}`);
          console.log("-------------------------------------------------------------");
          console.log(resObj.logs.join('\n'));
        } catch (parseErr) {
          console.log("Failed to parse test results body:", parseErr.message);
        }
        console.log("=============================================================\n");

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));

        // Gracefully shut down the server
        setTimeout(() => {
          console.log("Shutting down test server...");
          process.exit(0);
        }, 1000);
      });
    });
    return;
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found: ' + safeUrl);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`MAAHI PRODUCTS Development & Test Server`);
  console.log(`Server running at: http://localhost:${PORT}/`);
  console.log(`Test Suite running at: http://localhost:${PORT}/test-suite.html`);
  console.log(`==================================================\n`);
});
