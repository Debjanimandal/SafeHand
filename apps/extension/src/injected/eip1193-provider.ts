// MAIN world content script — top-level module code, runs directly in page context.

const NAMESPACE = 'PROOFLY_RPC_BRIDGE';

type RequestArguments = { method: string; params?: unknown[] };
type Listener = (...args: unknown[]) => void;

interface RpcBridgeResponse {
  namespace: string;
  channel: 'response';
  id: string;
  result?: unknown;
  error?: { code: number; message: string };
}

interface EIP1193Provider {
  isProofly?: boolean;
  isSafeHand?: boolean;
  request(args: RequestArguments): Promise<unknown>;
  on(event: string, listener: Listener): this;
  removeListener(event: string, listener: Listener): this;
}

class EventEmitter {
  private listeners = new Map<string, Set<Listener>>();
  on(event: string, listener: Listener): void {
    const s = this.listeners.get(event) ?? new Set<Listener>();
    s.add(listener);
    this.listeners.set(event, s);
  }
  off(event: string, listener: Listener): void { this.listeners.get(event)?.delete(listener); }
  emit(event: string, ...args: unknown[]): void { this.listeners.get(event)?.forEach((l) => l(...args)); }
}

class ProoflyProvider extends EventEmitter implements EIP1193Provider {
  public isProofly = true;
  public isSafeHand = true;
  public selectedAddress: string | null = null;
  public chainId = '0x14a34';
  private pending = new Map<string, { resolve: (v: unknown) => void; reject: (r?: unknown) => void }>();

  constructor() {
    super();
    window.addEventListener('message', (event: MessageEvent<RpcBridgeResponse>) => {
      if (event.source !== window) return;
      const p = event.data;
      if (!p || p.namespace !== NAMESPACE || p.channel !== 'response') return;
      const waiter = this.pending.get(p.id);
      if (!waiter) return;
      this.pending.delete(p.id);
      if (p.error) { waiter.reject(Object.assign(new Error(p.error.message), { code: p.error.code })); return; }
      waiter.resolve(p.result);
    });
  }

  async request(args: RequestArguments): Promise<unknown> {
    if (!args || typeof args.method !== 'string') throw Object.assign(new Error('Invalid request arguments.'), { code: 32602 });
    const id = crypto.randomUUID();
    const prom = new Promise<unknown>((resolve, reject) => { this.pending.set(id, { resolve, reject }); });
    window.postMessage({ namespace: NAMESPACE, channel: 'request', id, origin: window.location.origin, method: args.method, params: args.params ?? [] }, '*');
    const result = await prom;
    if (args.method === 'eth_requestAccounts' || args.method === 'eth_accounts') {
      const accounts = Array.isArray(result) ? result : [];
      this.selectedAddress = (accounts[0] as string | undefined) ?? null;
      this.emit('accountsChanged', accounts);
    }
    if (args.method === 'wallet_switchEthereumChain') {
      const chainId = (args.params?.[0] as { chainId?: string } | undefined)?.chainId;
      if (chainId) { this.chainId = chainId; this.emit('chainChanged', chainId); }
    }
    return result;
  }

  send(methodOrPayload: string | RequestArguments, params?: unknown[]): Promise<unknown> {
    return typeof methodOrPayload === 'string' ? this.request({ method: methodOrPayload, params }) : this.request(methodOrPayload);
  }

  on(event: string, listener: Listener): this { super.on(event, listener); return this; }
  removeListener(event: string, listener: Listener): this { super.off(event, listener); return this; }
}

type ProoflyWindow = Window & {
  ethereum?: EIP1193Provider;
  proofly?: EIP1193Provider;
  safehand?: EIP1193Provider;
  __prooflyInjected?: boolean;
};
const pw = window as ProoflyWindow;

if (!pw.__prooflyInjected) {
  const provider = new ProoflyProvider();
  if (!pw.ethereum) {
    Object.defineProperty(pw, 'ethereum', { value: provider, configurable: false, writable: false });
  }
  pw.safehand = provider;
  pw.proofly = provider;
  pw.__prooflyInjected = true;
  const announce = (): void => {
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
      detail: { info: { uuid: '93d4fdf8-1138-4a7f-abda-4ffc9cfd656f', name: 'SafeHand Wallet', icon: '', rdns: 'xyz.safehand.wallet' }, provider },
    }));
  };
  window.addEventListener('eip6963:requestProvider', announce);
  announce();
}
