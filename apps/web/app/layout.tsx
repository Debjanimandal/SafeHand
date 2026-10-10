import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ToastProvider } from '../components/ui/toast';

export const metadata: Metadata = {
  title: {
    default: 'SafeHand — Wallet-native trust for the AI era',
    template: '%s | SafeHand',
  },
  description: 'Prove you\'re human, sign your actions, and put AI agents on a hard leash — all without exposing a single identity attribute.',
  keywords: ['Web3', 'wallet', 'World ID', 'AI', 'zero-knowledge', 'Base', 'SafeHand'],
  openGraph: {
    title: 'SafeHand',
    description: 'Wallet-native trust for the AI era',
    type: 'website',
  },
};

const NAV_LINKS = [
  { href: '/developers', label: 'Developers & SDK' },
  { href: '/agent', label: 'AI Leash' },
  { href: 'http://localhost:3001', label: 'CivicVault Demo ↗', external: true },
  { href: '/extension', label: 'Extension' },
  { href: '/activity', label: 'Activity' },
  { href: '/verify', label: 'Verify' },
] as const;

function SafeHandLogo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group" aria-label="SafeHand home">
      {/* Shield mark */}
      <div className="relative flex size-8 items-center justify-center">
        <svg viewBox="0 0 32 32" fill="none" className="size-8" aria-hidden="true">
          <defs>
            <linearGradient id="nav-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#A78BFA" />
            </linearGradient>
          </defs>
          <path
            d="M16 3L5 7.5V15c0 6.6 4.7 12.8 11 14.5C22.3 27.8 27 21.6 27 15V7.5L16 3z"
            fill="url(#nav-logo-grad)"
            fillOpacity="0.15"
            stroke="url(#nav-logo-grad)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <polyline
            points="11,16 14.5,19.5 21,13"
            stroke="url(#nav-logo-grad)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className="text-sm font-bold tracking-tight text-white transition-opacity group-hover:opacity-80">
        SafeHand
      </span>
    </Link>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body>
        {/* ── Navigation ── */}
        <nav className="glass sticky top-0 z-50 border-b border-white/[0.06]">
          <div className="mx-auto flex w-full max-w-shell items-center justify-between px-6 py-3.5">
            <SafeHandLogo />

            <div className="hidden items-center gap-1 sm:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  target={'external' in link && link.external ? '_blank' : undefined}
                  rel={'external' in link && link.external ? 'noreferrer' : undefined}
                  className={`rounded-lg px-3 py-1.5 text-sm transition-all hover:bg-white/[0.04] hover:text-white ${
                    'external' in link && link.external ? 'text-accent-bright font-semibold' : 'text-muted'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Auth CTA */}
            <div className="flex items-center gap-2">
              <Link
                href="/verify"
                className="hidden rounded-lg px-3 py-1.5 text-sm text-muted transition-all hover:bg-white/[0.04] hover:text-white sm:block"
              >
                Verify
              </Link>
              <Link
                href="/signin"
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
              >
                Sign In
              </Link>
            </div>
          </div>
        </nav>

        <ToastProvider>
          {children}
        </ToastProvider>

        {/* ── Footer ── */}
        <footer className="border-t border-white/[0.06] px-6 py-12">
          <div className="mx-auto max-w-shell">
            <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
              <SafeHandLogo />
              <div className="flex flex-wrap gap-x-8 gap-y-3">
                {NAV_LINKS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="text-sm text-muted transition-colors hover:text-subtext"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="mt-10 flex items-center justify-between border-t border-white/[0.04] pt-6">
              <p className="text-xs text-muted">© 2026 SafeHand. All rights reserved.</p>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-success shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                <span className="text-xs text-muted">Base Sepolia</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
