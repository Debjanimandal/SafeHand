'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
  /** Don't close on backdrop click */
  persistent?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-md',
  persistent = false,
}: ModalProps) {
  // Keyboard dismiss
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !persistent) onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose, persistent]);

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={persistent ? undefined : onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`relative z-10 w-full ${maxWidth} overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0C0C0C] shadow-[0_32px_80px_rgba(0,0,0,0.85)]`}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            {(title ?? description) ? (
              <div className="flex items-start justify-between border-b border-white/[0.06] px-6 py-4">
                <div>
                  {title ? (
                    <h2 className="text-base font-semibold tracking-tight text-white">{title}</h2>
                  ) : null}
                  {description ? (
                    <p className="mt-0.5 text-sm text-[#71717A]">{description}</p>
                  ) : null}
                </div>
                {!persistent && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="ml-4 flex size-7 shrink-0 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                    aria-label="Close"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                      <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            ) : null}

            {/* Body */}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Confirm Dialog helper ─────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'danger' | 'default';
  busy?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  variant = 'default',
  busy = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm font-medium text-[#A1A1AA] transition-colors hover:border-white/[0.14] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
            variant === 'danger'
              ? 'bg-red-600 text-white hover:bg-red-500'
              : 'bg-white text-black hover:opacity-90'
          }`}
        >
          {busy ? 'Processing…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
