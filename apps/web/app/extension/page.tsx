'use client';

import Link from 'next/link';

export default function ExtensionGuidePage(): JSX.Element {
  return (
    <main className="min-h-screen bg-bg text-text px-6 py-12">
      <div className="mx-auto max-w-shell space-y-12">
        {/* Header */}
        <section className="space-y-4 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-surface/80 px-4 py-1.5 backdrop-blur-sm">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-subtext">
              Manifest V3 Chrome Extension
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            SafeHand Wallet & AI Leash Extension
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-subtext">
            Your local trust and authorization anchor. Encrypted private keys never leave your machine; policy restrictions are enforced before signing.
          </p>
        </section>

        {/* Installation Steps */}
        <section className="rounded-3xl border border-white/[0.08] bg-surface p-6 sm:p-8 space-y-8">
          <h2 className="text-xl font-bold text-white font-mono border-b border-white/[0.06] pb-4">
            Developer Setup & Installation Steps
          </h2>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Step 1 */}
            <div className="rounded-2xl border border-white/[0.06] bg-card p-6 space-y-3">
              <span className="font-mono text-xs font-bold text-accent-bright">STEP 01</span>
              <h3 className="text-base font-bold text-white">Build Extension Artifacts</h3>
              <p className="text-xs text-subtext leading-relaxed">
                Compile the extension from the monorepo root. This bundles the service worker, inpage provider, and popup into <code className="text-white">apps/extension/dist</code>.
              </p>
              <div className="bg-black/60 p-3 rounded-xl font-mono text-xs text-white/90">
                pnpm --filter @proofly/extension build
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border border-white/[0.06] bg-card p-6 space-y-3">
              <span className="font-mono text-xs font-bold text-accent-bright">STEP 02</span>
              <h3 className="text-base font-bold text-white">Enable Developer Mode</h3>
              <p className="text-xs text-subtext leading-relaxed">
                Open Google Chrome and navigate to <code className="text-white">chrome://extensions</code> in your address bar. Turn on the <strong>Developer mode</strong> toggle in the top-right corner.
              </p>
              <div className="bg-black/60 p-3 rounded-xl font-mono text-xs text-muted">
                chrome://extensions
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl border border-white/[0.06] bg-card p-6 space-y-3">
              <span className="font-mono text-xs font-bold text-accent-bright">STEP 03</span>
              <h3 className="text-base font-bold text-white">Load Unpacked Folder</h3>
              <p className="text-xs text-subtext leading-relaxed">
                Click the <strong>Load unpacked</strong> button in the Chrome extensions toolbar and select the directory:
              </p>
              <div className="bg-black/60 p-3 rounded-xl font-mono text-xs text-white/90 break-all">
                D:\Proofly\hackstorm\apps\extension\dist
              </div>
            </div>

            {/* Step 4 */}
            <div className="rounded-2xl border border-white/[0.06] bg-card p-6 space-y-3">
              <span className="font-mono text-xs font-bold text-accent-bright">STEP 04</span>
              <h3 className="text-base font-bold text-white">Configure AI Leash Policy</h3>
              <p className="text-xs text-subtext leading-relaxed">
                Click the SafeHand icon in your extensions toolbar. Set your wallet password, navigate to the <strong>Policy</strong> tab, and set your desired spending limits and contract allowlists.
              </p>
              <div className="bg-black/60 p-3 rounded-xl font-mono text-xs text-emerald-400">
                Ready for testing on Base Sepolia ✓
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights */}
        <section className="grid sm:grid-cols-3 gap-4">
          <div className="p-6 rounded-2xl border border-white/[0.06] bg-surface space-y-2">
            <h3 className="text-base font-bold text-white font-mono">Pre-Signing Interception</h3>
            <p className="text-xs text-subtext leading-relaxed">
              When an AI agent requests <code className="text-white">eth_sendTransaction</code>, SafeHand evaluates policies locally before invoking the signer. Zero gas, zero broadcast risk on violations.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-white/[0.06] bg-surface space-y-2">
            <h3 className="text-base font-bold text-white font-mono">AES-GCM Local Vault</h3>
            <p className="text-xs text-subtext leading-relaxed">
              Private keys and mnemonic phrases are stored exclusively in Chrome&apos;s encrypted extension storage. The web app and backend never receive raw credentials.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-white/[0.06] bg-surface space-y-2">
            <h3 className="text-base font-bold text-white font-mono">1-Click Policy Revocation</h3>
            <p className="text-xs text-subtext leading-relaxed">
              Revoke an active agent policy immediately with one click. Subsequent transaction attempts from the agent are blocked with <code className="text-amber-400">POLICY_REVOKED</code>.
            </p>
          </div>
        </section>

        {/* Next Actions */}
        <section className="rounded-3xl border border-white/[0.08] bg-surface p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">Experience SafeHand in Action</h2>
          <p className="text-xs text-subtext max-w-md mx-auto">
            Once installed, test live agent transactions with CivicVault or inspect the SDK quickstart.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="http://localhost:3001"
              target="_blank"
              className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-black hover:opacity-90 transition-opacity"
            >
              Launch CivicVault Demo ↗
            </Link>
            <Link
              href="/developers"
              className="rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-white hover:bg-white/[0.04] transition-colors"
            >
              Explore Developer SDK
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
