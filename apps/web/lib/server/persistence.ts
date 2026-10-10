import { createHash } from 'crypto';
import { getOptionalDb } from '../db/client';

export interface AuditLogInput {
  actorAddress?: string | null;
  eventType: string;
  targetId?: string | null;
  txHash?: string | null;
  payload?: unknown;
}

export interface TransactionEventInput {
  walletAddress: string;
  chainId: number;
  contractAddress?: string | null;
  actionName?: string | null;
  txHash: string;
  status: string;
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function upsertWalletProfile(
  walletAddress: string,
  updates: {
    display_name?: string | null;
    active_chain?: string;
    verification_status?: 'unverified' | 'verified';
  } = {},
): Promise<void> {
  const sql = getOptionalDb();
  if (!sql) return;

  await sql`
    INSERT INTO public.wallet_profiles (wallet_address, active_chain, verification_status)
    VALUES (
      ${walletAddress},
      ${updates.active_chain ?? '84532'},
      ${updates.verification_status ?? 'unverified'}
    )
    ON CONFLICT (wallet_address) DO UPDATE SET
      active_chain = COALESCE(EXCLUDED.active_chain, public.wallet_profiles.active_chain),
      verification_status = COALESCE(EXCLUDED.verification_status, public.wallet_profiles.verification_status)
  `;
}

export async function insertAuditLog(input: AuditLogInput): Promise<void> {
  const sql = getOptionalDb();
  if (!sql) return;

  await sql`
    INSERT INTO public.audit_logs (actor_address, event_type, target_id, tx_hash, payload)
    VALUES (
      ${input.actorAddress ?? null},
      ${input.eventType},
      ${input.targetId ?? null},
      ${input.txHash ?? null},
      ${input.payload !== undefined ? JSON.stringify(input.payload) : null}
    )
  `;
}

export async function insertTransactionEvent(input: TransactionEventInput): Promise<void> {
  const sql = getOptionalDb();
  if (!sql) return;

  await sql`
    INSERT INTO public.transaction_events
      (wallet_address, chain_id, contract_address, action_name, tx_hash, status)
    VALUES (
      ${input.walletAddress},
      ${input.chainId},
      ${input.contractAddress ?? null},
      ${input.actionName ?? null},
      ${input.txHash},
      ${input.status}
    )
  `;
}
