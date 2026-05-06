import { renderWorkspaceChrome } from '../renderer/chrome.js';

export async function mountWorkspaceChrome(overrides = {}) {
  const slot = document.getElementById('workspace-chrome');
  if (!slot) return;

  try {
    const res = await fetch('/fixtures/projections/operator.workspace_chrome.md');
    if (!res.ok) throw new Error(`Chrome fixture not found (${res.status})`);

    const markdown = await res.text();
    slot.innerHTML = renderWorkspaceChrome(markdown, overrides);
    document.dispatchEvent(new CustomEvent('workspace-chrome:mounted', { detail: { overrides } }));
  } catch (error) {
    console.warn('Workspace chrome could not be rendered:', error.message);
  }
}
