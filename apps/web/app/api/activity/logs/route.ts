import { NextResponse } from 'next/server';
import { getOptionalDb } from '../../../../lib/db/client';

export async function GET(): Promise<Response> {
  const sql = getOptionalDb();
  if (!sql) {
    return NextResponse.json({ logs: [] });
  }

  const rows = await sql`
    SELECT id, event_type, actor_address, created_at
    FROM public.audit_logs
    ORDER BY created_at DESC
    LIMIT 20
  `;

  return NextResponse.json({ logs: rows });
}
