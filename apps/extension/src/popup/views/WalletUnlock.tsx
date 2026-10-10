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

export function WalletUnlock(): JSX.Element {
  const address = useWalletStore((s) => s.address);
  const refresh = useWalletStore((s) => s.refresh);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;
  const avatarChars = address ? address.slice(2, 4).toUpperCase() : '??';
  const canSubmit = password.length >= 8 && !busy;

  async function unlock(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await runtimeRequest('PROOFLY_POPUP_UNLOCK', { password });
      setPassword('');
      await refresh();
    } catch (err) {
      setError((err as Error).message);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center pt-4">
      {/* Avatar with lock badge */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.04 }}
        className="relative mb-6"
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 -m-4 rounded-full bg-accent/[0.08] blur-xl" />

        {/* Outer ring */}
        <div className="relative flex size-20 items-center justify-center rounded-full border border-white/[0.06] bg-surface shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
          {/* Avatar */}
          <div className="flex size-14 items-center justify-center rounded-full border border-white/[0.08] bg-gradient-to-br from-elevated to-card">
            <span className="font-mono text-base font-bold tracking-tight text-subtext select-none">
              {avatarChars}
            </span>
          </div>
        </div>

        {/* Lock badge */}
        <div className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border border-white/[0.08] bg-elevated shadow-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3.5 text-muted" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.08 }}
        className="text-center"
      >
        <h2 className="text-xl font-bold tracking-tight text-white">Welcome back</h2>
        {shortAddress && (
          <p className="mt-1 font-mono text-[11px] text-muted">{shortAddress}</p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.14 }}
        className="mt-7 w-full space-y-3"
      >
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs text-red-300"
          >
            {error}
          </motion.div>
        )}

        <motion.div
          animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative"
        >
          <input
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            className="w-full rounded-xl border border-white/[0.06] bg-surface px-4 py-3 pr-12 text-sm text-text outline-none transition-all placeholder:text-muted focus:border-accent/40 focus:bg-elevated focus:ring-1 focus:ring-accent/20"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit) void unlock();
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
        </motion.div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-30"
          onClick={() => { void unlock(); }}
          disabled={!canSubmit}
        >
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <span className="size-3.5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
              Unlocking…
            </span>
          ) : 'Unlock Wallet'}
        </motion.button>
      </motion.div>
    </div>
  );
}
