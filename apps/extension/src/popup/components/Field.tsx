interface FieldProps {
  label: string;
  value: string;
}

export function Field({ label, value }: FieldProps): JSX.Element {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 break-all text-sm text-text">{value}</p>
    </div>
  );
}
