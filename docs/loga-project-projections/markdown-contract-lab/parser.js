export function parseMarkdown(markdown) {
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  const frontmatter = {};
  let body = markdown;
  if (frontmatterMatch) {
    body = markdown.slice(frontmatterMatch[0].length);
    frontmatterMatch[1].split(/\r?\n/).forEach((line) => {
      const match = line.match(/^([a-zA-Z0-9_]+):\s*"?([^"]*)"?$/);
      if (match) frontmatter[match[1]] = match[2];
    });
  }
  const blocks = [...body.matchAll(/^:{2,3}([a-zA-Z0-9_]+)(?:\s+[^\n]*)?$/gm)].map((match) => match[1]);
  return { frontmatter, body, blocks };
}

export function collectBlock(lines, startIndex) {
  const blockLines = [];
  let depth = 1;
  let index = startIndex + 1;

  for (; index < lines.length; index++) {
    const current = lines[index] || '';
    const trimmed = current.trim();
    const isStart = /^:{2,3}[a-zA-Z0-9_]+(?:\s+.*)?$/.test(trimmed);
    const isEnd = /^:{2,3}$/.test(trimmed);

    if (isStart) {
      depth++;
      blockLines.push(current);
      continue;
    }

    if (isEnd) {
      depth--;
      if (depth === 0) break;
      blockLines.push(current);
      continue;
    }

    blockLines.push(current);
  }

  return { lines: blockLines, endIndex: index };
}

export function collectChildBlocks(lines) {
  const blocks = [];
  for (let index = 0; index < lines.length; index++) {
    const directive = (lines[index] || '').trim().match(/^:{2,3}([a-zA-Z0-9_]+)(?:\s+(.*))?$/);
    if (!directive) continue;
    const collected = collectBlock(lines, index);
    blocks.push({
      name: directive[1],
      attrs: parseAttrs(directive[2]),
      lines: collected.lines,
    });
    index = collected.endIndex;
  }
  return blocks;
}

export function parseAttrs(raw = '') {
  const attrs = {};
  const pattern = /([a-zA-Z0-9_-]+)=("([^"]*)"|'([^']*)'|([^\s]+))/g;
  let match;
  while ((match = pattern.exec(raw))) attrs[match[1]] = match[3] ?? match[4] ?? match[5] ?? '';
  return attrs;
}

export function parseOptions(lines) {
  const options = [];
  let inOptions = false;
  lines.forEach((raw) => {
    const line = raw.trim();
    if (/^options:\s*$/.test(line)) {
      inOptions = true;
      return;
    }
    if (inOptions && line.startsWith('- ')) {
      options.push(line.slice(2).replace(/^"|"$/g, ''));
      return;
    }
    if (inOptions && line && !line.startsWith('- ')) inOptions = false;
  });
  return options.length ? options : ['Option'];
}

export function parseKeyValues(lines) {
  const values = {};
  lines.forEach((raw) => {
    const line = raw.trim();
    const match = line.match(/^([a-zA-Z0-9_]+):\s*"?([^"]*)"?$/);
    if (match) values[match[1]] = match[2];
  });
  return values;
}

export function parseRecords(lines) {
  const records = [];
  let current = null;
  lines.forEach((raw) => {
    const line = raw.trim();
    if (line.startsWith('- ')) {
      if (current) records.push(current);
      current = {};
      const inlineValue = line.slice(2);
      const pair = inlineValue.match(/^([a-zA-Z0-9_]+):\s*"?([^"]*)"?$/);
      if (pair) current[pair[1]] = pair[2];
      else current.label = inlineValue;
      return;
    }
    const pair = line.match(/^([a-zA-Z0-9_]+):\s*"?([^"]*)"?$/);
    if (pair) {
      if (!current) current = {};
      current[pair[1]] = pair[2];
    }
  });
  if (current) records.push(current);
  return records;
}
