import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const envPath = resolve(root, '.env');

function parseEnv(content) {
  const output = {};
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

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

function isHexAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function checkDatabase(env) {
  const url = env.DATABASE_URL;

  if (!url) {
    return { ok: false, message: 'DATABASE_URL missing.' };
  }

  // Just validate it looks like a postgres URL
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    return { ok: false, message: 'DATABASE_URL must start with postgresql:// or postgres://' };
  }

  return { ok: true, message: 'DATABASE_URL present and format valid.' };
}

async function checkBaseRpc(env) {
  const rpcUrl = env.BASE_SEPOLIA_RPC_URL || env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL;

  if (!rpcUrl) {
    return { ok: false, message: 'Base Sepolia RPC URL missing.' };
  }

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
    });

    if (!response.ok) {
      return { ok: false, message: `RPC request failed with status ${response.status}.` };
    }

    const body = await response.json();

    if (!body?.result) {
      return { ok: false, message: 'RPC response missing chain id result.' };
    }

    if (body.result.toLowerCase() !== '0x14a34') {
      return { ok: false, message: `RPC chain id mismatch: expected 0x14a34, got ${body.result}.` };
    }

    return { ok: true, message: 'Base Sepolia RPC chain id verified (84532).' };
  } catch (error) {
    return { ok: false, message: `RPC request failed: ${error.message}` };
  }
}

function validateStatic(env) {
  const required = [
    'NEXT_PUBLIC_WORLD_APP_ID',
    'NEXT_PUBLIC_WORLD_ID_ACTION',
    'WORLD_ID_ACTION',
    'DATABASE_URL',
    'VITE_PROOFLY_API_BASE_URL',
    'DEPLOYER_PRIVATE_KEY',
  ];

  const missing = required.filter((key) => !env[key]);
  const errors = [];

  if (missing.length > 0) {
    errors.push(`Missing required env vars: ${missing.join(', ')}`);
  }

  if (env.VITE_PROOFLY_API_BASE_URL && !isHttpUrl(env.VITE_PROOFLY_API_BASE_URL)) {
    errors.push('VITE_PROOFLY_API_BASE_URL is not a valid URL.');
  }

  if (env.DEPLOYER_PRIVATE_KEY && !/^0x[a-fA-F0-9]{64}$/.test(env.DEPLOYER_PRIVATE_KEY)) {
    errors.push('DEPLOYER_PRIVATE_KEY must be a 0x-prefixed 32-byte hex value.');
  }

  const addressVars = [
    'NEXT_PUBLIC_PROOFLY_REGISTRY_ADDRESS',
    'NEXT_PUBLIC_PROOFLY_POLICY_ADDRESS',
    'NEXT_PUBLIC_PROOFLY_SESSION_ADDRESS',
    'NEXT_PUBLIC_PROOFLY_TASK_GATE_ADDRESS',
    'VITE_PROOFLY_REGISTRY_ADDRESS',
    'VITE_PROOFLY_POLICY_ADDRESS',
    'VITE_PROOFLY_SESSION_ADDRESS',
    'VITE_PROOFLY_TASK_GATE_ADDRESS',
  ];

  for (const key of addressVars) {
    if (env[key] && !isHexAddress(env[key])) {
      errors.push(`${key} must be a valid 0x address.`);
    }
  }

  return errors;
}

async function main() {
  if (!existsSync(envPath)) {
    console.error('Missing .env file at repository root.');
    process.exit(1);
  }

  const env = parseEnv(readFileSync(envPath, 'utf8'));
  const staticErrors = validateStatic(env);

  const runtimeChecks = [await checkDatabase(env), await checkBaseRpc(env)];
  const failedRuntime = runtimeChecks.filter((item) => !item.ok);

  console.log('Live readiness report:');
  for (const item of runtimeChecks) {
    console.log(`- ${item.ok ? 'OK' : 'FAIL'}: ${item.message}`);
  }

  if (staticErrors.length > 0) {
    console.log('- FAIL: Static env validation errors:');
    for (const error of staticErrors) {
      console.log(`  - ${error}`);
    }
  }

  if (staticErrors.length > 0 || failedRuntime.length > 0) {
    process.exit(1);
  }

  console.log('All live readiness checks passed.');
}

await main();
