import { callAiEngine, renderMarkdownProjection } from './api-client.js';

function traceArgs(args) {
  try {
    return JSON.stringify(args);
  } catch {
    return '[unserializable args]';
  }
}

async function callAiEngineWithTrace(method, ...args) {
  const traceLog = document.getElementById('trace-log');
  const traceEntry = document.createElement('div');
  traceEntry.className = 'trace-entry';
  const time = new Date().toISOString().split('T')[1].slice(0, 12);
  traceEntry.innerHTML = `<span class="trace-time">[${time}]</span> <span class="trace-method">${method}</span>( ${traceArgs(args)} ) <span class="trace-status" id="status-${Date.now()}">⏳ Pending...</span>`;
  traceLog.appendChild(traceEntry);
  traceLog.scrollTop = traceLog.scrollHeight;

  const statusEl = traceEntry.querySelector('.trace-status');

  try {
    const result = await callAiEngine(method, ...args);
    statusEl.textContent = `✅ OK`;
    statusEl.className = 'trace-status';
    return result;
  } catch (err) {
    statusEl.textContent = `❌ ${err.message}`;
    statusEl.className = 'trace-status error';
    throw err;
  }
}

// Projection Renderer
function renderProjection(result) {
  const content = document.getElementById('projection-content');
  if (result.text) {
    content.innerHTML = `
      <div style="font-size: 11px; margin-bottom: 16px; font-family: monospace; color: var(--muted); border-bottom: 1px solid var(--line-soft); padding-bottom: 8px;">
        Type: ${result.projectionType || 'Unknown'} | Version: ${result.projectionVersion || 'N/A'}<br>
        Truth: ${result.sourceTruth || 'N/A'}
      </div>
      <div class="markdown-body">${renderMarkdownProjection(result.text)}</div>
    `;
  } else {
    content.innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
  }
}

function renderInspection(result) {
  const content = document.getElementById('inspection-content');
  content.innerHTML = `<pre style="font-size:12px; overflow-x: auto; white-space: pre-wrap;">${JSON.stringify(result, null, 2)}</pre>`;
}

// Navigation Actions
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', async (e) => {
    const action = e.target.getAttribute('data-action');
    if (action === 'loadHome') {
      try {
        const proj = await callAiEngineWithTrace('getLogaOperatorHomeProjection');
        renderProjection(proj);
      } catch (e) {
        console.error(e);
      }
    } else if (action === 'loadProjects') {
      try {
        const proj = await callAiEngineWithTrace('getLogaProjectCatalogProjection');
        renderProjection(proj);
      } catch (e) {
        console.error(e);
      }
    } else if (action === 'loadCodebaseShape') {
      try {
        const status = await callAiEngineWithTrace('currentCodebaseShapeStatus');
        renderProjection(status);
      } catch(e) {
        console.error(e);
      }
    }
  });
});

// Inspection Actions
document.getElementById('inspect-symbol-btn').addEventListener('click', async () => {
  const val = document.getElementById('inspect-symbol-input').value;
  if (!val) return;
  try {
    const res = await callAiEngineWithTrace('getSymbolDefinition', { qualifiedName: val, includeCode: true });
    renderInspection(res);
  } catch(e) {
    renderInspection({ error: e.message });
  }
});

document.getElementById('inspect-file-btn').addEventListener('click', async () => {
  const val = document.getElementById('inspect-symbol-input').value;
  if (!val) return;
  // Usually this would be getCodeFileContentWindow or similar, using getCodeFile here for testing
  try {
    const res = await callAiEngineWithTrace('listCodeFiles', { pathPrefix: val, limit: 5 });
    renderInspection(res);
  } catch(e) {
    renderInspection({ error: e.message });
  }
});

// Init
console.log("Playground JS loaded.");
