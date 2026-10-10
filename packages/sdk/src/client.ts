import { discoverProoflyProvider, getProoflyProviderSync } from './discovery.js';
import { parseProviderError, ProviderNotFoundError, WrongChainError } from './errors.js';
import type {
  Eip1193Provider,
  Hex,
  ProoflyClient,
  ProoflyClientOptions,
  SupportedTransactionRequest,
} from './types.js';

export const DEFAULT_BASE_SEPOLIA_CHAIN_ID: Hex = '0x14a34'; // 84532

export class ProoflyBrowserClient implements ProoflyClient {
  private explicitProvider?: Eip1193Provider;
  private expectedChainId: Hex;

  constructor(options?: ProoflyClientOptions) {
    this.explicitProvider = options?.provider;
    this.expectedChainId = options?.expectedChainId ?? DEFAULT_BASE_SEPOLIA_CHAIN_ID;
  }

  private async getProvider(): Promise<Eip1193Provider> {
    if (this.explicitProvider) return this.explicitProvider;
    const provider = await discoverProoflyProvider();
    if (!provider) {
      throw new ProviderNotFoundError();
    }
    return provider;
  }

  isInstalled(): boolean {
    if (this.explicitProvider) return true;
    return Boolean(getProoflyProviderSync());
  }

  async connect(): Promise<Hex[]> {
    const provider = await this.getProvider();
    try {
      const accounts = (await provider.request({
        method: 'eth_requestAccounts',
        params: [],
      })) as Hex[];
      return accounts || [];
    } catch (err) {
      throw parseProviderError(err);
    }
  }

  async getAccounts(): Promise<Hex[]> {
    const provider = await this.getProvider();
    try {
      const accounts = (await provider.request({
        method: 'eth_accounts',
        params: [],
      })) as Hex[];
      return accounts || [];
    } catch (err) {
      throw parseProviderError(err);
    }
  }

  async getChainId(): Promise<Hex> {
    const provider = await this.getProvider();
    try {
      const chainId = (await provider.request({
        method: 'eth_chainId',
        params: [],
      })) as Hex;
      return chainId;
    } catch (err) {
      throw parseProviderError(err);
    }
  }

  async assertExpectedChain(): Promise<void> {
    const current = await this.getChainId();
    if (current.toLowerCase() !== this.expectedChainId.toLowerCase()) {
      throw new WrongChainError(current, this.expectedChainId);
    }
  }

  async sendTransaction(tx: SupportedTransactionRequest): Promise<Hex> {
    await this.assertExpectedChain();
    const provider = await this.getProvider();

    // Client-side structural sanity check
    if (!tx || !tx.to) {
      throw new Error('Transaction destination (to) is required.');
    }

    try {
      const hash = (await provider.request({
        method: 'eth_sendTransaction',
        params: [tx],
      })) as Hex;
      return hash;
    } catch (err) {
      throw parseProviderError(err);
    }
  }

  async signMessage(params: { address?: Hex; message: string | Hex }): Promise<Hex> {
    const provider = await this.getProvider();
    const accounts = await this.getAccounts();
    const signer = params.address || accounts[0];

    if (!signer) {
      throw new Error('No account available to sign message.');
    }

    try {
      const sig = (await provider.request({
        method: 'personal_sign',
        params: [params.message, signer],
      })) as Hex;
      return sig;
    } catch (err) {
      throw parseProviderError(err);
    }
  }

  on(
    event: 'accountsChanged' | 'chainChanged' | 'connect' | 'disconnect',
    listener: (...args: unknown[]) => void,
  ): () => void {
    let activeProvider: Eip1193Provider | null = null;

    void this.getProvider().then((p) => {
      activeProvider = p;
      if (typeof p.on === 'function') {
        p.on(event, listener);
      }
    });

    return () => {
      if (activeProvider && typeof activeProvider.removeListener === 'function') {
        activeProvider.removeListener(event, listener);
      }
    };
  }
}

export function createProoflyClient(options?: ProoflyClientOptions): ProoflyClient {
  return new ProoflyBrowserClient(options);
}

export const createSafeHandClient = createProoflyClient;
