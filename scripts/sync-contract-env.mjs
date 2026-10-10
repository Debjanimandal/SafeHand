import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const envPath = resolve(root, '.env');
const contractEnvPath = resolve(root, 'contracts/deployments/base-sepolia.env');

function parseLines(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

function parseEnvObject(content) {
  const output = {};

  for (const line of parseLines(content)) {
    const eq = line.indexOf('=');

    if (eq <= 0) {
      continue;
    }

    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    output[key] = value;
  }

  return output;
}

if (!existsSync(envPath)) {
  console.error('Missing .env at repository root.');
  process.exit(1);
}

if (!existsSync(contractEnvPath)) {
  console.error('Missing contracts/deployments/base-sepolia.env. Deploy contracts first.');
  process.exit(1);
}

const env = parseEnvObject(readFileSync(envPath, 'utf8'));
const contractEnv = parseEnvObject(readFileSync(contractEnvPath, 'utf8'));

const keysToSync = [
  'NEXT_PUBLIC_PROOFLY_REGISTRY_ADDRESS',
  'NEXT_PUBLIC_PROOFLY_POLICY_ADDRESS',
  'NEXT_PUBLIC_PROOFLY_SESSION_ADDRESS',
  'NEXT_PUBLIC_PROOFLY_TASK_GATE_ADDRESS',
  'VITE_PROOFLY_REGISTRY_ADDRESS',
  'VITE_PROOFLY_POLICY_ADDRESS',
  'VITE_PROOFLY_SESSION_ADDRESS',
  'VITE_PROOFLY_TASK_GATE_ADDRESS',
];

for (const key of keysToSync) {
  if (contractEnv[key]) {
    env[key] = contractEnv[key];
  }
}

const sorted = Object.keys(env)
  .sort()
  .map((key) => `${key}=${env[key]}`)
  .join('\n');

writeFileSync(envPath, `${sorted}\n`, 'utf8');
console.log('Synced contract addresses into .env.');
