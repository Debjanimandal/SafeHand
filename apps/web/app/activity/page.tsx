import RealtimeAudit from '../../components/shared/realtime-audit';

export default function ActivityPage(): JSX.Element {
  return (
    <main className="min-h-screen bg-bg px-6 py-10">
      <div className="mx-auto grid w-full max-w-shell gap-6">
        <section className="rounded-3xl border border-border bg-surface p-6">
          <h1 className="text-2xl font-semibold tracking-tight">Activity and Sync</h1>
          <p className="mt-2 text-sm text-subtext">Live audit log of all wallet, proof, and agent events.</p>
        </section>
        <RealtimeAudit />
      </div>
    </main>
  );
}
