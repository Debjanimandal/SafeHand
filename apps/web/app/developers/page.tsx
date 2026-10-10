'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function DevelopersPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<'sdk' | 'vanilla' | 'react'>('sdk');
  const [copied, setCopied] = useState<string | null>(null);

  // Live tester state
  const [testState, setTestState] = useState<'idle' | 'running' | 'success' | 'blocked' | 'error'>('idle');
  const [testOutput, setTestOutput] = useState<{
    title: string;
    status: string;
    message: string;
    data?: unknown;
  } | null>(null);

  function copyCode(text: string, id: string) {
    void navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function testSdkAction(actionType: 'detect' | 'permitted' | 'overlimit' | 'unapproved') {
    setTestState('running');
    setTestOutput(null);

    const w = typeof window !== 'undefined' ? (window as unknown as { safehand?: { request: (args: unknown) => Promise<unknown> }; proofly?: { request: (args: unknown) => Promise<unknown> } }) : null;
    const provider = w?.safehand ?? w?.proofly;

    if (actionType === 'detect') {
      if (provider) {
        setTestState('success');
        setTestOutput({
          title: 'Provider Discovery',
          status: 'SUCCESS',
          message: 'SafeHand EIP-1193 / EIP-6963 provider discovered on window.safehand!',
          data: {
            rdns: 'xyz.safehand.wallet',
            isSafeHand: true,
            supportedMethods: ['eth_requestAccounts', 'eth_sendTransaction', 'personal_sign', 'wallet_switchEthereumChain'],
          },
        });
      } else {
        setTestState('blocked');
        setTestOutput({
          title: 'Provider Discovery',
          status: 'NOT_FOUND',
          message: 'SafeHand extension not detected in this browser tab. Ensure the extension is loaded from apps/extension/dist and refresh.',
        });
      }
      return;
    }

    if (!provider) {
      setTestState('blocked');
      setTestOutput({
        title: 'Extension Required',
        status: 'UNAVAILABLE',
        message: 'Please install or unlock the SafeHand Extension in Chrome to run live policy actions.',
      });
      return;
    }

    try {
      if (actionType === 'permitted') {
        // Request accounts first
        const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
        const from = accounts[0];

        // 0.0001 ETH (~$0.30) to allowed Registry
        const txHash = (await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from,
            to: '0x7c2e142C203f43C5e6F9206A5c66b8A8DA9BF997',
            value: '0x38d7ea4c68000', // 0.0001 ETH
          }],
        })) as string;

        setTestState('success');
        setTestOutput({
          title: 'Permitted Transaction',
          status: 'BROADCASTED',
          message: 'Policy boundaries satisfied. Transaction broadcasted autonomously to Base Sepolia.',
          data: { txHash, network: 'Base Sepolia (84532)', status: 'submitted' },
        });
      } else if (actionType === 'overlimit') {
        const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
        const from = accounts[0];

        // 0.1 ETH (~$300 > $50 cap)
        await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from,
            to: '0x7c2e142C203f43C5e6F9206A5c66b8A8DA9BF997',
            value: '0x16345785d8a0000', // 0.1 ETH
          }],
        });
      } else if (actionType === 'unapproved') {
        const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
        const from = accounts[0];

        // Unapproved destination
        await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from,
            to: '0x0000000000000000000000000000000000000001',
            value: '0x38d7ea4c68000',
          }],
        });
      }
    } catch (err: unknown) {
      const error = err as { code?: number; message?: string };
      const msg = error?.message || 'Transaction rejected';

      if (msg.includes('exceeds policy') || msg.includes('not in the allowed destinations') || msg.includes('Policy expired') || msg.includes('revoked')) {
        setTestState('blocked');
        setTestOutput({
          title: 'Pre-Signing Denial (AI Leash Enforced)',
          status: 'POLICY_DENIED',
          message: msg,
          data: {
            guarantee: 'Zero signer calls made. Zero gas expended.',
            rejectionSource: 'Extension Local Policy Engine',
            code: 4001,
          },
        });
      } else if (error?.code === 4001) {
        setTestState('blocked');
        setTestOutput({
          title: 'User Rejected',
          status: 'USER_REJECTED',
          message: 'User rejected the transaction or connection approval in SafeHand.',
        });
      } else {
        setTestState('error');
        setTestOutput({
          title: 'Execution Error',
          status: 'ERROR',
          message: msg,
        });
      }
    }
  }

  const TS_SDK_CODE = `import { createSafeHandClient, PolicyDeniedError } from '@proofly/sdk';

// 1. Initialize client configured for Base Sepolia
const client = createSafeHandClient({ targetChainId: 84532 });

// 2. Connect to the user's SafeHand wallet
const { address } = await client.connect();
console.log('Connected agent wallet:', address);

// 3. Dispatch an AI Agent action with pre-signing policy enforcement
try {
  const txHash = await client.sendTransaction({
    to: '0x7c2e142C203f43C5e6F9206A5c66b8A8DA9BF997', // Whitelisted contract
    value: '0x38d7ea4c68000',                            // 0.0001 ETH (~$0.30)
  });
  console.log('Permitted & broadcasted to Base Sepolia:', txHash);
} catch (error) {
  if (error instanceof PolicyDeniedError) {
    // Intercepted PRE-SIGNING by SafeHand AI Leash: Zero gas lost, zero keys exposed!
    console.warn(\`Action blocked by policy: [\${error.reason}] \${error.message}\`);
  }
}`;

  const VANILLA_CODE = `// Check for injected SafeHand provider
const provider = window.safehand ?? window.proofly;
if (!provider) throw new Error('SafeHand extension not installed');

// Request account access
const accounts = await provider.request({ method: 'eth_requestAccounts' });

// Send transaction through SafeHand's policy engine
try {
  const txHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [{
      from: accounts[0],
      to: '0x7c2e142C203f43C5e6F9206A5c66b8A8DA9BF997',
      value: '0x38d7ea4c68000',
    }]
  });
  console.log('Transaction confirmed:', txHash);
} catch (err) {
  // Returns standard EIP-1193 4001 with typed policy reason message
  console.error('Policy blocked transaction:', err.message);
}`;

  const REACT_CODE = `import { useState, useEffect } from 'react';
import { createSafeHandClient, PolicyDeniedError } from '@proofly/sdk';

export function useSafeHandAgent() {
  const [address, setAddress] = useState<string | null>(null);
  const [client] = useState(() => createSafeHandClient({ targetChainId: 84532 }));

  async function connect() {
    const res = await client.connect();
    setAddress(res.address);
  }

  async function executeAgentTask(to: string, valueWei: string) {
    try {
      return await client.sendTransaction({ to, value: valueWei });
    } catch (err) {
      if (err instanceof PolicyDeniedError) {
        alert(\`Blocked by AI Leash: \${err.message}\`);
      }
      throw err;
    }
  }

  return { address, connect, executeAgentTask };
}`;

  return (
    <main className="min-h-screen bg-bg text-text px-6 py-12">
      <div className="mx-auto max-w-shell space-y-12">
        {/* Header */}
        <section className="space-y-4 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-surface/80 px-4 py-1.5 backdrop-blur-sm">
            <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-subtext">
              Developer Platform · @proofly/sdk
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            SafeHand Developer SDK & Integration Guide
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-subtext">
            Build secure AI agents and relying dApps with strict pre-signing policy enforcement, EIP-1193 / EIP-6963 provider integration, and Base Sepolia on-chain verification.
          </p>
        </section>

        {/* Quickstart Code Section */}
        <section className="rounded-3xl border border-white/[0.08] bg-surface p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.06] pb-5">
            <div>
              <h2 className="text-xl font-bold text-white font-mono">1. Integration Quickstart</h2>
              <p className="text-xs text-subtext mt-1">
                Install <code className="text-accent-bright">@proofly/sdk</code> and wrap agent transactions with deterministic policy limits.
              </p>
            </div>

            {/* Language tabs */}
            <div className="flex items-center gap-1.5 border border-white/[0.08] p-1 rounded-xl bg-card">
              <button
                onClick={() => setActiveTab('sdk')}
                className={`text-xs px-3 py-1.5 rounded-lg font-mono transition-colors ${
                  activeTab === 'sdk' ? 'bg-white text-black font-bold' : 'text-subtext hover:text-white'
                }`}
              >
                TypeScript SDK
              </button>
              <button
                onClick={() => setActiveTab('react')}
                className={`text-xs px-3 py-1.5 rounded-lg font-mono transition-colors ${
                  activeTab === 'react' ? 'bg-white text-black font-bold' : 'text-subtext hover:text-white'
                }`}
              >
                React Hook
              </button>
              <button
                onClick={() => setActiveTab('vanilla')}
                className={`text-xs px-3 py-1.5 rounded-lg font-mono transition-colors ${
                  activeTab === 'vanilla' ? 'bg-white text-black font-bold' : 'text-subtext hover:text-white'
                }`}
              >
                Raw EIP-1193
              </button>
            </div>
          </div>

          {/* Installation snippet */}
          <div className="rounded-xl border border-white/[0.06] bg-card p-4 flex items-center justify-between font-mono text-xs">
            <span className="text-white/80">
              <span className="text-muted">npm install</span> @proofly/sdk viem
            </span>
            <button
              onClick={() => copyCode('npm install @proofly/sdk viem', 'install')}
              className="text-[11px] text-muted hover:text-white transition-colors"
            >
              {copied === 'install' ? 'Copied ✓' : 'Copy'}
            </button>
          </div>

          {/* Code Viewer */}
          <div className="relative rounded-2xl border border-white/[0.06] bg-black p-5 font-mono text-xs overflow-x-auto">
            <button
              onClick={() =>
                copyCode(
                  activeTab === 'sdk' ? TS_SDK_CODE : activeTab === 'react' ? REACT_CODE : VANILLA_CODE,
                  'code'
                )
              }
              className="absolute top-4 right-4 text-[11px] text-muted hover:text-white transition-colors border border-white/10 px-2 py-1 rounded"
            >
              {copied === 'code' ? 'Copied ✓' : 'Copy Code'}
            </button>
            <pre className="text-white/90 leading-relaxed">
              <code>{activeTab === 'sdk' ? TS_SDK_CODE : activeTab === 'react' ? REACT_CODE : VANILLA_CODE}</code>
            </pre>
          </div>
        </section>

        {/* Live In-Browser SDK Playground */}
        <section className="rounded-3xl border border-white/[0.08] bg-surface p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.06] pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-400" />
                <h2 className="text-xl font-bold text-white font-mono">2. Interactive Policy Playground</h2>
              </div>
              <p className="text-xs text-subtext mt-1">
                Exercise your installed SafeHand extension directly from this page to see policy decisions in real-time.
              </p>
            </div>
            <Link
              href="http://localhost:3001"
              target="_blank"
              className="btn-ghost text-xs py-2 px-3 self-start sm:self-auto flex items-center gap-1.5 border border-white/20 rounded-xl"
            >
              <span>Open CivicVault Demo ↗</span>
            </Link>
          </div>

          {/* Test Buttons Grid */}
          <div className="grid sm:grid-cols-4 gap-3">
            <button
              disabled={testState === 'running'}
              onClick={() => void testSdkAction('detect')}
              className="p-4 rounded-xl border border-white/[0.08] bg-card hover:border-white/20 transition-all text-left space-y-1"
            >
              <p className="font-mono text-xs font-bold text-white">1. Detect Provider</p>
              <p className="text-[11px] text-muted">Checks window.safehand / EIP-6963 announcement</p>
            </button>

            <button
              disabled={testState === 'running'}
              onClick={() => void testSdkAction('permitted')}
              className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 transition-all text-left space-y-1"
            >
              <p className="font-mono text-xs font-bold text-emerald-400">2. Permitted Tx</p>
              <p className="text-[11px] text-muted">0.0001 ETH within $50 cap to allowed contract</p>
            </button>

            <button
              disabled={testState === 'running'}
              onClick={() => void testSdkAction('overlimit')}
              className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 transition-all text-left space-y-1"
            >
              <p className="font-mono text-xs font-bold text-amber-400">3. Over-Limit Test</p>
              <p className="text-[11px] text-muted">0.1 ETH (~$300) exceeds $50 ceiling</p>
            </button>

            <button
              disabled={testState === 'running'}
              onClick={() => void testSdkAction('unapproved')}
              className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 hover:border-red-500/50 transition-all text-left space-y-1"
            >
              <p className="font-mono text-xs font-bold text-red-400">4. Target Violation</p>
              <p className="text-[11px] text-muted">Destination not on policy allowlist</p>
            </button>
          </div>

          {/* Playground Output */}
          <AnimatePresence>
            {testOutput && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className={`p-5 rounded-2xl border font-mono text-xs space-y-2 ${
                  testState === 'success'
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : testState === 'blocked'
                    ? 'border-amber-500/40 bg-amber-500/10'
                    : 'border-red-500/40 bg-red-500/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white uppercase">{testOutput.title}</span>
                  <span
                    className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                      testState === 'success'
                        ? 'border-emerald-500 text-emerald-300'
                        : testState === 'blocked'
                        ? 'border-amber-500 text-amber-300'
                        : 'border-red-500 text-red-300'
                    }`}
                  >
                    {testOutput.status}
                  </span>
                </div>
                <p className="text-white/80">{testOutput.message}</p>
                {testOutput.data ? (
                  <pre className="bg-black/40 p-3 rounded-lg overflow-x-auto text-[11px] text-white/70">
                    {JSON.stringify(testOutput.data, null, 2)}
                  </pre>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Typed Error Taxonomy & Specifications */}
        <section className="rounded-3xl border border-white/[0.08] bg-surface p-6 sm:p-8 space-y-6">
          <h2 className="text-xl font-bold text-white font-mono">3. Error Taxonomy & Pre-Signing Codes</h2>
          <p className="text-xs text-subtext">
            SafeHand maps standard EIP-1193 rejection codes (4001, 4100, 4902) to strongly typed errors in <code className="text-accent-bright">@proofly/sdk</code>.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-muted">
                  <th className="py-3 px-4">Error Class</th>
                  <th className="py-3 px-4">EIP-1193 Code</th>
                  <th className="py-3 px-4">Reason / Description</th>
                  <th className="py-3 px-4">Zero-Gas Guarantee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                <tr>
                  <td className="py-3 px-4 font-bold text-amber-400">PolicyDeniedError</td>
                  <td className="py-3 px-4 text-white">4001</td>
                  <td className="py-3 px-4 text-subtext">VALUE_LIMIT_EXCEEDED, DESTINATION_NOT_ALLOWED, POLICY_EXPIRED</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">Yes (Pre-Signing)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-amber-400">UserRejectedError</td>
                  <td className="py-3 px-4 text-white">4001</td>
                  <td className="py-3 px-4 text-subtext">User declined connection or manual signing popup</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">Yes</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-red-400">ProviderNotFoundError</td>
                  <td className="py-3 px-4 text-white">4900</td>
                  <td className="py-3 px-4 text-subtext">SafeHand extension is not installed or active in browser</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">N/A</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-cyan-400">WrongChainError</td>
                  <td className="py-3 px-4 text-white">4902</td>
                  <td className="py-3 px-4 text-subtext">Wallet is connected to chain other than Base Sepolia (84532)</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">Yes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Smart Contracts & Explorer */}
        <section className="rounded-3xl border border-white/[0.08] bg-surface p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.06] pb-5">
            <div>
              <h2 className="text-xl font-bold text-white font-mono">4. Deployed Smart Contracts (Base Sepolia)</h2>
              <p className="text-xs text-subtext mt-1">
                Verified testnet contracts backing humanity verification, policy anchoring, and task gating.
              </p>
            </div>
            <span className="font-mono text-xs px-2.5 py-1 bg-white/[0.04] border border-white/10 rounded-lg text-muted">
              Chain ID: 84532 (0x14a34)
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-white/[0.06] bg-card space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Registry Contract</span>
              <p className="text-sm font-bold text-white font-mono">ProoflyRegistry</p>
              <a
                href="https://sepolia.basescan.org/address/0x7c2e142C203f43C5e6F9206A5c66b8A8DA9BF997"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-accent-bright hover:underline font-mono break-all block pt-1"
              >
                0x7c2e142C203f43C5e6F9206A5c66b8A8DA9BF997 ↗
              </a>
            </div>

            <div className="p-4 rounded-2xl border border-white/[0.06] bg-card space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Policy Anchoring</span>
              <p className="text-sm font-bold text-white font-mono">ProoflyPolicy</p>
              <a
                href="https://sepolia.basescan.org/address/0xd7b102FaCe7b18DE434a9eaF2D3CE7c2BE8ec97E"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-accent-bright hover:underline font-mono break-all block pt-1"
              >
                0xd7b102FaCe7b18DE434a9eaF2D3CE7c2BE8ec97E ↗
              </a>
            </div>

            <div className="p-4 rounded-2xl border border-white/[0.06] bg-card space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Session Gating</span>
              <p className="text-sm font-bold text-white font-mono">ProoflySession</p>
              <a
                href="https://sepolia.basescan.org/address/0x5548E68dD468123BB4d0FB403B5F1402d1b0A9Cf"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-accent-bright hover:underline font-mono break-all block pt-1"
              >
                0x5548E68dD468123BB4d0FB403B5F1402d1b0A9Cf ↗
              </a>
            </div>

            <div className="p-4 rounded-2xl border border-white/[0.06] bg-card space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Autonomous Task Gate</span>
              <p className="text-sm font-bold text-white font-mono">ProoflyTaskGate</p>
              <a
                href="https://sepolia.basescan.org/address/0x32cC06E48B61F22a41956a913101d1A9bCb70572"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-accent-bright hover:underline font-mono break-all block pt-1"
              >
                0x32cC06E48B61F22a41956a913101d1A9bCb70572 ↗
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
