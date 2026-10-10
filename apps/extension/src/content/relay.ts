import type { BridgeRpcRequest, BridgeRpcResponse } from '../shared/types';
import { PROOFLY_BRIDGE_NAMESPACE } from '../shared/types';

// Provider is injected via manifest world:MAIN — no script tag injection needed.

window.addEventListener('message', (event: MessageEvent<BridgeRpcRequest>) => {
  if (event.source !== window) {
    return;
  }

  const payload = event.data;

  if (!payload || payload.namespace !== PROOFLY_BRIDGE_NAMESPACE || payload.channel !== 'request') {
    return;
  }

  chrome.runtime.sendMessage(
    {
      type: 'PROOFLY_RPC_REQUEST',
      payload,
    },
    (response: { ok: boolean; result?: unknown; error?: { code: number; message: string } }) => {
      const outgoing: BridgeRpcResponse = {
        namespace: PROOFLY_BRIDGE_NAMESPACE,
        channel: 'response',
        id: payload.id,
      };

      if (chrome.runtime.lastError) {
        outgoing.error = {
          code: 4900,
          message: chrome.runtime.lastError.message ?? 'Runtime relay failure.',
        };
      } else if (response?.ok) {
        outgoing.result = response.result;
      } else {
        outgoing.error = response?.error ?? { code: 4900, message: 'Unknown runtime relay error.' };
      }

      window.postMessage(outgoing, '*');
    },
  );
});
