import { AIEngineClient } from '@bpmsoftwaresolutions/ai-engine-client';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = AIEngineClient.fromEnv();
const result = await client.getLogaProjectPortfolioProjection();

const outPath = join(
  __dirname,
  '../docs/loga-project-projections/markdown-contract-lab/project-portfolio.md'
);

writeFileSync(outPath, result.text, 'utf8');

console.log('Saved:', outPath);
console.log('projectionType:', result.projectionType);
console.log('projectionVersion:', result.projectionVersion);
console.log('generatedAt:', result.generatedAt);
