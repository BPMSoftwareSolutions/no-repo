import { AIEngineClient } from '@bpmsoftwaresolutions/ai-engine-client';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const client = AIEngineClient.fromEnv();

// Deployed ai-engine repo — 1,113 files, last scanned 2026-05-11
const REPO_ID = 'f3f44a2c-7bd2-4a72-9718-26924bd3b407';
const REPO_ROOT = 'D:/a/ai-engine/ai-engine';
const PAGE_SIZE = 100;

console.log(`Pulling file inventory for repo: ${REPO_ID}`);
console.log(`Root: ${REPO_ROOT}\n`);

// Paginate through all files
const allFiles = [];
let page = 1;
let keepGoing = true;

while (keepGoing) {
  process.stdout.write(`  Page ${page}...`);
  const result = await client.repo.listCodeFiles({
    repositoryId: REPO_ID,
    page,
    pageSize: PAGE_SIZE,
  });

  const files = Array.isArray(result?.files) ? result.files : [];
  allFiles.push(...files);
  process.stdout.write(` ${files.length} files (total so far: ${allFiles.length})\n`);

  if (files.length < PAGE_SIZE) {
    keepGoing = false;
  } else {
    page++;
  }
}

console.log(`\nTotal files loaded: ${allFiles.length}`);

// Pull codebase shape findings for this repo
console.log('\nPulling codebase shape findings...');
const shapeFindingsResult = await client.repo.listCodebaseShapeFindings({
  repositoryId: REPO_ID,
  limit: 200,
}).catch(() => ({ findings: [] }));
const shapeFindings = Array.isArray(shapeFindingsResult?.findings) ? shapeFindingsResult.findings : [];
console.log(`Shape findings: ${shapeFindings.length}`);

// Pull refactor candidates for this repo root
console.log('\nPulling refactor candidates...');
const refactorResult = await client.repo.listRefactorCandidates({
  repositoryRoot: REPO_ROOT,
  limit: 50,
}).catch(() => ({ candidates: [] }));
const refactorCandidates = Array.isArray(refactorResult?.candidates) ? refactorResult.candidates : [];
console.log(`Refactor candidates: ${refactorCandidates.length}`);

// --- Build taxonomy ---

// Group by top-level directory
const dirMap = {};
const langMap = {};
const extMap = {};

for (const f of allFiles) {
  const path = f.file_path || f.path || '';
  const lang = f.language || f.primary_language || 'unknown';
  const parts = path.replace(/^\.\//, '').split('/');
  const topDir = parts.length > 1 ? parts[0] : '_root';
  const ext = path.includes('.') ? '.' + path.split('.').pop() : '(none)';

  dirMap[topDir] = (dirMap[topDir] || []);
  dirMap[topDir].push(f);

  langMap[lang] = (langMap[lang] || 0) + 1;
  extMap[ext] = (extMap[ext] || 0) + 1;
}

// Sort helpers
const sortedDirs = Object.entries(dirMap).sort((a, b) => b[1].length - a[1].length);
const sortedLangs = Object.entries(langMap).sort((a, b) => b[1] - a[1]);
const sortedExts = Object.entries(extMap).sort((a, b) => b[1] - a[1]);

// --- Build second-level breakdown for top dirs ---
function subDirBreakdown(files, depth = 2) {
  const sub = {};
  for (const f of files) {
    const path = f.file_path || f.path || '';
    const parts = path.replace(/^\.\//, '').split('/');
    const key = parts.slice(1, depth).join('/') || '_root';
    sub[key] = (sub[key] || 0) + 1;
  }
  return Object.entries(sub).sort((a, b) => b[1] - a[1]);
}

// Save raw data
const rawOut = join(__dirname, '../outputs/engine-file-taxonomy.json');
writeFileSync(rawOut, JSON.stringify({
  generated_at: new Date().toISOString(),
  repo_id: REPO_ID,
  repo_root: REPO_ROOT,
  total_files: allFiles.length,
  files: allFiles,
  shape_findings: shapeFindings,
  refactor_candidates: refactorCandidates,
}, null, 2), 'utf8');
console.log(`\nRaw data saved: ${rawOut}`);

// --- Build markdown output ---
const lines = [];

lines.push(`# AI Engine — Code File Taxonomy`);
lines.push(``);
lines.push(`**Repository:** \`d-a-ai-engine-ai-engine\``);
lines.push(`**Root path:** \`${REPO_ROOT}\``);
lines.push(`**Repo ID:** \`${REPO_ID}\``);
lines.push(`**Source:** SQL-backed code inventory via \`client.repo.listCodeFiles\``);
lines.push(`**Date:** ${new Date().toISOString().split('T')[0]}`);
lines.push(`**Total files in inventory:** ${allFiles.length}`);
lines.push(``);
lines.push(`---`);
lines.push(``);

// Language breakdown
lines.push(`## Language Breakdown`);
lines.push(``);
lines.push(`| Language | Files | % |`);
lines.push(`|---|---|---|`);
for (const [lang, count] of sortedLangs) {
  const pct = ((count / allFiles.length) * 100).toFixed(1);
  lines.push(`| ${lang} | ${count} | ${pct}% |`);
}
lines.push(``);

// Extension breakdown
lines.push(`## Extension Breakdown`);
lines.push(``);
lines.push(`| Extension | Files |`);
lines.push(`|---|---|`);
for (const [ext, count] of sortedExts.slice(0, 20)) {
  lines.push(`| \`${ext}\` | ${count} |`);
}
if (sortedExts.length > 20) lines.push(`| *(${sortedExts.length - 20} more extensions)* | |`);
lines.push(``);

// Directory structure
lines.push(`## Directory Structure (Top Level)`);
lines.push(``);
lines.push(`| Directory | Files | Sub-directories |`);
lines.push(`|---|---|---|`);
for (const [dir, files] of sortedDirs) {
  const subs = subDirBreakdown(files).slice(0, 5).map(([k, v]) => `\`${k}\` (${v})`).join(', ');
  lines.push(`| \`${dir}\` | ${files.length} | ${subs || '—'} |`);
}
lines.push(``);

// Detailed top-10 directory drill-down
lines.push(`## Top Directory Drill-Down`);
lines.push(``);
for (const [dir, files] of sortedDirs.slice(0, 10)) {
  lines.push(`### \`${dir}/\` (${files.length} files)`);
  lines.push(``);
  const subs = subDirBreakdown(files);
  if (subs.length > 1) {
    lines.push(`| Sub-path | Files |`);
    lines.push(`|---|---|`);
    for (const [sub, count] of subs.slice(0, 15)) {
      lines.push(`| \`${sub}\` | ${count} |`);
    }
    if (subs.length > 15) lines.push(`| *(${subs.length - 15} more)* | |`);
  } else {
    // List files directly
    for (const f of files.slice(0, 20)) {
      const p = f.file_path || f.path || '';
      const lang = f.language || '';
      lines.push(`- \`${p}\`${lang ? ` _(${lang})_` : ''}`);
    }
    if (files.length > 20) lines.push(`- *(${files.length - 20} more)*`);
  }
  lines.push(``);
}

// Refactor candidates
if (refactorCandidates.length > 0) {
  lines.push(`## Refactor Candidates`);
  lines.push(``);
  lines.push(`| File | Lines | Type | Severity |`);
  lines.push(`|---|---|---|---|`);
  for (const c of refactorCandidates) {
    const path = c.relative_path || c.file_path || '';
    const lines_ = c.line_count || '—';
    const type = c.finding_type || '—';
    const sev = c.severity || '—';
    lines.push(`| \`${path}\` | ${lines_} | ${type} | ${sev} |`);
  }
  lines.push(``);
}

// Shape findings
if (shapeFindings.length > 0) {
  lines.push(`## Codebase Shape Findings`);
  lines.push(``);
  lines.push(`| Finding | Severity | Status |`);
  lines.push(`|---|---|---|`);
  for (const f of shapeFindings.slice(0, 50)) {
    const title = f.title || f.summary || '—';
    const sev = f.severity || '—';
    const status = f.status || '—';
    lines.push(`| ${title} | ${sev} | ${status} |`);
  }
  if (shapeFindings.length > 50) lines.push(`| *(${shapeFindings.length - 50} more findings)* | | |`);
  lines.push(``);
}

// Summary observations
lines.push(`## Observations`);
lines.push(``);
lines.push(`_To be completed after reviewing the taxonomy above._`);
lines.push(``);

const mdOut = join(__dirname, '../docs/design/engine-file-taxonomy.md');
writeFileSync(mdOut, lines.join('\n'), 'utf8');
console.log(`Markdown taxonomy saved: ${mdOut}`);
