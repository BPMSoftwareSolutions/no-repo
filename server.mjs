import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AIEngineClient } from '@bpmsoftwaresolutions/ai-engine-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.join(__dirname, 'src');
const DOCS_DIR = path.join(__dirname, 'docs');

const client = AIEngineClient.fromEnv();

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.md': 'text/markdown'
};

const server = http.createServer(async (req, res) => {
  console.log(`[${req.method}] ${req.url}`);
  const requestUrl = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(requestUrl.pathname);

  if (pathname === '/api/ai-engine') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const { method, args } = payload;
          
          if (typeof client[method] !== 'function') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Method ${method} not found on client` }));
            return;
          }

          const result = await client[method](...(args || []));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ result }));
        } catch (error) {
          console.error(`API Error:`, error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message, stack: error.stack }));
        }
      });
      return;
    }
  }

  let filePath = path.join(SRC_DIR, pathname === '/' ? 'html/playground.html' : pathname);

  if (pathname.startsWith('/docs/')) {
    filePath = path.join(DOCS_DIR, pathname.slice('/docs/'.length));
  }
  
  // Quick hack to map extensions to right directory structure if requested linearly
  if (!pathname.startsWith('/docs/') && pathname.endsWith('.html') && !pathname.startsWith('/html')) {
    filePath = path.join(SRC_DIR, 'html', pathname);
  } else if (!pathname.startsWith('/docs/') && pathname.endsWith('.css') && !pathname.startsWith('/css')) {
    filePath = path.join(SRC_DIR, 'css', pathname);
  } else if (!pathname.startsWith('/docs/') && pathname.endsWith('.js') && !pathname.startsWith('/js')) {
    filePath = path.join(SRC_DIR, 'js', pathname);
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'text/plain';
    
    const content = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404);
      res.end('404 Not Found');
    } else {
      res.writeHead(500);
      res.end('500 Internal Server Error');
    }
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Open http://localhost:${PORT}/playground.html to see the UI`);
});
