# Proofly Production Deployment Runbook

## 1) Prerequisites

- Node.js 20+
- Corepack enabled (`corepack enable`)
- Supabase project created
- Base Sepolia funded deployer wallet
- World ID app credentials

## 2) Install dependencies

```bash
corepack pnpm install
```

## 3) Configure environment

Use the real `.env` at repository root and set:

- Supabase:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- World ID:
  - `NEXT_PUBLIC_WORLD_APP_ID`
  - `NEXT_PUBLIC_WORLD_ID_ACTION`
  - `WORLD_ID_ACTION`
  - `WORLD_ID_APP_SECRET`
- Contracts / chain:
  - `BASE_SEPOLIA_RPC_URL`
  - `DEPLOYER_PRIVATE_KEY`
  - `BASESCAN_API_KEY`
- Extension runtime:
  - `VITE_PROOFLY_API_BASE_URL`
  - `VITE_BASE_SEPOLIA_RPC_URL`
  - `VITE_BASE_MAINNET_RPC_URL`

Validate live config before deployment:

```bash
corepack pnpm live:check
```

## 4) Apply Supabase schema

Run SQL from:

- `supabase/migrations/20260408_000001_init.sql`
- `supabase/migrations/20260408_000002_auth_sessions.sql`
- `supabase/policies/rls.sql`

## 5) Deploy contracts (Base Sepolia)

```bash
corepack pnpm deploy:contracts:base-sepolia
```

Artifacts generated:

- `contracts/deployments/base-sepolia.json`
- `contracts/deployments/base-sepolia.env`

Copy keys from `base-sepolia.env` into your `.env`:

- `NEXT_PUBLIC_PROOFLY_REGISTRY_ADDRESS`
- `NEXT_PUBLIC_PROOFLY_POLICY_ADDRESS`
- `NEXT_PUBLIC_PROOFLY_SESSION_ADDRESS`
- `NEXT_PUBLIC_PROOFLY_TASK_GATE_ADDRESS`
- `VITE_PROOFLY_REGISTRY_ADDRESS`
- `VITE_PROOFLY_POLICY_ADDRESS`
- `VITE_PROOFLY_SESSION_ADDRESS`
- `VITE_PROOFLY_TASK_GATE_ADDRESS`

Or sync them automatically:

```bash
corepack pnpm live:sync-contract-env
```

## 6) Build validation

```bash
corepack pnpm --filter @proofly/contracts build
corepack pnpm --filter @proofly/extension typecheck
corepack pnpm --filter @proofly/web typecheck
corepack pnpm --filter @proofly/web build
corepack pnpm --filter @proofly/extension build
```

## 7) Deploy web app

- Deploy `apps/web` to your host of choice (Vercel, Azure App Service, etc.).
- Ensure all env vars used by the web app are set in host configuration.
- Set `VITE_PROOFLY_API_BASE_URL` in extension build environment to the deployed web origin.

## 8) Build and publish extension

```bash
corepack pnpm --filter @proofly/extension build
```

- Package extension from the build output and publish to Chrome Web Store.
- Verify extension host permissions are acceptable for your distribution policy.

## 9) Smoke test checklist

- Wallet challenge and sign-in succeeds.
- `wallet_sessions` row is written after sign-in.
- World ID verify flow writes `proof_events` and `audit_logs`.
- Policy creation writes `policy_sessions` and `audit_logs`.
- Media sign writes `media_signatures` and `audit_logs`.
- Sending transaction writes `transaction_events` and `audit_logs`.

## 10) Operations baseline

- Enable Supabase PITR/backups.
- Enable API and extension error monitoring.
- Rotate deployer and service-role secrets periodically.
- Keep `DEPLOYER_PRIVATE_KEY` out of client environments.
