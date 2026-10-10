import { motion } from 'framer-motion';
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'accent';
}

export function Button({ variant = 'secondary', className = '', children, ...props }: ButtonProps): JSX.Element {
  const base = 'w-full rounded-xl px-3 py-2.5 text-sm font-semibold transition-all disabled:opacity-40 active:scale-[0.97]';
  const styles: Record<string, string> = {
    primary: 'bg-white text-black hover:opacity-90',
    secondary: 'border border-white/[0.06] bg-surface text-subtext hover:border-white/15 hover:text-white',
    danger: 'border border-danger/30 text-danger hover:bg-danger/10',
    accent: 'bg-accent text-white shadow-glow-sm hover:bg-accent-dim',
  };

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      className={`${base} ${styles[variant]} ${className}`}
      {...(props as object)}
    >
      {children}
    </motion.button>
  );
}
