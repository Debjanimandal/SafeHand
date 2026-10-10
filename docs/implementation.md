# Proofly Implementation Plan
## A-Z real build guide for the Chrome wallet, ZK human proof, Supabase backend, and Base Sepolia contracts

This document is the implementation manual for Proofly.

It is written for a team that wants to build the product as a real system with:
- a production-grade entry-level Chrome extension wallet,
- a real zero-knowledge human proof flow,
- a real Next.js dApp,
- a real Supabase backend,
- a real Solidity contract layer on Base Sepolia,
- support for both testnet and mainnet configuration inside the wallet.

The default deployment path for development and hackathon demo is Base Sepolia. The wallet itself must be capable of switching to real EVM networks later through the same provider and chain configuration system.

---

# 1. Build goals

Proofly must work end to end as a real wallet-first identity and trust system.

It must support:
1. wallet creation and import,
2. encrypted local storage,
3. dApp connection,
4. EIP-1193 provider behavior,
5. human proof generation,
6. proof verification,
7. on-chain trust state,
8. Supabase-backed operational data,
9. AI permission rules,
10. media signing,
11. real-time UI updates.

Nothing in the visible product should depend on fake success responses.

---

# 2. Final implementation stack

## Frontend
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- viem
- wagmi where convenient for dApp integration

## Wallet
- Chrome Extension Manifest V3
- background service worker
- content script
- injected provider
- popup UI
- options page
- local encrypted storage
- signing engine
- proof engine
- policy engine

## ZK
- World ID / IDKit for proof-of-human

## Backend
- Supabase Postgres
- Supabase Auth
- Supabase RLS
- Supabase Edge Functions
- Supabase Storage
- Supabase Realtime

## Chain
- Base Sepolia for development and demo
- Base mainnet compatibility in wallet config for later real-network use

## Contracts
- Solidity
- deployed on Base Sepolia first

---

# 3. Repository structure

Use a monorepo.

```text
proofly/
├── apps/
│   ├── web/                      # Next.js dApp, marketplace, dashboard
│   └── extension/                # Chrome extension wallet
├── contracts/                    # Solidity contracts
├── supabase/                     # DB schema, RLS, Edge Functions
├── packages/
│   ├── shared/                   # Shared types, schemas, helpers
│   ├── chain/                    # Base Sepolia / Base mainnet chain helpers
│   ├── zk/                       # World ID integration helpers
│   ├── wallet-core/              # Wallet signing, storage, policy logic
│   └── ui/                       # Shared UI components if needed
├── docs/
│   ├── implementation.md
│   ├── technicalstack.md
│   ├── architecture.md
│   ├── api.md
│   └── demo-flow.md
└── package.json
```

---

# 4. Folder-by-folder responsibilities

## `apps/extension`
The real wallet extension.

Contains:
- wallet creation/import
- password unlock
- encrypted storage
- provider injection
- signing prompts
- chain switching
- human proof launch
- policy enforcement
- media hash signing

## `apps/web`
The real dApp.

Contains:
- landing page
- wallet connect flow
- verify-human flow
- worker marketplace
- task gating
- AI agent console
- proof status views
- media signing views
- admin/debug screens

## `contracts`
Contains:
- proof registry
- policy registry
- session controls
- task gating contracts
- event emission

## `supabase`
Contains:
- database schema
- migration files
- row-level security policies
- edge functions
- storage rules
- realtime subscriptions

## `packages/shared`
Contains:
- shared types
- Zod schemas
- JSON schemas
- enums
- utility functions

## `packages/chain`
Contains:
- Base Sepolia chain constants
- Base mainnet chain constants
- contract addresses by environment
- viem clients
- transaction helpers

## `packages/zk`
Contains:
- World ID request/response helpers
- proof payload normalization
- nullifier tracking helpers

## `packages/wallet-core`
Contains:
- key generation
- encryption
- signing
- policy rules
- chain switching
- provider message routing

---

# 5. Implementation order

Build in this order:

1. monorepo scaffold,
2. extension wallet skeleton,
3. provider injection,
4. wallet create/import/unlock,
5. Supabase schema,
6. Next.js dApp shell,
7. World ID proof flow,
8. on-chain proof registry,
9. policy engine,
10. AI leash,
11. media signing,
12. realtime updates,
13. QA and hardening,
14. demo packaging.

---

# 6. Day-zero scaffold

## Commands
Use a single monorepo toolchain and keep it consistent.

Recommended choices:
- pnpm
- TurboRepo or Nx
- TypeScript everywhere
- ESLint + Prettier
- environment files per app

## Setup checklist
- install Node LTS
- initialize pnpm workspace
- create `apps/web`
- create `apps/extension`
- create `contracts`
- create `supabase`
- create `packages/shared`
- create `packages/chain`
- create `packages/zk`
- create `packages/wallet-core`

---

# 7. Wallet implementation guide

## 7.1 Wallet creation
The wallet must support:
- create new seed phrase
- import existing seed phrase
- generate address
- display address
- copy address
- show network
- show proof status

### Local key flow
1. generate mnemonic locally,
2. derive private key,
3. encrypt private key,
4. store encrypted payload in extension storage,
5. derive address from public key,
6. show wallet home.

### Security rules
- never send seed phrase to a server,
- never store raw private key,
- never expose keys in the content script,
- never inject remote code.

## 7.2 Wallet unlock
Use a local password or passphrase to decrypt the key payload.

### Unlock flow
1. user opens extension,
2. user enters password,
3. extension decrypts local payload,
4. wallet session becomes active,
5. provider becomes usable.

## 7.3 Signing
Support:
- `personal_sign`
- `eth_signTypedData_v4`
- `eth_sendTransaction`

### Signing UX
Always show:
- chain,
- contract,
- method,
- amount,
- recipient,
- nonce if relevant,
- warning if the request is risky.

## 7.4 Chain switching
Support:
- Base Sepolia,
- Base mainnet,
- explicit network selection,
- user-approved chain switching.

The wallet should load its supported chain registry from local code, not from a remote database.

## 7.5 Provider injection
Expose an EIP-1193 provider to dApps.

Required methods:
- `eth_requestAccounts`
- `eth_accounts`
- `eth_chainId`
- `personal_sign`
- `eth_signTypedData_v4`
- `eth_sendTransaction`
- `wallet_switchEthereumChain`
- `wallet_addEthereumChain`

Required events:
- `connect`
- `disconnect`
- `accountsChanged`
- `chainChanged`

## 7.6 Real wallet-quality baseline
The wallet should behave like a small, production-grade entry-level wallet:
- stable unlock/lock state,
- secure local storage,
- clear signature screens,
- clear transaction previews,
- explicit chain context,
- basic session timeout,
- clear error messages,
- recovery phrase backup.

---

# 8. Chrome extension implementation

## Manifest V3 requirements
- use a background service worker,
- use content scripts only where needed,
- inject the provider cleanly,
- keep permissions minimal,
- avoid remote-hosted code.

## Extension files
```text
apps/extension/
├── manifest.json
├── src/
│   ├── background/
│   ├── content/
│   ├── injected/
│   ├── popup/
│   ├── options/
│   ├── storage/
│   ├── wallet/
│   ├── zk/
│   ├── policy/
│   └── shared/
```

## Extension flow
1. browser loads extension,
2. service worker initializes,
3. provider becomes available,
4. popup handles wallet UX,
5. background handles approval state,
6. content script bridges the page and the injected provider,
7. wallet signs or rejects requests.

---

# 9. Supabase implementation

Supabase is for operational state, not for private keys.

## Tables

### `wallet_profiles`
- wallet_address
- display_name
- created_at
- active_chain
- verification_status

### `proof_events`
- id
- wallet_address
- proof_provider
- action
- nullifier_hash
- status
- verified_at
- chain_id
- tx_hash

### `policy_sessions`
- id
- wallet_address
- agent_id
- spend_limit
- token_allowlist
- contract_allowlist
- valid_from
- valid_until
- status

### `media_signatures`
- id
- wallet_address
- file_hash
- signature
- proof_id
- created_at

### `task_submissions`
- id
- wallet_address
- task_id
- submission_hash
- status
- verified_at

### `audit_logs`
- id
- actor_address
- event_type
- target_id
- tx_hash
- created_at

## Supabase security rules
- enable RLS on every table,
- use authenticated JWTs,
- write per-user policies,
- keep admin writes behind Edge Functions,
- never allow raw key access,
- never trust client-side writes alone for critical state.

## Realtime usage
Use Realtime for:
- proof accepted,
- task unlocked,
- policy changed,
- signature recorded,
- contract event indexed.

---

# 10. World ID implementation

World ID is the first real human-proof provider.

## Flow
1. user clicks verify,
2. extension or web app opens the proof widget,
3. user completes verification,
4. proof and nullifier are returned,
5. proof is stored locally,
6. proof is written to Supabase,
7. optional on-chain record is submitted,
8. dApp unlocks the protected path.

## Required handling
- store nullifier hashes to avoid repeated use,
- bind proof to action scope,
- treat proof as trust evidence, not identity disclosure,
- fail closed if the proof is invalid.

---

# 11. Smart contract implementation

## Contract order
1. `ProoflyRegistry.sol`
2. `ProoflyPolicy.sol`
3. `ProoflySession.sol`
4. `ProoflyTaskGate.sol`

## Contract behavior
- record verified-human state,
- store policy hashes,
- track active delegation sessions,
- validate protected task access,
- emit events for Supabase indexing.

## Contract deployment
- deploy to Base Sepolia first,
- keep contract addresses in environment files,
- index events into Supabase,
- only later mirror to Base mainnet when the build is ready.

---

# 12. API endpoints

Use Next.js route handlers or Supabase Edge Functions for stable APIs.

## Core endpoints
- `POST /api/wallet/challenge`
- `POST /api/wallet/verify`
- `POST /api/zk/worldid/start`
- `POST /api/zk/worldid/confirm`
- `POST /api/agent/policy/create`
- `POST /api/agent/policy/authorize`
- `POST /api/media/hash`
- `POST /api/media/sign`
- `POST /api/chain/event-sync`

## Endpoint rules
- validate input with Zod,
- authenticate every write,
- log every important action,
- reject malformed payloads,
- never rely on the frontend for trust.

---

# 13. dApp implementation

## Web app pages
- `/`
- `/wallet`
- `/verify`
- `/marketplace`
- `/marketplace/tasks`
- `/agent`
- `/media`
- `/admin`

## Web app responsibilities
- connect to extension,
- read wallet state,
- show proof status,
- show policy status,
- submit contract writes,
- display realtime updates from Supabase,
- support both testnet and mainnet network awareness.

## Frontend state model
- wallet connected / disconnected,
- unlocked / locked,
- human verified / unverified,
- chain selected,
- session active / expired,
- policy active / inactive,
- task unlocked / locked.

---

# 14. AI leash implementation

This is a real policy engine.

## Policy fields
- max spend amount,
- token allowlist,
- contract allowlist,
- method allowlist,
- valid time window,
- chain scope,
- recipient scope,
- session scope.

## Behavior
1. user creates policy,
2. wallet stores policy locally,
3. policy hash is written to Supabase and optionally on-chain,
4. AI agent requests an action,
5. wallet checks the policy,
6. wallet signs only if allowed,
7. wallet rejects otherwise.

## Golden rule
AI never signs itself. The wallet signs for the user only after local policy approval.

---

# 15. Media signing implementation

## Audio / media flow
1. user selects a file,
2. extension computes hash locally,
3. wallet signs the hash,
4. proof state is attached if available,
5. metadata is stored in Supabase,
6. recipient can verify the signature trail.

## What this solves
- source attribution,
- tamper-evident media trail,
- wallet-backed human ownership,
- proof-linked media trust.

---

# 16. Testnet and mainnet support

The system must support both.

## Development mode
- Base Sepolia
- test contract addresses
- test faucet funding
- test proof flows
- test logs in Supabase

## Production mode
- Base mainnet configuration in wallet
- real chain IDs and RPCs
- final contract deployments later
- same provider and signing logic

## Switching rule
Never hardcode one chain in the wallet core. Use a chain registry with per-environment config.

---

# 17. Environment variables

## Web app
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL`
- `NEXT_PUBLIC_BASE_MAINNET_RPC_URL`
- `NEXT_PUBLIC_PROOFLY_CONTRACT_ADDRESS`
- `NEXT_PUBLIC_WORLD_APP_ID`

## Extension
- environment values for chain registry,
- proof provider IDs,
- contract addresses,
- local build flags.

## Supabase functions
- service role key,
- proof verifier credentials if needed,
- webhook secret,
- contract sync key.

---

# 18. Testing plan

## Wallet tests
- create wallet
- import wallet
- unlock wallet
- lock wallet
- sign message
- sign transaction
- switch chain
- reject risky request
- decrypt/encrypt round trip

## Extension tests
- provider injection works,
- dApp can connect,
- multiple tabs do not break state,
- service worker wakes correctly,
- signature prompt appears correctly.

## Contract tests
- proof registry write,
- policy hash write,
- session creation,
- task gating,
- event emission.

## Backend tests
- Supabase insert and read,
- RLS policy checks,
- proof event indexing,
- realtime updates,
- API validation.

## End-to-end tests
- wallet create → verify → task unlock,
- wallet create → policy create → agent approval,
- media hash → signature → stored audit record.

---

# 19. Suggested task split

## Person A
- extension wallet
- provider injection
- signing
- storage

## Person B
- contracts
- event indexing
- chain config
- testnet deployment

## Person C
- Next.js dApp
- Supabase schema
- realtime UI
- dashboards

## Person D
- World ID flow
- policy engine
- AI leash
- demo script

---

# 20. Implementation milestones

## Milestone 1
Wallet extension opens, creates wallets, stores keys locally, signs messages.

## Milestone 2
DApp connects to wallet and reads chain/network state.

## Milestone 3
World ID proof flow works and verification state persists.

## Milestone 4
Base Sepolia contracts accept proof-linked trust state.

## Milestone 5
Supabase stores proof logs, policies, media hashes, and task records.

## Milestone 6
AI leash enforces spend and contract limits.

## Milestone 7
Media signing works end to end.

## Milestone 8
Realtime dashboard shows live state changes.

---

# 21. Acceptance criteria

Proofly is considered implemented correctly only if all of these are true:

- wallet creation works locally,
- private keys never leave the extension,
- provider is usable by a real dApp,
- human proof works with a real ZK provider,
- proof state is stored,
- contract state is written on Base Sepolia,
- Supabase stores operational records,
- AI permissions are enforced locally,
- media hashes can be signed,
- the system works on testnet now and is configurable for mainnet later.

---

# 22. Final implementation rule

Every feature in Proofly must resolve to one of these layers:

1. extension wallet,
2. chain contract,
3. Supabase operational backend,
4. Next.js web app,
5. World ID proof provider.

If a feature does not fit one of these layers, it is not part of the real build.
