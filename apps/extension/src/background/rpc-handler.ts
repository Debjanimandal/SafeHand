import {
  hexToBigInt,
  isAddress,
  parseEther,
  createPublicClient,
  type Hex,
  type TransactionRequest,
} from 'viem';
import { DEFAULT_CHAIN_ID, getChainByHexId, isSupportedChain } from '../chain/chains';
import { enforceAgentPolicy, getPolicyByAgent, PolicyViolationError } from '../policy/agent-rules';
import { postTransactionEvent } from '../runtime/telemetry';
import type {
  ApprovalDecision,
  BridgeRpcRequest,
  PendingApprovalRequest,
} from '../shared/types';
import { getWalletAddress } from '../wallet/keys';
import { getGovId } from '../identity/gov-id';
import {
  buildCompositeSignature,
  signAndBroadcastTransaction,
  signMessageWithPassword,
  signTypedDataWithPassword,
} from '../wallet/signing';

const COMPOSITE_SIGNATURES_KEY = 'proofly.composite-signatures.v1';

async function trackConfirmation(
  chainId: Hex,
  txHash: Hex,
  fromAddress: Hex,
  toAddress: Hex | undefined,
  hasProof: boolean,
): Promise<void> {
  try {
    const chain = getChainByHexId(chainId);
    const publicClient = createPublicClient({ chain: chain.viemChain, transport: chain.transport });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    void postTransactionEvent({
      walletAddress: fromAddress,
      chainId,
      contractAddress: toAddress,
      actionName: 'eth_sendTransaction',
      txHash,
      status: receipt.status === 'success' ? 'confirmed' : 'failed',
      metadata: { hasCompositeProof: hasProof, blockNumber: receipt.blockNumber.toString() },
    });
  } catch {
    // Confirmation tracking is best-effort — silently ignore
  }
}

export class RpcMethodError extends Error {
  code: number;

  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

export interface RpcContext {
  getSessionPassword: () => string | null;
  getChainId: () => Promise<Hex>;
  setChainId: (chainId: Hex) => Promise<void>;
  requestApproval: (request: PendingApprovalRequest) => Promise<ApprovalDecision>;
}

async function estimateNativeUsd(value?: Hex): Promise<number> {
  if (!value) {
    return 0;
  }

  const amountEth = Number(hexToBigInt(value)) / 1e18;

  if (amountEth <= 0) {
    return 0;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = (await response.json()) as { ethereum?: { usd?: number } };
      const price = data.ethereum?.usd;
      if (price && price > 0) {
        return amountEth * price;
      }
    }
  } catch {
    // Fall through to deterministic conservative reference price
  }

  // Conservative fallback (3,000 USD/ETH) if oracle is temporarily unavailable or rate-limited
  const conservativePriceUsd = 3000;
  return amountEth * conservativePriceUsd;
}

function ensureUnlocked(context: RpcContext): string {
  const password = context.getSessionPassword();

  if (!password) {
    throw new RpcMethodError(4100, 'Wallet is locked.');
  }

  return password;
}

function asHexChainId(input: unknown): Hex {
  if (typeof input !== 'string' || !input.startsWith('0x')) {
    throw new RpcMethodError(32602, 'Invalid chainId parameter.');
  }

  return input as Hex;
}

function parseTypedData(value: unknown): {
  domain: Record<string, unknown>;
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, unknown>;
} {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;

  if (!parsed || typeof parsed !== 'object') {
    throw new RpcMethodError(32602, 'Invalid typed data payload.');
  }

  return parsed as {
    domain: Record<string, unknown>;
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    message: Record<string, unknown>;
  };
}

function isHighSecurityTx(tx: TransactionRequest): boolean {
  if (!tx.value) {
    return false;
  }

  const value = typeof tx.value === 'bigint' ? tx.value : hexToBigInt(tx.value);
  return value >= parseEther('0.1');
}

export async function routeRpcRequest(request: BridgeRpcRequest, context: RpcContext): Promise<unknown> {
  const walletAddress = await getWalletAddress();

  if (!walletAddress && request.method !== 'wallet_addEthereumChain') {
    throw new RpcMethodError(4100, 'Wallet not initialized.');
  }

  switch (request.method) {
    case 'eth_accounts': {
      // Silent — return current accounts without prompting.
      return walletAddress ? [walletAddress] : [];
    }

    case 'safehand_getIdentityHash': {
      // Returns the one-way identity hash derived from the user's government ID.
      // Only the hash + non-PII metadata is exposed — never the raw ID details.
      const govId = await getGovId();
      if (!govId) {
        throw new RpcMethodError(4100, 'No government ID linked in SafeHand. Add one in the ID tab first.');
      }
      return {
        identityHash: govId.identityHash,
        documentType: govId.details.documentType,
        country: govId.details.country ?? null,
        savedAt: govId.savedAt,
      };
    }

    case 'eth_requestAccounts': {
      // Requires explicit user approval from the popup.
      if (!walletAddress) return [];
      const connectDecision = await context.requestApproval({
        id: request.id,
        origin: request.origin,
        method: request.method,
        params: request.params,
        createdAt: Date.now(),
        requiresHumanProof: false,
      });
      if (!connectDecision.approved) {
        throw new RpcMethodError(4001, 'User rejected the connection request.');
      }
      return [walletAddress];
    }

    case 'eth_chainId': {
      return context.getChainId();
    }

    case 'eth_sign':
    case 'personal_sign': {
      const password = ensureUnlocked(context);
      const params = request.params ?? [];
      const message = request.method === 'eth_sign' ? params[1] : params[0];

      if (typeof message !== 'string') {
        throw new RpcMethodError(32602, 'Invalid message payload for signing.');
      }

      return signMessageWithPassword(password, message);
    }

    case 'eth_signTypedData_v4': {
      const password = ensureUnlocked(context);
      const params = request.params ?? [];
      const typedData = parseTypedData(params[1]);
      return signTypedDataWithPassword(password, typedData);
    }

    case 'wallet_switchEthereumChain': {
      const params = request.params ?? [];
      const chainParam = (params[0] as { chainId?: unknown } | undefined)?.chainId;
      const chainId = asHexChainId(chainParam);

      if (!isSupportedChain(chainId)) {
        throw new RpcMethodError(4902, `Unsupported chain ${chainId}.`);
      }

      await context.setChainId(chainId);
      return null;
    }

    case 'wallet_addEthereumChain': {
      const params = request.params ?? [];
      const chainParam = (params[0] as { chainId?: unknown } | undefined)?.chainId;
      const chainId = asHexChainId(chainParam);

      if (!isSupportedChain(chainId)) {
        throw new RpcMethodError(4902, `Unsupported chain ${chainId}.`);
      }

      await context.setChainId(chainId);
      return null;
    }

    case 'eth_sendTransaction': {
      const password = ensureUnlocked(context);
      const params = request.params ?? [];
      const tx = (params[0] as TransactionRequest | undefined) ?? null;
      let approvalDecision: ApprovalDecision | null = null;

      if (!tx) {
        throw new RpcMethodError(32602, 'Missing transaction request object.');
      }

      if (!tx.from || !isAddress(tx.from)) {
        tx.from = walletAddress ?? undefined;
      }

      if (!tx.from || !walletAddress || tx.from.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new RpcMethodError(4100, 'Transaction from address does not match active wallet.');
      }

      const chainId = (await context.getChainId()) ?? DEFAULT_CHAIN_ID;
      const policy = await getPolicyByAgent(tx.from as Hex);
      const fromAddress = tx.from as Hex;
      const toAddress = (tx.to && isAddress(tx.to) ? tx.to : undefined) as Hex | undefined;

      const emitTxEvent = (status: string, txHash: Hex, metadata?: Record<string, unknown>): void => {
        void postTransactionEvent({
          walletAddress: fromAddress,
          chainId,
          contractAddress: toAddress,
          actionName: 'eth_sendTransaction',
          txHash,
          status,
          metadata,
        });
      };

      if (policy) {
        try {
          enforceAgentPolicy(policy, {
            from: tx.from as Hex,
            to: tx.to as Hex | undefined,
            valueUsd: await estimateNativeUsd(tx.value as Hex | undefined),
          });
        } catch (error) {
          if (error instanceof PolicyViolationError) {
            emitTxEvent('rejected', '0x0', { reason: error.message, source: 'policy' });
            throw new RpcMethodError(error.code, error.message);
          }

          throw error;
        }
      } else {
        approvalDecision = await context.requestApproval({
          id: request.id,
          origin: request.origin,
          method: request.method,
          params: request.params,
          createdAt: Date.now(),
          requiresHumanProof: isHighSecurityTx(tx),
        });

        if (!approvalDecision.approved) {
          emitTxEvent('rejected', '0x0', { reason: approvalDecision.reason ?? 'User rejected request.', source: 'approval' });
          throw new RpcMethodError(4001, approvalDecision.reason ?? 'User rejected request.');
        }
      }

      getChainByHexId(chainId);
      let txHash: Hex;

      try {
        txHash = await signAndBroadcastTransaction(password, chainId, tx);
      } catch (error) {
        emitTxEvent('failed', '0x0', {
          source: 'broadcast',
          message: error instanceof Error ? error.message : 'Unknown broadcast failure',
        });
        throw error;
      }

      emitTxEvent('submitted', txHash, {
        hasCompositeProof: Boolean(approvalDecision?.proofContext),
      });

      void trackConfirmation(chainId, txHash, fromAddress, toAddress, Boolean(approvalDecision?.proofContext));

      if (approvalDecision?.proofContext) {
        const composite = await buildCompositeSignature(password, `${request.origin}:${txHash}`, approvalDecision.proofContext);
        const output = await chrome.storage.local.get([COMPOSITE_SIGNATURES_KEY]);
        const previous =
          (output[COMPOSITE_SIGNATURES_KEY] as Array<{ txHash: Hex; payload: typeof composite; createdAt: number }> | undefined) ?? [];

        previous.push({ txHash, payload: composite, createdAt: Date.now() });
        await chrome.storage.local.set({ [COMPOSITE_SIGNATURES_KEY]: previous });
      }

      return txHash;
    }

    default:
      throw new RpcMethodError(4200, `Unsupported method: ${request.method}`);
  }
}
