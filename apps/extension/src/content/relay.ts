import type { BridgeRpcRequest, BridgeRpcResponse } from '../shared/types';
import { PROOFLY_BRIDGE_NAMESPACE } from '../shared/types';

// Provider is injected via manifest world:MAIN — no script tag injection needed.

/**
 * Returns true while this content script still has a live connection to the
 * extension. After the extension is reloaded/updated, the old content script
 * lingers in the page but its context is invalidated — `chrome.runtime.id`
 * becomes undefined and any `sendMessage` call throws
 * "Extension context invalidated". We detect that and fail gracefully instead
 * of letting an uncaught error escape.
 */
function isExtensionContextValid(): boolean {
  try {
    return Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

function respond(id: string, patch: Partial<BridgeRpcResponse>): void {
  const outgoing: BridgeRpcResponse = {
    namespace: PROOFLY_BRIDGE_NAMESPACE,
    channel: 'response',
    id,
    ...patch,
  };
  window.postMessage(outgoing, '*');
}

window.addEventListener('message', (event: MessageEvent<BridgeRpcRequest>) => {
  if (event.source !== window) {
    return;
  }

  const payload = event.data;

  if (!payload || payload.namespace !== PROOFLY_BRIDGE_NAMESPACE || payload.channel !== 'request') {
    return;
  }

  // The extension may have been reloaded while this page kept the stale content
  // script alive. Bail out with a clean EIP-1193-style error instead of throwing.
  if (!isExtensionContextValid()) {
    respond(payload.id, {
      error: {
        code: 4900,
        message: 'SafeHand was reloaded. Please refresh this page to reconnect the wallet.',
      },
    });
    return;
  }

  try {
    chrome.runtime.sendMessage(
      {
        type: 'PROOFLY_RPC_REQUEST',
        payload,
      },
      (response: { ok: boolean; result?: unknown; error?: { code: number; message: string } }) => {
        // Reading lastError inside the callback also clears Chrome's internal
        // "unchecked lastError" warning.
        if (chrome.runtime.lastError) {
          respond(payload.id, {
            error: {
              code: 4900,
              message: chrome.runtime.lastError.message ?? 'Runtime relay failure.',
            },
          });
          return;
        }

        if (response?.ok) {
          respond(payload.id, { result: response.result });
        } else {
          respond(payload.id, {
            error: response?.error ?? { code: 4900, message: 'Unknown runtime relay error.' },
          });
        }
      },
    );
  } catch (err) {
    // sendMessage can throw synchronously if the context was invalidated
    // between the check above and the call.
    respond(payload.id, {
      error: {
        code: 4900,
        message:
          err instanceof Error && err.message
            ? `SafeHand relay error: ${err.message}. Refresh the page to reconnect.`
            : 'SafeHand was reloaded. Please refresh this page to reconnect the wallet.',
      },
    });
  }
});
