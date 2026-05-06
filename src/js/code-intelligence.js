import { callAiEngine } from './api-client.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  const input = document.getElementById('symbol-search');
  const tbody = document.querySelector('tbody');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await search(input.value);
  });
  
  form.querySelector('button').addEventListener('click', async () => {
    await search(input.value);
  });
  
  async function search(query) {
    if (!query) return;
    
    tbody.innerHTML = '<tr><td colspan="3">Searching...</td></tr>';
    
    try {
      // Searching symbols
      const data = await callAiEngine('searchSymbols', { query, maxResults: 10 });
      const symbols = data.symbols || [];
      
      tbody.innerHTML = '';
      
      if (symbols.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">No symbols found.</td></tr>';
        return;
      }
      
      for (const sym of symbols) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td data-label="Candidate">${sym.name || sym.qualifiedName || 'Unknown'}</td>
          <td data-label="Why Matched">${sym.kind || 'Unknown kind'}</td>
          <td data-label="Open"><a href="symbol-detail.html?name=${encodeURIComponent(sym.qualifiedName || sym.name)}">Open</a></td>
        `;
        tbody.appendChild(tr);
      }
      
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="3" class="loga-error-row">Error searching symbols: ${error.message}</td></tr>`;
    }
  }
});
