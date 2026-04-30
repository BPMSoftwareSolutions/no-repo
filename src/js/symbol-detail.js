import { callAiEngine } from './api-client.js';

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const symName = urlParams.get('name');
  
  if (symName) {
    document.querySelector('h1').textContent = `Symbol Detail: ${symName}`;
  }
  
  const dl = document.querySelector('dl');
  dl.innerHTML = '<dt>Loading...</dt><dd>Please wait.</dd>';
  
  if (!symName) {
    dl.innerHTML = '<dt>Error</dt><dd>No symbol name provided.</dd>';
    return;
  }
  
  try {
    const data = await callAiEngine('getSymbolDefinition', { qualifiedName: symName, includeCode: true });
    
    dl.innerHTML = `
      <dt>Defined in</dt>
      <dd>${data.filePath || 'Unknown'}</dd>
      <dt>Type</dt>
      <dd>${data.kind || 'Unknown'}</dd>
    `;
    
    if (data.code) {
      const codeSection = document.createElement('section');
      codeSection.innerHTML = `
        <h2>Code</h2>
        <pre><code>${data.code}</code></pre>
      `;
      document.querySelector('main').insertBefore(codeSection, document.querySelector('nav'));
    }
    
  } catch (error) {
    dl.innerHTML = `<dt style="color: var(--red)">Error</dt><dd style="color: var(--red)">${error.message}</dd>`;
  }
});
