# SafeHand — Permission & Verification Layer for AI Agents

SafeHand is a developer-integrable permission layer for AI agents that execute EVM transactions. It enforces strict local policy boundaries ("AI Leash") before cryptographic signing, blocks unauthorized actions pre-signing with zero broadcasted funds, and records a truthful audit trail in PostgreSQL.

---

## 1. Project Architecture

The workspace consists of three connected surfaces:

1. **SafeHand Browser Extension (`apps/extension`)**:
   - Manifest V3 Chrome Extension.
   - Secure encrypted local keystore (AES-GCM).
   - Injected EIP-1193 / EIP-6963 provider (`window.safehand`, with `window.proofly` backwards compatibility).
   - "AI Leash" policy engine (`src/policy/agent-rules.ts`): enforces maximum USD limits per transaction, destination allowlists, expiration, and revocation *before* transaction signing.
   - Built to `apps/extension/dist`.

2. **SafeHand Developer SDK (`packages/sdk`)**:
   - Browser TypeScript SDK for relying dApps and AI agent frameworks.
   - Clean provider discovery (`getSafeHandProvider`, EIP-6963 announcement listeners).
   - Client wrapper (`createSafeHandClient`) with typed errors: `PolicyDeniedError`, `UserRejectedError`, `ProviderNotFoundError`, `WrongChainError`.

3. **CivicVault Relying Application Demo (`mock-website`)**:
   - Next.js 14 relying dApp demonstrating live integration with the installed SafeHand extension.
   - Zero simulated timers or hardcoded fake addresses: communicates with `window.safehand` via `eth_requestAccounts`.
   - AI Leash Execution Console: live triggers for permitted actions (within bounds), over-limit actions ($300 > $50 cap), unapproved contract destinations, and revocation testing.

4. **SafeHand SaaS & Audit Console (`apps/web`)**:
   - Next.js 15 developer portal and telemetry ingestion (`/api/tx/event`).
   - Real-time audit log (`/activity`) fed by Neon PostgreSQL (`public.audit_logs`, `public.transaction_events`).

5. **Smart Contracts (Base Sepolia Chain ID 84532)**:
   - `ProoflyRegistry`: `0x7c2e142C203f43C5e6F9206A5c66b8A8DA9BF997`
   - `ProoflyPolicy`: `0xd7b102FaCe7b18DE434a9eaF2D3CE7c2BE8ec97E`
   - `ProoflySession`: `0x5548E68dD468123BB4d0FB403B5F1402d1b0A9Cf`
   - `ProoflyTaskGate`: `0x32cC06E48B61F22a41956a913101d1A9bCb70572`

---

## 2. Quickstart & Local Setup

### Prerequisites
- Node.js >= 18.0.0
- pnpm >= 9.0.0
- Google Chrome browser

### 1. Build the SafeHand Extension
```bash
cd D:\Proofly\hackstorm
pnpm install
pnpm --filter @proofly/extension build
```
The compiled extension is output to `apps/extension/dist`.

**To load into Chrome:**
1. Open Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the folder `D:\Proofly\hackstorm\apps\extension\dist`.
4. Pin the SafeHand Wallet icon to your toolbar.
5. Click the extension icon, create a new wallet or import a seed phrase, and set your password.

### 2. Run the Developer SaaS & Telemetry Backend
```bash
cd D:\Proofly\hackstorm
pnpm --filter @proofly/web dev
```
Runs at `http://localhost:3000`. The live audit feed is visible at `http://localhost:3000/activity`.

### 3. Run the CivicVault Relying dApp Demo
```bash
cd D:\Proofly\mock-website
npm install
npm run dev
```
Runs at `http://localhost:3001`.

---

## 3. Running Automated Tests

Run the full test suite (SDK & policy boundary tests):
```bash
cd D:\Proofly\hackstorm
pnpm test
```
All 11 tests execute in ~300ms, verifying:
- ✅ Permitted transactions within limits pass.
- ✅ Exceeding `maxLimitUSD` throws `VALUE_LIMIT_EXCEEDED` pre-signing.
- ✅ Calling unapproved destinations throws `DESTINATION_NOT_ALLOWED` pre-signing.
- ✅ Expired policies throw `POLICY_EXPIRED` pre-signing.
- ✅ Revoked policies throw `POLICY_REVOKED` pre-signing.
- ✅ SDK provider discovery and error parsing (`parseProviderError`).

---

## 4. 5-Minute Pilot Demo Runbook

Follow this sequence to demonstrate SafeHand's end-to-end capabilities:

1. **Configure AI Leash in Extension**:
   - Open the SafeHand extension popup.
   - Click the **Policy** tab in the navigation bar.
   - Observe the active boundary or save a new policy:
     - Target address: `0x7c2e142C203f43C5e6F9206A5c66b8A8DA9BF997`
     - Max Limit: `$50 USD`
     - Duration: `60 minutes`
   - Click **Save Policy**. Notice the active countdown timer and limits.

2. **Connect CivicVault Relying dApp**:
   - Open `http://localhost:3001` in your browser.
   - Click **Verify with SafeHand**.
   - SafeHand's real EIP-1193 provider requests account access. Approve the connection.
   - CivicVault displays your real wallet address and advances to the dashboard.

3. **Execute Allowed Agent Transaction (Scenario B)**:
   - On the CivicVault Dashboard (`http://localhost:3001/dashboard`), navigate to the **AI Agent Leash Console** tab.
   - Click **Execute Permitted Tx** (Action A: 0.0001 ETH / ~$0.30 to the whitelisted contract).
   - Because the action is within all policy constraints, the extension authorizes and broadcasts the transaction autonomously without interrupting the user.
   - The UI shows `BROADCASTED ✓` with the live BaseScan Sepolia transaction link.

4. **Trigger Value-Limit Violation (Scenario C)**:
   - Click **Test Over-Limit (Violation)** (Action B: 0.1 ETH / ~$300, which exceeds the $50 cap).
   - SafeHand's policy engine intercepts the call *before* signing.
   - CivicVault immediately shows `PRE-SIGNING DENIAL ✓` with reason: `Transaction value exceeds policy maxLimitUSD ($300.00 > $50)`.
   - Zero private keys were accessed and zero funds were broadcasted.

5. **Trigger Destination Allowlist Violation (Scenario D)**:
   - Click **Test Unapproved Target** (Action C: sending to unapproved destination `0x000...001`).
   - SafeHand intercepts the call pre-signing.
   - CivicVault displays `PRE-SIGNING DENIAL ✓` with reason: `Target contract is not in the allowed destinations list`.

6. **Revoke Policy & Verify Subsequent Denial (Scenario E)**:
   - Open the SafeHand extension > **Policy** tab.
   - Click **Revoke Policy**.
   - Return to CivicVault and attempt any transaction. The action is blocked with `POLICY_REVOKED` or requires manual user approval.

7. **Inspect the Audit Log (Scenario G)**:
   - Visit `http://localhost:3000/activity`.
   - Observe the real recorded audit events stored in Neon PostgreSQL:
     - `submitted` and `confirmed` for the permitted transaction.
     - `rejected` (source: policy) for the blocked pre-signing actions.

---

## 5. Security & Trust Boundaries

- **Zero Server-Side Private Keys**: Private keys and seed phrases remain strictly encrypted in the local browser extension storage (`chrome.storage.local`). The backend never receives raw credentials.
- **Fail-Safe Price Oracles**: If external price feed queries fail or rate-limit, the extension applies a conservative reference ceiling to prevent security bypasses.
- **Pre-Signing Interception**: Policy checks occur in `apps/extension/src/background/rpc-handler.ts` *before* `signAndBroadcastTransaction`. Rejections throw standard EIP-1193 code `4001` with typed reason codes.
