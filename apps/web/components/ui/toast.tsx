'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useCallback, useContext, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (opts: Omit<ToastItem, 'id'>) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastCtx = createContext<ToastContextValue | null>(null);

// ─── Icons ────────────────────────────────────────────────────────────────────

function SuccessIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} className="size-4" aria-hidden="true">
      <polyline points="16.5 5.5 8 13.5 3.5 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} className="size-4" aria-hidden="true">
      <line x1="5" y1="5" x2="15" y2="15" strokeLinecap="round" />
      <line x1="15" y1="5" x2="5" y2="15" strokeLinecap="round" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className="size-4" aria-hidden="true">
      <path d="M10 7v4M10 13v.5" strokeLinecap="round" />
      <path d="M8.6 2.8 1.5 15a1.6 1.6 0 001.4 2.4h14.2A1.6 1.6 0 0018.5 15L11.4 2.8a1.6 1.6 0 00-2.8 0z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className="size-4" aria-hidden="true">
      <circle cx="10" cy="10" r="8" />
      <line x1="10" y1="7" x2="10" y2="10.5" strokeLinecap="round" />
      <circle cx="10" cy="13.5" r="0.6" fill="currentColor" strokeWidth={0} />
    </svg>
  );
}

function DismissIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="size-3" aria-hidden="true">
      <line x1="4" y1="4" x2="12" y2="12" strokeLinecap="round" />
      <line x1="12" y1="4" x2="4" y2="12" strokeLinecap="round" />
    </svg>
  );
}

// ─── Style maps ──────────────────────────────────────────────────────────────

const BG: Record<ToastVariant, string> = {
  success: 'rgba(5,46,22,0.95)',
  error: 'rgba(60,6,6,0.95)',
  warning: 'rgba(60,30,3,0.95)',
  info: 'rgba(12,12,12,0.95)',
};

const BORDER: Record<ToastVariant, string> = {
  success: 'rgba(16,185,129,0.3)',
  error: 'rgba(239,68,68,0.3)',
  warning: 'rgba(245,158,11,0.28)',
  info: 'rgba(255,255,255,0.1)',
};

const ICON_COLOR: Record<ToastVariant, string> = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-accent-bright',
};

const TITLE_COLOR: Record<ToastVariant, string> = {
  success: 'text-emerald-200',
  error: 'text-red-200',
  warning: 'text-yellow-200',
  info: 'text-white',
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (opts: Omit<ToastItem, 'id'>) => {
      const id = typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36);
      setItems((prev) => [...prev.slice(-4), { ...opts, id }]); // max 5 toasts
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-0 right-0 z-[9999] flex flex-col items-end gap-2 p-4 sm:p-6"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94, y: 6 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              role="alert"
              className="pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-[0_8px_40px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
              style={{ background: BG[item.variant], borderColor: BORDER[item.variant] }}
            >
              {/* Icon */}
              <div className={`mt-0.5 shrink-0 ${ICON_COLOR[item.variant]}`}>
                {item.variant === 'success' && <SuccessIcon />}
                {item.variant === 'error' && <ErrorIcon />}
                {item.variant === 'warning' && <WarningIcon />}
                {item.variant === 'info' && <InfoIcon />}
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium leading-snug ${TITLE_COLOR[item.variant]}`}>
                  {item.title}
                </p>
                {item.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-white/40">{item.description}</p>
                ) : null}
              </div>

              {/* Dismiss */}
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="flex size-5 shrink-0 items-center justify-center rounded text-white/25 transition-colors hover:text-white/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                aria-label="Dismiss notification"
              >
                <DismissIcon />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
