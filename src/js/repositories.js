import { callAiEngine } from './api-client.js';

document.addEventListener('DOMContentLoaded', async () => {
  const tbody = document.querySelector('tbody');
  tbody.innerHTML = '<tr><td colspan="5">Loading repositories...</td></tr>';
  
  try {
    const data = await callAiEngine('listRepositories', { limit: 10 });
    const repos = data.repositories || [];
    
    tbody.innerHTML = '';
    
    if (repos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">No repositories found.</td></tr>';
      return;
    }
    
    for (const repo of repos) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${repo.name || repo.id || 'Unknown'}</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td><a href="repository-detail.html?id=${repo.id}">Open</a></td>
      `;
      tbody.appendChild(tr);
    }
    
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="5" style="color: var(--red)">Error loading repositories: ${error.message}</td></tr>`;
  }
});
