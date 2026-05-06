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
      const repositoryId = repo.code_repository_id || repo.repository_id || repo.id || '';
      const projects = Number.isFinite(repo.project_count) ? repo.project_count : '-';
      const files = Number.isFinite(repo.file_count) ? repo.file_count : '-';
      const symbols = Number.isFinite(repo.symbol_count) ? repo.symbol_count : '-';
      const openCell = repositoryId
        ? `<a href="repository-detail.html?id=${encodeURIComponent(repositoryId)}">Open</a>`
        : '<span class="loga-error-detail">Unavailable</span>';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="Repository">${repo.name || repo.id || 'Unknown'}</td>
        <td data-label="Projects">${projects}</td>
        <td data-label="Files">${files}</td>
        <td data-label="Symbols">${symbols}</td>
        <td data-label="Open">${openCell}</td>
      `;
      tbody.appendChild(tr);
    }
    
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="5" class="loga-error-row">Error loading repositories: ${error.message}</td></tr>`;
  }
});
