import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const runtimePackageJson = path.join(__dirname, '..', '.telemetry-runtime', 'package.json');
const runtimeRequire = createRequire(runtimePackageJson);

export const { AIEngineClient } = runtimeRequire('@bpmsoftwaresolutions/ai-engine-client');
