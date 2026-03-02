import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(__dirname, '../.vercel/output/functions/_render.func/.vc-config.json');
const targetRuntime = process.env.VERCEL_FUNCTION_RUNTIME || 'nodejs20.x';

if (!fs.existsSync(configPath)) {
  console.log('[fix-vercel-runtime] Skip: _render function config not found.');
  process.exit(0);
}

const raw = fs.readFileSync(configPath, 'utf8');
const json = JSON.parse(raw);

if (json.runtime === targetRuntime) {
  console.log(`[fix-vercel-runtime] Runtime already set to ${targetRuntime}.`);
  process.exit(0);
}

json.runtime = targetRuntime;
fs.writeFileSync(configPath, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
console.log(`[fix-vercel-runtime] Updated runtime to ${targetRuntime}.`);
