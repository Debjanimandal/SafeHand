interface ErrorBannerProps {
  message: string;
}

export function ErrorBanner({ message }: ErrorBannerProps): JSX.Element {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 size-3.5 shrink-0 text-danger" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p className="text-xs leading-relaxed text-red-300">{message}</p>
    </div>
  );
}
