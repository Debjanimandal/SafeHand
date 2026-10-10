import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { insertAuditLog } from '../../../../../lib/server/persistence';

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as { address?: string; action?: string };

  if (!body.address) {
    return NextResponse.json({ error: 'Address is required.' }, { status: 400 });
  }

  if (isAddress(body.address)) {
    await insertAuditLog({
      actorAddress: body.address,
      eventType: 'worldid_verification_started',
      payload: {
        action: body.action ?? process.env.WORLD_ID_ACTION ?? 'proofly-human-verify',
      },
    });
  }

  return NextResponse.json({
    appId: process.env.NEXT_PUBLIC_WORLD_APP_ID,
    action: body.action ?? process.env.WORLD_ID_ACTION ?? 'proofly-human-verify',
    signal: body.address,
    status: 'ready',
  });
}
