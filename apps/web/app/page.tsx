'use client';

import { motion, useInView } from 'framer-motion';
import Link from 'next/link';
import { useRef, useState } from 'react';

// ─── Animation Helper ─────────────────────────────────────────────────────────

function FadeUp({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const METRICS = [
  { value: 'Pre-Signing', label: 'Local Intercept', sub: 'Zero gas lost on violations' },
  { value: '84532', label: 'Base Sepolia Chain', sub: 'Live deployed contracts' },
  { value: '0 Keys', label: 'Server-Side Exposure', sub: 'AES-GCM local keystore' },
  { value: '< 5 min', label: 'SDK Integration', sub: '@proofly/sdk browser client' },
] as const;

const PILLARS = [
  {
    badge: 'Core Feature',
    title: 'AI Leash Policy Engine',
    body: 'Define what an AI agent may spend, what destination contracts it can call, and when access expires. Enforced locally in the extension before private key signing.',
    href: '/agent',
    cta: 'Configure AI Leash',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
        <path d="M16.24 7.76a6 6 0 010 8.49M7.76 7.76a6 6 0 000 8.49" />
      </svg>
    ),
    accentColor: 'from-accent/15 to-transparent',
    borderColor: 'border-accent/20 hover:border-accent/40',
    iconBg: 'bg-accent/10 border-accent/20 text-accent-bright',
  },
  {
    badge: 'Developer Surface',
    title: 'SafeHand Developer SDK',
    body: 'Standard EIP-1193 and EIP-6963 provider integration. Features typed PolicyDeniedError handling, account lifecycle hooks, and SSR-safe wrappers.',
    href: '/developers',
    cta: 'Explore Developer SDK',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5" aria-hidden="true">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    accentColor: 'from-cyan-900/15 to-transparent',
    borderColor: 'border-cyan-500/20 hover:border-cyan-500/40',
    iconBg: 'bg-cyan-900/20 border-cyan-800/30 text-cyan-400',
  },
  {
    badge: 'Cryptographic Trust',
    title: 'Humanity & Authority Proofs',
    body: 'Privacy-preserving Groth16 zero-knowledge nullifiers registered on Base Sepolia. Establish humanity and consent without revealing private identity attributes.',
    href: '/verify',
    cta: 'Verify Humanity',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    accentColor: 'from-emerald-900/15 to-transparent',
    borderColor: 'border-emerald-500/20 hover:border-emerald-500/40',
    iconBg: 'bg-emerald-900/20 border-emerald-800/30 text-emerald-400',
  },
] as const;

const COMPARISON = [
  {
    capability: 'Private Key Access',
    unconstrained: 'Exposed to LLM prompt or agent cloud runtime',
    safehand: 'Encrypted locally in Chrome MV3 keystore; never exposed',
  },
  {
    capability: 'Value Spending Limits',
    unconstrained: 'Unbounded; vulnerable to wallet drain attacks',
    safehand: 'Hard USD ceiling evaluated pre-signing',
  },
  {
    capability: 'Contract Destinations',
    unconstrained: 'Can invoke arbitrary malicious contracts',
    safehand: 'Strict allowlist of verified contract addresses',
  },
  {
    capability: 'Revocation Speed',
    unconstrained: 'Irreversible once agent keys are compromised',
    safehand: 'Instant 1-click revocation halts agent instantly',
  },
  {
    capability: 'Failed Attempt Cost',
    unconstrained: 'Gas burned on on-chain reverts',
    safehand: '0 gas; blocked locally before broadcast',
  },
  {
    capability: 'Audit Transparency',
    unconstrained: 'Fragmented raw transaction hashes',
    safehand: 'Structured telemetry in PostgreSQL audit feed',
  },
] as const;

export default function HomePage(): JSX.Element {
  const [copiedCode, setCopiedCode] = useState(false);

  const QUICKSTART_SNIPPET = `import { createSafeHandClient, PolicyDeniedError } from '@proofly/sdk';

// 1. Initialize SafeHand client
const client = createSafeHandClient({ targetChainId: 84532 });
await client.connect();

// 2. Dispatch agent action with pre-signing guard
try {
  const txHash = await client.sendTransaction({
    to: '0x7c2e142C203f43C5e6F9206A5c66b8A8DA9BF997', // Whitelisted contract
    value: '0x38d7ea4c68000',                            // 0.0001 ETH
  });
} catch (err) {
  if (err instanceof PolicyDeniedError) {
    // Intercepted PRE-SIGNING: Zero gas lost, zero keys exposed!
    console.warn(\`Action blocked by policy: [\${err.reason}]\`);
  }
}`;

  function handleCopy() {
    void navigator.clipboard.writeText(QUICKSTART_SNIPPET);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  return (
    <main className="min-h-screen bg-bg text-text">
      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
        {/* Radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(99,102,241,0.22) 0%, transparent 70%)',
          }}
        />
        {/* Subtle grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 mx-auto max-w-4xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-surface/80 px-4 py-1.5 backdrop-blur-sm"
          >
            <span className="size-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-subtext">
              Permission & Verification Layer for AI Agents
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="text-5xl font-bold leading-[1.08] tracking-[-0.03em] sm:text-7xl"
          >
            Autonomous AI Agents Need
            <br />
            <span className="accent-gradient-text">Hard EVM Boundaries.</span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="mx-auto mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-subtext"
          >
            Define what an AI agent is allowed to do, enforce max spending limits and contract allowlists <strong>before signing</strong>, and provide a tamper-evident audit record of permitted and rejected actions.
          </motion.p>

          {/* Primary CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            className="mt-9 flex flex-col items-center gap-3.5 sm:flex-row sm:justify-center"
          >
            <Link
              href="/developers"
              className="rounded-xl bg-white px-7 py-3 text-sm font-bold text-black shadow-[0_0_40px_rgba(255,255,255,0.15)] transition-all hover:scale-[1.02] hover:opacity-90 active:scale-[0.98]"
            >
              Explore Developer SDK
            </Link>
            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/20 bg-surface/80 px-7 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/[0.06] flex items-center gap-2"
            >
              <span>Launch CivicVault Demo</span>
              <span className="text-[10px] text-cyan-400 font-mono">Port 3001 ↗</span>
            </a>
            <Link
              href="/extension"
              className="rounded-xl border border-white/[0.08] px-5 py-3 text-sm font-medium text-subtext transition-colors hover:text-white"
            >
              Install Extension
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── METRICS BAR ─────────────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-surface/60 px-6 py-8">
        <div className="mx-auto grid max-w-shell grid-cols-2 gap-8 sm:grid-cols-4">
          {METRICS.map(({ value, label, sub }, i) => (
            <FadeUp key={label} delay={i * 0.05} className="text-center">
              <p className="text-2xl sm:text-3xl font-bold tracking-tight font-mono text-white">{value}</p>
              <p className="mt-1 text-sm font-medium text-subtext">{label}</p>
              <p className="mt-0.5 text-[11px] text-muted">{sub}</p>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── THREE PILLARS ───────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-shell">
          <FadeUp className="mb-3">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted">Architecture</p>
          </FadeUp>
          <FadeUp delay={0.06} className="mb-14">
            <h2 className="max-w-xl text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
              Three connected surfaces.<br />One unified trust boundary.
            </h2>
          </FadeUp>

          <div className="grid gap-5 sm:grid-cols-3">
            {PILLARS.map(({ badge, title, body, href, cta, icon, accentColor, borderColor, iconBg }, i) => (
              <FadeUp key={title} delay={i * 0.08}>
                <div
                  className={`group flex h-full flex-col rounded-3xl border bg-gradient-to-br p-7 transition-all duration-300 hover:shadow-card-hover ${accentColor} ${borderColor}`}
                >
                  <div className="mb-5 flex items-center justify-between">
                    <div className={`flex size-10 items-center justify-center rounded-2xl border ${iconBg}`}>
                      {icon}
                    </div>
                    <span className="font-mono text-[10px] text-muted uppercase tracking-wider">{badge}</span>
                  </div>

                  <h3 className="text-lg font-bold leading-snug tracking-tight text-white">{title}</h3>
                  <p className="mt-3 flex-1 text-xs leading-relaxed text-subtext">{body}</p>

                  <Link
                    href={href}
                    className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-white transition-all group-hover:text-accent-bright"
                  >
                    {cta} <span>→</span>
                  </Link>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE TWO SITES OF THE ECOSYSTEM ──────────────────── */}
      <section className="border-t border-white/[0.06] bg-surface/40 px-6 py-24">
        <div className="mx-auto max-w-shell space-y-12">
          <FadeUp>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted">Ecosystem Surfaces</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
              Two integrated web surfaces.
            </h2>
            <p className="mt-2 text-sm text-subtext max-w-xl">
              SafeHand provides both the developer product surface and a live third-party relying application demo to verify end-to-end integration.
            </p>
          </FadeUp>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Surface 1: CivicVault Relying App */}
            <div className="rounded-3xl border border-white/[0.08] bg-card p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 rounded-full font-bold">
                    Third-Party Relying Demo (Port 3001)
                  </span>
                  <span className="text-xs font-mono text-muted">CivicVault dApp</span>
                </div>
                <h3 className="text-2xl font-bold text-white">CivicVault Portal</h3>
                <p className="text-xs text-subtext leading-relaxed">
                  A realistic external relying website that communicates with the installed SafeHand extension. Tests live wallet connections, on-chain human proof checks, and features the <strong>AI Leash Execution Console</strong> to test allowed transactions vs blocked policy violations live on Base Sepolia.
                </p>
                <div className="border border-white/[0.06] bg-black/40 p-4 rounded-2xl font-mono text-xs space-y-1 text-white/70">
                  <p className="text-white font-bold">• Real EIP-1193 discovery (window.safehand)</p>
                  <p className="text-white font-bold">• Zero synthetic timers or hardcoded dummy addresses</p>
                  <p className="text-white font-bold">• Live test buttons for allowed and blocked transactions</p>
                </div>
              </div>
              <a
                href="http://localhost:3001"
                target="_blank"
                rel="noreferrer"
                className="btn-primary w-full py-3 text-center text-xs font-bold bg-white text-black rounded-xl hover:opacity-90 transition-opacity block"
              >
                Launch CivicVault Demo (Port 3001) ↗
              </a>
            </div>

            {/* Surface 2: Main Product & Developer Portal */}
            <div className="rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/10 to-transparent p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-accent-bright border border-accent/30 bg-accent/10 px-2.5 py-1 rounded-full font-bold">
                    Flagship Platform (Port 3000)
                  </span>
                  <span className="text-xs font-mono text-muted">SafeHand Core</span>
                </div>
                <h3 className="text-2xl font-bold text-white">SafeHand Product & Developer Portal</h3>
                <p className="text-xs text-subtext leading-relaxed">
                  The primary developer surface. Includes the interactive Developer SDK documentation, live browser test runner, policy configurator, and real-time audit feed powered by Neon PostgreSQL.
                </p>
                <div className="border border-white/[0.06] bg-black/40 p-4 rounded-2xl font-mono text-xs space-y-1 text-white/70">
                  <p className="text-white font-bold">• @proofly/sdk documentation and code playground</p>
                  <p className="text-white font-bold">• PostgreSQL audit telemetry (/activity)</p>
                  <p className="text-white font-bold">• Extension installation and policy management</p>
                </div>
              </div>
              <Link
                href="/developers"
                className="btn-primary w-full py-3 text-center text-xs font-bold bg-accent text-white rounded-xl hover:bg-accent-dim transition-colors block"
              >
                Explore Developer SDK & Docs →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CODE QUICKSTART PREVIEW ─────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-shell">
          <FadeUp className="rounded-3xl border border-white/[0.08] bg-surface p-8 sm:p-12">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div className="space-y-4">
                <span className="text-xs font-mono uppercase text-muted tracking-widest font-bold">Developer Experience</span>
                <h2 className="text-3xl font-bold tracking-tight text-white">
                  Protect agent wallets in three lines of code.
                </h2>
                <p className="text-xs text-subtext leading-relaxed">
                  No complex infrastructure rewrites. The <code className="text-accent-bright">@proofly/sdk</code> client communicates directly with the user&apos;s installed extension, catching boundary violations pre-signing.
                </p>
                <div className="pt-2 flex items-center gap-3">
                  <Link
                    href="/developers"
                    className="rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-black hover:opacity-90 transition-opacity"
                  >
                    View Full API Reference
                  </Link>
                  <Link
                    href="/activity"
                    className="rounded-xl border border-white/10 px-5 py-2.5 text-xs font-medium text-subtext hover:text-white transition-colors"
                  >
                    Live Audit Feed
                  </Link>
                </div>
              </div>

              {/* Code Box */}
              <div className="relative rounded-2xl border border-white/[0.06] bg-black p-5 font-mono text-xs">
                <button
                  onClick={handleCopy}
                  className="absolute top-4 right-4 text-[10px] text-muted hover:text-white border border-white/10 px-2 py-1 rounded"
                >
                  {copiedCode ? 'Copied ✓' : 'Copy'}
                </button>
                <pre className="text-white/80 leading-relaxed overflow-x-auto">
                  <code>{QUICKSTART_SNIPPET}</code>
                </pre>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── COMPARISON TABLE ────────────────────────────────── */}
      <section className="border-t border-white/[0.06] bg-surface/40 px-6 py-24">
        <div className="mx-auto max-w-shell space-y-12">
          <FadeUp>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted">Why SafeHand</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
              Unconstrained Agent vs SafeHand AI Leash
            </h2>
          </FadeUp>

          <FadeUp delay={0.08} className="overflow-x-auto rounded-3xl border border-white/[0.08] bg-surface">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-muted bg-white/[0.02]">
                  <th className="py-4 px-6 font-bold">Security Boundary</th>
                  <th className="py-4 px-6 text-red-400 font-bold">Unconstrained Agent</th>
                  <th className="py-4 px-6 text-emerald-400 font-bold">With SafeHand AI Leash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {COMPARISON.map(({ capability, unconstrained, safehand }) => (
                  <tr key={capability} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 px-6 font-bold text-white">{capability}</td>
                    <td className="py-4 px-6 text-subtext">{unconstrained}</td>
                    <td className="py-4 px-6 text-emerald-300 font-medium">{safehand}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FadeUp>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section className="px-6 py-24">
        <FadeUp>
          <div className="mx-auto max-w-3xl rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/[0.12] to-transparent p-12 text-center space-y-5">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Ready to build verifiable, bounded AI agents?
            </h2>
            <p className="mx-auto max-w-md text-xs sm:text-sm leading-relaxed text-subtext">
              Integrate <code className="text-accent-bright">@proofly/sdk</code> into your agent framework today and test live on Base Sepolia.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/developers"
                className="rounded-xl bg-accent px-7 py-3 text-sm font-bold text-white shadow-glow hover:bg-accent-dim transition-all"
              >
                Open Developer Portal
              </Link>
              <a
                href="http://localhost:3001"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/20 bg-surface px-6 py-3 text-sm font-semibold text-white hover:bg-white/[0.04] transition-colors"
              >
                Test CivicVault Demo (Port 3001) ↗
              </a>
            </div>
          </div>
        </FadeUp>
      </section>
    </main>
  );
}
