import { clsx } from 'clsx';
import { createElement } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children?: ReactNode;
}

export function Button({ variant = 'secondary', className, children, ...props }: ButtonProps): React.JSX.Element {
  return createElement(
    'button',
    {
      type: 'button',
      className: clsx(
        'rounded-xl px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50',
        variant === 'primary' && 'bg-white text-black',
        variant === 'secondary' && 'border border-border text-text',
        variant === 'ghost' && 'text-subtext hover:text-text',
        className,
      ),
      ...props,
    },
    children,
  );
}

