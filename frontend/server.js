const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8899;
const HOST = process.env.HOST || '0.0.0.0';
const STATIC_DIR = path.join(__dirname, 'www'); // Ionic/Angular builds to 'www' directory

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.map': 'application/json', // Source maps
  '.txt': 'text/plain'
};

// Security headers for production
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;
  
  console.log(`${new Date().toISOString()} - ${req.method} ${pathname}`);
  
  // Default to index.html for root
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  let filePath = path.join(STATIC_DIR, pathname);
  
  // Security check - prevent directory traversal
  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File doesn't exist - serve index.html for SPA routing (Angular routes)
      const ext = path.extname(pathname).toLowerCase();
      if (ext === '' || ext === '.html') {
        // No extension or .html extension - serve index.html for SPA routing
        filePath = path.join(STATIC_DIR, 'index.html');
      } else {
        // Has extension (like .png, .js, .css) - return 404
        res.writeHead(404, securityHeaders);
        res.end('File not found');
        return;
      }
    }
    
    // Get file extension and MIME type
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    // Read and serve the file
    fs.readFile(filePath, (err, content) => {
      if (err) {
        console.error(`Error reading file ${filePath}:`, err);
        res.writeHead(500, securityHeaders);
        res.end('Server Error');
        return;
      }
      
      // Set headers
      const headers = {
        'Content-Type': contentType,
        ...securityHeaders
      };
      
      // Add caching headers for static assets
      if (ext === '.js' || ext === '.css' || ext === '.png' || ext === '.jpg' || 
          ext === '.jpeg' || ext === '.gif' || ext === '.svg' || ext === '.ico' ||
          ext === '.woff' || ext === '.woff2' || ext === '.ttf' || ext === '.eot') {
        headers['Cache-Control'] = 'public, max-age=31536000'; // 1 year
      } else if (ext === '.html') {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      }
      
      res.writeHead(200, headers);
      res.end(content);
    });
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 Production server running on http://${HOST}:${PORT}`);
  console.log(`📁 Serving static files from: ${STATIC_DIR}`);
  console.log(`📱 Ionic/Angular app ready!`);
  console.log(`\n🌐 Access your app at:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  if (HOST === '0.0.0.0') {
    console.log(`   Network: http://[your-ip]:${PORT}`);
  }
  console.log(`\n✋ Press Ctrl+C to stop the server\n`);
});
