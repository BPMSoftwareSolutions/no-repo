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
const AI_ENGINE_BASE_URL = process.env.AI_ENGINE_BASE_URL;
const AI_ENGINE_ACCESS_TOKEN = process.env.AI_ENGINE_ACCESS_TOKEN;
const AI_ENGINE_CLIENT_ID = process.env.AI_ENGINE_CLIENT_ID;
const AI_ENGINE_ACTOR_ID = process.env.AI_ENGINE_ACTOR_ID;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown',
};

const CONTRACT_PREPAINT_STYLE_ID = 'contract-prepaint-bg';
const CONTRACT_PREPAINT_CSS = `
:root{
  --bg:#090d14;
  --text:#d6deeb;
  --sans:"Inter", "Segoe UI", "SF Pro Text", "Roboto", sans-serif;
}
html{
  background:var(--bg);
  color:var(--text);
}
body{
  margin:0;
  min-height:100vh;
  background:radial-gradient(circle at top left, rgba(124, 156, 255, 0.14), transparent 34rem), var(--bg);
  color:var(--text);
  font-family:var(--sans);
}
`;

const proxyHandler = createProxyHandler(createAiEngineClient);

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
      sendJson(res, await buildLogaTreeChildren(nodeId, { client: createAiEngineClient(req) }));
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
    } else if (pathname.endsWith('.js') && !pathname.startsWith('/js') && !pathname.startsWith('/renderer/') && !pathname.startsWith('/shared/')) {
      filePath = path.join(SRC_DIR, 'js', pathname);
    } else if (pathname.startsWith('/shared/')) {
      filePath = path.join(SRC_DIR, pathname);
    }
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    const ext = path.extname(filePath);
    const content = await fs.readFile(filePath);

    if (ext === '.html') {
      const html = injectPrepaintStyle(content.toString('utf8'));
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
      res.end(html);
      return;
    }

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

function injectPrepaintStyle(html) {
  if (html.includes(`id="${CONTRACT_PREPAINT_STYLE_ID}"`)) return html;
  const styleTag = `<style id="${CONTRACT_PREPAINT_STYLE_ID}">${CONTRACT_PREPAINT_CSS}</style>`;
  if (html.includes('</head>')) {
    return html.replace('</head>', `${styleTag}\n</head>`);
  }
  return `${styleTag}\n${html}`;
}

function createAiEngineClient(req) {
  if (!AI_ENGINE_BASE_URL) {
    throw new Error('AI_ENGINE_BASE_URL is required on the server.');
  }

  if (AI_ENGINE_ACCESS_TOKEN) {
    return new AIEngineClient({
      baseUrl: AI_ENGINE_BASE_URL,
      accessToken: AI_ENGINE_ACCESS_TOKEN,
      actorId: AI_ENGINE_ACTOR_ID,
    });
  }

  const apiKey = String(req.headers['x-ai-engine-api-key'] || '').trim();
  if (!apiKey) {
    throw new Error('Missing AI Engine API key. Refresh the page and enter a key when prompted.');
  }

  return new AIEngineClient({
    baseUrl: AI_ENGINE_BASE_URL,
    apiKey,
    clientId: AI_ENGINE_CLIENT_ID,
    actorId: AI_ENGINE_ACTOR_ID,
  });
}
