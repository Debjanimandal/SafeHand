import { encodeFunctionData, type Hex } from 'viem';
import { DEFAULT_CHAIN_ID } from '../chain/chains';
import { POLICY_ABI } from '../chain/abis';
import { getConfiguredContracts } from '../chain/contracts';
import { upsertPolicy } from '../policy/agent-rules';
import type {
  ApprovalDecision,
  BridgeRpcRequest,
  PendingApprovalRequest,
} from '../shared/types';
import { createWallet, decryptPrivateKey, getWalletAddress } from '../wallet/keys';
import { routeRpcRequest, RpcMethodError } from './rpc-handler';

const CHAIN_STORAGE_KEY = 'proofly.chain-id.v1';
const PENDING_APPROVALS_KEY = 'proofly.pending-approvals.v1';
const APPROVAL_TIMEOUT_MS = 120_000;

let sessionPassword: string | null = null;
const approvalWaiters = new Map<string, {
  resolve: (decision: ApprovalDecision) => void;
  reject: (reason?: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}>();

async function getChainId(): Promise<Hex> {
  const output = await chrome.storage.local.get([CHAIN_STORAGE_KEY]);
  return (output[CHAIN_STORAGE_KEY] as Hex | undefined) ?? DEFAULT_CHAIN_ID;
}

async function setChainId(chainId: Hex): Promise<void> {
  await chrome.storage.local.set({ [CHAIN_STORAGE_KEY]: chainId });
}

async function getPendingApprovals(): Promise<Record<string, PendingApprovalRequest>> {
  const output = await chrome.storage.local.get([PENDING_APPROVALS_KEY]);
  return (output[PENDING_APPROVALS_KEY] as Record<string, PendingApprovalRequest> | undefined) ?? {};
}

async function writePendingApproval(request: PendingApprovalRequest): Promise<void> {
  const pending = await getPendingApprovals();
  pending[request.id] = request;
  await chrome.storage.local.set({ [PENDING_APPROVALS_KEY]: pending });
}

async function clearPendingApproval(id: string): Promise<void> {
  const pending = await getPendingApprovals();
  delete pending[id];
  await chrome.storage.local.set({ [PENDING_APPROVALS_KEY]: pending });
}

function normalizeError(error: unknown): { code: number; message: string } {
  if (error instanceof RpcMethodError) {
    return { code: error.code, message: error.message };
  }

  if (error instanceof Error) {
    return { code: 4900, message: error.message };
  }

  return { code: 4900, message: 'Unknown error.' };
}

async function requestApproval(request: PendingApprovalRequest): Promise<ApprovalDecision> {
  await writePendingApproval(request);

  await chrome.windows.create({
    url: chrome.runtime.getURL(`src/popup/index.html#approval=${request.id}`),
    type: 'popup',
    width: 420,
    height: 760,
  });

  return new Promise<ApprovalDecision>((resolve, reject) => {
    const timer = setTimeout(async () => {
      approvalWaiters.delete(request.id);
      await clearPendingApproval(request.id);
      reject(new RpcMethodError(4001, 'Approval request timed out.'));
    }, APPROVAL_TIMEOUT_MS);

    approvalWaiters.set(request.id, { resolve, reject, timer });
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  const chainId = await getChainId();

  if (!chainId) {
    await setChainId(DEFAULT_CHAIN_ID);
  }
});

chrome.runtime.onMessage.addListener((message: { type?: string; payload?: unknown }, _sender, sendResponse) => {
  void (async () => {
    try {
      switch (message.type) {
        case 'PROOFLY_RPC_REQUEST': {
          const payload = message.payload as BridgeRpcRequest;
          const result = await routeRpcRequest(payload, {
            getSessionPassword: () => sessionPassword,
            getChainId,
            setChainId,
            requestApproval,
          });

          sendResponse({ ok: true, result });
          return;
        }

        case 'PROOFLY_POPUP_CREATE_WALLET': {
          const payload = message.payload as { password: string };
          const address = await createWallet(payload.password);
          sessionPassword = payload.password;
          sendResponse({ ok: true, result: { address } });
          return;
        }

        case 'PROOFLY_POPUP_UNLOCK': {
          const payload = message.payload as { password: string };
          const keyBytes = await decryptPrivateKey(payload.password);
          keyBytes.fill(0);
          sessionPassword = payload.password;
          sendResponse({ ok: true });
          return;
        }

        case 'PROOFLY_POPUP_LOCK': {
          sessionPassword = null;
          sendResponse({ ok: true });
          return;
        }

        case 'PROOFLY_POPUP_GET_STATE': {
          const walletAddress = await getWalletAddress();
          const pending = await getPendingApprovals();
          sendResponse({
            ok: true,
            result: {
              unlocked: Boolean(sessionPassword),
              address: walletAddress,
              chainId: await getChainId(),
              pendingApprovals: pending,
            },
          });
          return;
        }

        case 'PROOFLY_POPUP_APPROVAL_RESULT': {
          const decision = message.payload as ApprovalDecision;
          const waiter = approvalWaiters.get(decision.id);

          if (waiter) {
            clearTimeout(waiter.timer);
            approvalWaiters.delete(decision.id);
            await clearPendingApproval(decision.id);
            waiter.resolve(decision);
          }

          sendResponse({ ok: true });
          return;
        }

        case 'PROOFLY_POPUP_SAVE_POLICY': {
          await upsertPolicy(message.payload as never);
          sendResponse({ ok: true });
          return;
        }

        case 'PROOFLY_POPUP_DELETE_POLICY': {
          const { agentAddress } = message.payload as { agentAddress: Hex };
          const { removePolicy } = await import('../policy/agent-rules');
          await removePolicy(agentAddress);
          sendResponse({ ok: true });
          return;
        }

        case 'PROOFLY_POPUP_SET_POLICY_ONCHAIN': {
          if (!sessionPassword) throw new RpcMethodError(4100, 'Wallet is locked.');
          const { agentAddress, policyHash, expiry } = message.payload as {
            agentAddress: Hex;
            policyHash: Hex;
            expiry: number;
          };
          const contracts = getConfiguredContracts();
          if (!contracts.policy) throw new RpcMethodError(4900, 'Policy contract not configured.');
          const data = encodeFunctionData({
            abi: POLICY_ABI,
            functionName: 'setPolicy',
            args: [agentAddress, policyHash, BigInt(Math.floor(expiry / 1000))],
          });
          const chainId = await getChainId();
          const { signAndBroadcastTransaction } = await import('../wallet/signing');
          const txHash = await signAndBroadcastTransaction(sessionPassword, chainId, {
            to: contracts.policy,
            data,
            value: 0n,
          });
          sendResponse({ ok: true, result: { txHash } });
          return;
        }

        case 'PROOFLY_POPUP_REVOKE_POLICY_ONCHAIN': {
          if (!sessionPassword) throw new RpcMethodError(4100, 'Wallet is locked.');
          const { agentAddress } = message.payload as { agentAddress: Hex };
          const contracts = getConfiguredContracts();
          if (!contracts.policy) throw new RpcMethodError(4900, 'Policy contract not configured.');
          const data = encodeFunctionData({
            abi: POLICY_ABI,
            functionName: 'revokePolicy',
            args: [agentAddress],
          });
          const chainId = await getChainId();
          const { signAndBroadcastTransaction } = await import('../wallet/signing');
          const txHash = await signAndBroadcastTransaction(sessionPassword, chainId, {
            to: contracts.policy,
            data,
            value: 0n,
          });
          sendResponse({ ok: true, result: { txHash } });
          return;
        }

        case 'PROOFLY_POPUP_EXPORT_PRIVKEY': {
          if (!sessionPassword) throw new RpcMethodError(4100, 'Wallet is locked. Unlock before exporting.');
          const { privateKeyBytesToHex } = await import('../wallet/keys');
          const keyBytes = await decryptPrivateKey(sessionPassword);
          const hex = privateKeyBytesToHex(keyBytes);
          keyBytes.fill(0);
          sendResponse({ ok: true, result: { privateKey: hex } });
          return;
        }

        default:
          sendResponse({ ok: false, error: { code: 4200, message: 'Unknown message type.' } });
      }
    } catch (error) {
      sendResponse({ ok: false, error: normalizeError(error) });
    }
  })();

  return true;
});
