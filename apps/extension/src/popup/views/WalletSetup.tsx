import { motion } from 'framer-motion';
import { useState } from 'react';
import { runtimeRequest } from '../../background/client';
import { useWalletStore } from '../../store/wallet';

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4" aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function strengthLevel(password: string): number {
  if (password.length < 8) return 0;
  let score = 1;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', 'bg-red-500', 'bg-warning', 'bg-yellow-400', 'bg-success'];
const STRENGTH_TEXT = ['', 'text-red-400', 'text-warning', 'text-yellow-400', 'text-success'];

const features = [
  { icon: '🔑', text: 'Keys generated locally, never leave your device' },
  { icon: '🛡️', text: 'AES-256 encrypted with your password' },
  { icon: '⛓️', text: 'Base blockchain — real contracts, no mocks' },
];

export function WalletSetup(): JSX.Element {
  const refresh = useWalletStore((s) => s.refresh);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = strengthLevel(password);
  const canSubmit = password.length >= 8 && !busy;

  async function createWallet(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await runtimeRequest('PROOFLY_POPUP_CREATE_WALLET', { password });
      setPassword('');
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center pt-2">
      {/* Shield mark with glowing ring */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.05 }}
        className="relative mb-6 mt-3"
      >
        {/* Outer glow ring */}
        <div className="absolute inset-0 -m-3 rounded-full bg-accent/10 blur-xl" />
        <div className="relative flex size-20 items-center justify-center rounded-full border border-white/[0.06] bg-surface">
          <div className="flex size-14 items-center justify-center rounded-full border border-accent/20 bg-gradient-to-br from-accent/15 to-purple-900/10">
            <svg viewBox="0 0 28 28" fill="none" className="size-8" aria-hidden="true">
              <defs>
                <linearGradient id="setup-shield-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818CF8" />
                  <stop offset="100%" stopColor="#A78BFA" />
                </linearGradient>
              </defs>
              <path
                d="M14 2L4 6.5V14c0 5.8 4.2 11.2 10 12.5C19.8 25.2 24 19.8 24 14V6.5L14 2z"
                fill="url(#setup-shield-grad)"
                fillOpacity="0.15"
                stroke="url(#setup-shield-grad)"
                strokeWidth="1.25"
                strokeLinejoin="round"
              />
              <polyline
                points="9,14 12.5,17.5 19,11"
                stroke="url(#setup-shield-grad)"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.1 }}
        className="w-full text-center"
      >
        <h2 className="text-xl font-bold tracking-tight text-white">Create Your Wallet</h2>
        <p className="mt-1.5 px-4 text-center text-[11px] leading-relaxed text-muted">
          Your keys never leave this device. Encrypted locally, always in your control.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.15 }}
        className="mt-6 w-full space-y-3"
      >
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="overflow-hidden rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs text-red-300"
          >
            {error}
          </motion.div>
        )}

        {/* Password input */}
        <div className="relative">
          <input
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            className="w-full rounded-xl border border-white/[0.06] bg-surface px-4 py-3 pr-12 text-sm text-text outline-none transition-all placeholder:text-muted focus:border-accent/40 focus:bg-elevated focus:ring-1 focus:ring-accent/20"
            type={showPassword ? 'text' : 'password'}
            placeholder="Set password — min 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit) void createWallet();
            }}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-subtext"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
          >
            <EyeIcon open={showPassword} />
          </button>
        </div>

        {/* Strength meter */}
        {password.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-1.5"
          >
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((level) => (
                <motion.div
                  key={level}
                  className={`h-0.5 flex-1 rounded-full transition-all duration-400 ${
                    strength >= level ? STRENGTH_COLORS[strength] : 'bg-white/[0.06]'
                  }`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: level * 0.03 }}
                  style={{ transformOrigin: 'left' }}
                />
              ))}
            </div>
            {strength > 0 && (
              <p className={`text-[10px] font-medium ${STRENGTH_TEXT[strength]}`}>
                {STRENGTH_LABELS[strength]}
              </p>
            )}
          </motion.div>
        )}

        {/* CTA button */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-30"
          onClick={() => { void createWallet(); }}
          disabled={!canSubmit}
        >
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <span className="size-3.5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
              Creating Wallet…
            </span>
          ) : 'Create Wallet'}
        </motion.button>

        {/* Feature list */}
        <div className="mt-1 space-y-2 rounded-2xl border border-white/[0.05] bg-surface p-3.5">
          {features.map(({ icon, text }) => (
            <div key={text} className="flex items-start gap-2.5">
              <span className="text-sm leading-none mt-0.5">{icon}</span>
              <p className="text-[10px] leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
