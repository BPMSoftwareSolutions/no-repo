import { callAiEngine } from './api-client.js';

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const repoId = urlParams.get('id');
  
  if (repoId) {
    document.querySelector('h1').textContent = `Repository Detail: ${repoId}`;
  }
  
  const tbody = document.querySelector('tbody');
  tbody.innerHTML = '<tr><td colspan="5">Loading files...</td></tr>';
  
  if (!repoId) {
    tbody.innerHTML = '<tr><td colspan="5">No repository ID provided.</td></tr>';
    return;
  }
  
  try {
    const data = await callAiEngine('listCodeFiles', { repositoryId: repoId, limit: 10 });
    const files = data.files || [];
    
    tbody.innerHTML = '';
    
    if (files.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">No files found.</td></tr>';
      return;
    }
    
    for (const file of files) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="File">${file.path || 'Unknown'}</td>
        <td data-label="LOC">-</td>
        <td data-label="Symbols">-</td>
        <td data-label="Signal">-</td>
        <td data-label="Open"><a href="file-detail.html?id=${file.id}">Open</a></td>
      `;
      tbody.appendChild(tr);
    }
    
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="5" class="loga-error-row">Error loading files: ${error.message}</td></tr>`;
  }
});
