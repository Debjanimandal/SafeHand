# prerequisites.md
## Proofly Setup Prerequisites
### Short checklist for what must be ready before implementation

This file lists the minimum setup required to build Proofly cleanly.

Keep this document simple.  
If a item is not ready here, the build should not start yet.

---

## 1. Core accounts to create

### Required
- GitHub account
- Supabase account
- Wallet account for testing
- Base Sepolia access
- World ID / proof provider account
- OpenAI / AI provider account if AI features are used
- Domain or deployment account if needed later

### Optional but useful
- Cloud storage account
- Analytics account
- Error tracking account

---

## 2. API keys and credentials needed

### Frontend / web app
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_WORLD_APP_ID`
- `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL`

### Backend / server
- `SUPABASE_SERVICE_ROLE_KEY`
- proof verification secret if required by the provider
- webhook secret if contract or backend sync uses webhooks
- optional AI provider API key
- optional storage service keys

### Extension
- local chain config values
- contract addresses
- proof provider app id
- environment flags for testnet and mainnet mode

---

## 3. Authentication and authorization setup

### Supabase auth
- enable authentication
- choose sign-in method
- configure session duration
- enable row-level security on all important tables

### Wallet auth
- wallet signature login must be enabled
- sign-in challenge must be nonce-based
- challenge must expire
- signature must be verified server-side

### Proof auth
- proof provider must be configured correctly
- proof requests must be bound to the right app
- nullifier handling must be enabled if required

### Admin auth
- admin dashboard access must be restricted
- privileged writes must go through server-side functions only

---

## 4. Blockchain setup

### Required chain
- Base Sepolia only for the main build path

### Needed values
- chain id
- RPC URL
- contract addresses
- explorer link
- deployment wallet
- faucet access for testing

### Contract outputs to track
- deployment transaction hash
- contract address hash / deployed address
- event transaction hashes
- verification transaction hashes
- policy transaction hashes

---

## 5. Wallet setup

### Wallet needs
- one test wallet for development
- one separate wallet for deployment or admin tasks
- seed phrase backup
- local password protection

### Wallet features to be ready
- create wallet
- import wallet
- unlock wallet
- sign message
- sign typed data
- sign transaction
- switch chain
- show connection status

---

## 6. Database setup

### Supabase tables to prepare
- `wallet_profiles`
- `proof_events`
- `policy_sessions`
- `media_signatures`
- `transaction_events`
- `audit_logs`

### Must-have database rules
- row-level security enabled
- service-role access only in backend functions
- public access blocked for sensitive tables
- timestamps stored in UTC
- hashes stored for auditability

---

## 7. Hashes and identifiers to track

### Must store
- wallet address
- challenge hash
- signature hash
- transaction hash
- contract address
- proof nullifier hash
- file hash for media
- policy hash
- session id
- chain id

### Why
These values are the audit trail for Proofly.  
They connect the wallet, the website, the backend, and the chain.

---

## 8. Local development tools

### Required
- Node.js LTS
- pnpm
- Git
- browser that supports extensions
- code editor
- extension build tooling
- Solidity toolchain for contracts

### Recommended
- formatter
- linter
- environment file manager
- local test wallet
- chain client library

---

## 9. Implementation order

1. Set up repo and folders.
2. Configure environment files.
3. Prepare Supabase schema.
4. Configure Base Sepolia.
5. Build wallet extension shell.
6. Build website shell.
7. Connect wallet auth.
8. Add proof flow.
9. Add transaction flow.
10. Add policy and media signing.
11. Add realtime sync.
12. Test end to end.

---

## 10. Minimum readiness checklist

Before coding, make sure all of these are ready:

- [ ] GitHub repo created
- [ ] Supabase project created
- [ ] Wallet test account ready
- [ ] Base Sepolia RPC set
- [ ] World ID or proof provider configured
- [ ] env file template created
- [ ] contract deployment wallet ready
- [ ] RLS plan written
- [ ] sign-in challenge flow decided
- [ ] transaction hash logging decided
- [ ] proof hash logging decided

---

## 11. Simple rule

If the keys, auth, chain config, and database are not ready, the build should stop and setup should be completed first.
