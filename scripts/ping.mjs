import { AIEngineClient } from '@bpmsoftwaresolutions/ai-engine-client';

const requiredEnv = ['AI_ENGINE_API_KEY', 'AI_ENGINE_BASE_URL'];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);

if (missingEnv.length > 0) {
  console.error(`Missing required environment variable(s): ${missingEnv.join(', ')}`);
  console.error('Set them in your shell, then run: npm run ping');
  process.exit(1);
}

const client = AIEngineClient.fromEnv();
const health = await client.ping();

console.log(JSON.stringify(health, null, 2));
