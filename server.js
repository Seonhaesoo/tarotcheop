/* 로컬 개발 서버 — dist/ 를 정적으로 서빙 (node server.js → http://localhost:8324) */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, 'dist');
const PORT = process.env.PORT || 8324;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png' };

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  let file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(file) && fs.existsSync(file + '/index.html')) { res.writeHead(301, { Location: p + '/' }); return res.end(); }
  if (!fs.existsSync(file)) { file = path.join(ROOT, '404.html'); res.statusCode = 404; }
  res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`타로첩 dev: http://localhost:${PORT}`));
