import { NextResponse } from 'next/server';
import { signRequest } from '@worldcoin/idkit-server';

/**
 * POST /api/zk/worldid/rp-signature
 *
 * Generates a short-lived RP signature that authorises a World ID proof request.
 * The signing key MUST remain server-side only — never expose it to the client.
 *
 * Body: { action?: string }
 * Response: { sig, nonce, created_at, expires_at }
 */
export async function POST(request: Request): Promise<Response> {
  // Allow the browser extension and any configured origin
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  const signingKey = process.env.RP_SIGNING_KEY;
  if (!signingKey) {
    console.error('[rp-signature] RP_SIGNING_KEY is not set in environment.');
    return NextResponse.json(
      { error: 'RP signing key not configured on server.' },
      { status: 500, headers: corsHeaders },
    );
  }

  let action: string | undefined;
  try {
    const body = (await request.json()) as { action?: string };
    action = body.action;
  } catch {
    // body is optional — action falls back to env default below
  }

  try {
    const { sig, nonce, createdAt, expiresAt } = signRequest({
      signingKeyHex: signingKey,
      action: action ?? (process.env.WORLD_ID_ACTION ?? 'proofly-human-verify'),
    });

    return NextResponse.json(
      { sig, nonce, created_at: createdAt, expires_at: expiresAt },
      { headers: corsHeaders },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[rp-signature] signRequest threw:', message);
    return NextResponse.json(
      { error: `Failed to generate RP signature: ${message}` },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
