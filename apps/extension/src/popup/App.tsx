import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { useWalletStore } from '../store/wallet';
import { ApprovalRequestView } from './views/ApprovalRequest';
import { WalletHome } from './views/WalletHome';
import { WalletSetup } from './views/WalletSetup';
import { WalletUnlock } from './views/WalletUnlock';

// ─── Brand Logo ───────────────────────────────────────────────────────────────

function ProoflyLogo() {
  return (
    <div className="relative flex size-7 items-center justify-center">
      <svg viewBox="0 0 28 28" fill="none" className="size-7" aria-label="Proofly">
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
          <linearGradient id="logo-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <path
          d="M14 2L4 6.5V14c0 5.8 4.2 11.2 10 12.5C19.8 25.2 24 19.8 24 14V6.5L14 2z"
          fill="url(#logo-fill)"
          stroke="url(#logo-grad)"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <polyline
          points="9,14 12.5,17.5 19,11"
          stroke="url(#logo-grad)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ─── Status Pill ──────────────────────────────────────────────────────────────

function StatusPill({ loaded, unlocked }: { loaded: boolean; unlocked: boolean }) {
  const isActive = loaded && unlocked;
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-surface px-2.5 py-1">
      <span
        className={[
          'size-1.5 rounded-full transition-all duration-700',
          !loaded
            ? 'bg-muted'
            : isActive
              ? 'bg-success shadow-[0_0_6px_rgba(16,185,129,0.8)]'
              : 'bg-muted',
        ].join(' ')}
      />
      <span className="text-[10px] font-medium tabular-nums text-muted">
        {!loaded ? '…' : isActive ? 'unlocked' : 'locked'}
      </span>
    </div>
  );
}

// ─── View transition variants ─────────────────────────────────────────────────

const viewVariants = {
  enter: {
    opacity: 0,
    y: 12,
    scale: 0.99,
    transition: { duration: 0.01 },
  },
  center: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 1.005,
    transition: { duration: 0.14, ease: 'easeIn' },
  },
};

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App(): JSX.Element {
  const { loaded, unlocked, address, chainId, pendingApprovals, refresh } = useWalletStore();

  const approvalId = useMemo(() => {
    const hash = window.location.hash;
    return hash.startsWith('#approval=') ? hash.slice('#approval='.length) : null;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pendingApproval = approvalId ? pendingApprovals[approvalId] : null;

  type ViewKey = 'loading' | 'approval' | 'setup' | 'unlock' | 'home';

  function getViewKey(): ViewKey {
    if (!loaded) return 'loading';
    if (!address) return 'setup';
    // A dApp connect/sign request is pending. Like any wallet, the user must
    // unlock first (one-time per session); only then do we show the approval.
    if (!unlocked) return 'unlock';
    if (pendingApproval) return 'approval';
    return 'home';
  }

  const viewKey = getViewKey();

  function renderContent(): JSX.Element {
    if (viewKey === 'loading') {
      return (
        <motion.div
          key="loading"
          variants={viewVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="flex flex-col items-center gap-5 pt-24"
        >
          <div className="relative size-12">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-white/[0.04] border-t-accent/80" />
            <div className="absolute inset-3 rounded-full bg-accent/10" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted">
            Loading
          </p>
        </motion.div>
      );
    }

    if (viewKey === 'approval' && pendingApproval && address) {
      return (
        <motion.div key="approval" variants={viewVariants} initial="enter" animate="center" exit="exit">
          <ApprovalRequestView approval={pendingApproval} chainId={chainId} address={address} />
        </motion.div>
      );
    }

    if (viewKey === 'setup') {
      return (
        <motion.div key="setup" variants={viewVariants} initial="enter" animate="center" exit="exit">
          <WalletSetup />
        </motion.div>
      );
    }

    if (viewKey === 'unlock') {
      return (
        <motion.div key="unlock" variants={viewVariants} initial="enter" animate="center" exit="exit">
          <WalletUnlock />
        </motion.div>
      );
    }

    return (
      <motion.div key="home" variants={viewVariants} initial="enter" animate="center" exit="exit">
        <WalletHome />
      </motion.div>
    );
  }

  return (
    <main className="gradient-mesh min-h-screen bg-bg text-text">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 flex items-center gap-2.5 border-b border-white/[0.06] bg-bg/90 px-4 py-3.5 backdrop-blur-md">
        <ProoflyLogo />
        <span className="flex-1 text-[11px] font-bold uppercase tracking-[0.28em] text-white/90">
          SafeHand
        </span>
        <StatusPill loaded={loaded} unlocked={unlocked} />
      </header>

      {/* ── Content ── */}
      <div className="px-4 pt-4 pb-8">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </div>
    </main>
  );
}
