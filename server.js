const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.csv': 'text/csv',
};

// Load password dynamically from password.txt
function getSavedPassword() {
  try {
    const passwordPath = path.join(__dirname, 'password.txt');
    if (fs.existsSync(passwordPath)) {
      return fs.readFileSync(passwordPath, 'utf8').trim();
    }
  } catch (err) {
    console.error("Gagal membaca password.txt:", err);
  }
  return 'T3Ls19#0'; // Fallback
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Handle API endpoint to verify password
  if (req.method === 'POST' && req.url === '/verify-password') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { password } = data;
        const currentPassword = getSavedPassword();

        if (password === currentPassword) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Password verified' }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Invalid password' }));
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Server error: ' + err.message }));
      }
    });
    return;
  }

  // Handle API endpoint to update scores
  if (req.method === 'POST' && req.url === '/update-scores') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { password, scores } = data;
        const currentPassword = getSavedPassword();

        // Verify password
        if (password !== currentPassword) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Invalid password' }));
          return;
        }

        // Generate CSV content
        let csvContent = 'Tim,kemenangan\n';
        scores.forEach(item => {
          csvContent += `${item.tim.toLowerCase()},${item.kemenangan}\n`;
        });

        // Write to master-tim.csv
        fs.writeFileSync(path.join(__dirname, 'master-tim.csv'), csvContent, 'utf8');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Scores updated successfully' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Server error: ' + err.message }));
      }
    });
    return;
  }

  // Handle static file serving
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath);
  
  // Resolve directory path to index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // Handle setting-event-scor friendly URL
  if (urlPath === '/jesica-setting-event-scor') {
    filePath = path.join(__dirname, 'jesica-setting-event-scor.html');
  }

  // SECURE: Block access to password.txt and server.js or any dot files
  const baseName = path.basename(filePath).toLowerCase();
  if (baseName === 'password.txt' || baseName === 'server.js' || baseName.startsWith('.')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied: Files cannot be retrieved directly.');
    return;
  }

  // Clean path to prevent path traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
