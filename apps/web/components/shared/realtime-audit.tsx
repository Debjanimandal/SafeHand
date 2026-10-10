'use client';

import { useEffect, useRef, useState } from 'react';

type AuditEvent = {
  id: string;
  event_type: string;
  actor_address: string | null;
  created_at: string;
};

/** Read all local audit events persisted by client-side actions. */
function readLocalEvents(): AuditEvent[] {
  try {
    const raw = localStorage.getItem('proofly.activity.log');
    if (!raw) return [];
    return JSON.parse(raw) as AuditEvent[];
  } catch {
    return [];
  }
}

export default function RealtimeAudit(): JSX.Element {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let removed = false;

    async function fetchLogs(): Promise<void> {
      try {
        const response = await fetch('/api/activity/logs');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as { logs: AuditEvent[] };
        const serverLogs: AuditEvent[] = data.logs ?? [];
        const localLogs = readLocalEvents();
        // Merge: server events first, then local events not already in server set
        const serverIds = new Set(serverLogs.map((e) => e.id));
        const merged = [
          ...serverLogs,
          ...localLogs.filter((e) => !serverIds.has(e.id)),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 30);
        if (!removed) setEvents(merged);
      } catch (fetchError) {
        // Server unavailable — show only local events
        const localLogs = readLocalEvents();
        if (!removed) {
          setEvents(localLogs.slice(0, 30));
          if (localLogs.length === 0) setError((fetchError as Error).message);
        }
      }
    }

    void fetchLogs();
    intervalRef.current = setInterval(() => { void fetchLogs(); }, 4000);

    return () => {
      removed = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold tracking-tight">Audit Feed</h2>
      <p className="mt-2 text-sm text-subtext">Live updates from proof, policy, media, and transaction events.</p>

      {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}

      <ul className="mt-4 space-y-2">
        {events.map((event) => (
          <li key={event.id} className="flex items-center justify-between text-xs">
            <span className="font-mono text-accent">{event.event_type}</span>
            <span className="text-subtext">
              {event.actor_address ? `${event.actor_address.slice(0, 8)}…` : 'system'}
            </span>
            <time className="text-subtext">{new Date(event.created_at).toLocaleTimeString()}</time>
          </li>
        ))}
        {events.length === 0 && !error ? (
          <li className="text-xs text-subtext">No events yet.</li>
        ) : null}
      </ul>
    </section>
  );
}
