import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AIEngineClient } from '@bpmsoftwaresolutions/ai-engine-client';
import { buildLogaTreeRoot, buildLogaTreeChildren } from './src/server/tree.mjs';
import { createProxyHandler } from './src/server/proxy.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.join(__dirname, 'src');
const DOCS_DIR = path.join(__dirname, 'docs');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown',
};

const client = AIEngineClient.fromEnv();
const proxyHandler = createProxyHandler(client);

const server = http.createServer(async (req, res) => {
  console.log(`[${req.method}] ${req.url}`);
  const { pathname: rawPathname } = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(rawPathname);

  if (req.method === 'GET' && pathname === '/api/loga/tree') {
    sendJson(res, buildLogaTreeRoot());
    return;
  }

  if (req.method === 'GET' && pathname.startsWith('/api/loga/tree/nodes/') && pathname.endsWith('/children')) {
    const nodeId = pathname.slice('/api/loga/tree/nodes/'.length, -'/children'.length);
    try {
      sendJson(res, await buildLogaTreeChildren(nodeId, { client }));
    } catch (error) {
      console.error('Tree API Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message, stack: error.stack }));
    }
    return;
  }

  if (pathname === '/api/ai-engine') {
    proxyHandler(req, res);
    return;
  }

  let filePath = path.join(SRC_DIR, pathname === '/' ? 'html/projection-detail.html' : pathname);

  if (pathname.startsWith('/docs/')) {
    filePath = path.join(DOCS_DIR, pathname.slice('/docs/'.length));
  } else if (pathname.startsWith('/fixtures/')) {
    filePath = path.join(FIXTURES_DIR, pathname.slice('/fixtures/'.length));
  } else {
    if (pathname.endsWith('.html') && !pathname.startsWith('/html') && !pathname.startsWith('/renderer/')) {
      filePath = path.join(SRC_DIR, 'html', pathname);
    } else if (pathname.endsWith('.css') && !pathname.startsWith('/css') && !pathname.startsWith('/renderer/')) {
      filePath = path.join(SRC_DIR, 'css', pathname);
    } else if (pathname.endsWith('.js') && !pathname.startsWith('/js') && !pathname.startsWith('/renderer/')) {
      filePath = path.join(SRC_DIR, 'js', pathname);
    }
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    const ext = path.extname(filePath);
    const content = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
    res.end(content);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 500);
    res.end(error.code === 'ENOENT' ? '404 Not Found' : '500 Internal Server Error');
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Open http://localhost:${PORT}/playground.html to see the UI`);
});

function sendJson(res, payload) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}
