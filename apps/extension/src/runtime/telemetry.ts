import { isAddress, type Hex } from 'viem';

const apiBaseUrl = (import.meta.env.VITE_PROOFLY_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

export interface TxEventInput {
  walletAddress: Hex;
  chainId: Hex;
  txHash: Hex;
  status: string;
  contractAddress?: Hex;
  actionName?: string;
  metadata?: Record<string, unknown>;
}

export async function postTransactionEvent(event: TxEventInput): Promise<void> {
  if (!apiBaseUrl) {
    return;
  }

  const chainIdDecimal = Number.parseInt(event.chainId, 16);

  if (!Number.isFinite(chainIdDecimal)) {
    return;
  }

  const payload: Record<string, unknown> = {
    walletAddress: event.walletAddress,
    chainId: chainIdDecimal,
    actionName: event.actionName ?? 'eth_sendTransaction',
    txHash: event.txHash,
    status: event.status,
    metadata: event.metadata ?? {},
  };

  if (event.contractAddress && isAddress(event.contractAddress)) {
    payload.contractAddress = event.contractAddress;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/tx/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Transaction event API returned status ${response.status}`);
    }
  } catch (error) {
    console.warn('[Proofly] Failed to persist transaction event', error);
  }
}
