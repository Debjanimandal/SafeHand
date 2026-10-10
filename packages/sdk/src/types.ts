export type Hex = `0x${string}`;

export interface Eip1193RequestArguments {
  readonly method: string;
  readonly params?: readonly unknown[] | Record<string, unknown>;
}

export interface Eip1193Provider {
  request(args: Eip1193RequestArguments): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
  readonly isProofly?: boolean;
  readonly isSafeHand?: boolean;
}

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: Eip1193Provider;
}

export interface EIP6963AnnounceProviderEvent extends CustomEvent {
  type: 'eip6963:announceProvider';
  detail: EIP6963ProviderDetail;
}

export interface ProoflyClientOptions {
  /** Optional explicit provider; otherwise auto-detects Proofly via EIP-6963 or window.proofly. */
  provider?: Eip1193Provider;
  /** Expected chain ID as hex, defaults to 0x14a34 (Base Sepolia = 84532). */
  expectedChainId?: Hex;
}

export interface SupportedTransactionRequest {
  from?: Hex;
  to: Hex;
  value?: Hex;
  data?: Hex;
  gas?: Hex;
  maxFeePerGas?: Hex;
  maxPriorityFeePerGas?: Hex;
}

export type ProoflyPolicyReason =
  | 'POLICY_MISSING'
  | 'POLICY_EXPIRED'
  | 'POLICY_REVOKED'
  | 'DESTINATION_NOT_ALLOWED'
  | 'VALUE_LIMIT_EXCEEDED'
  | 'UNSUPPORTED_TRANSACTION'
  | 'PRICE_UNAVAILABLE'
  | 'WRONG_CHAIN'
  | 'ACCOUNT_NOT_ALLOWED'
  | 'ORIGIN_NOT_ALLOWED'
  | 'USER_REJECTED';

export interface ProoflyPolicyErrorData {
  proofly: true;
  reason: ProoflyPolicyReason;
  policyId?: string;
  policyVersion?: number;
  requestId?: string;
}

export interface ProoflyClient {
  isInstalled(): boolean;
  connect(): Promise<Hex[]>;
  getAccounts(): Promise<Hex[]>;
  getChainId(): Promise<Hex>;
  assertExpectedChain(): Promise<void>;
  sendTransaction(tx: SupportedTransactionRequest): Promise<Hex>;
  signMessage(params: { address?: Hex; message: string | Hex }): Promise<Hex>;
  on(
    event: 'accountsChanged' | 'chainChanged' | 'connect' | 'disconnect',
    listener: (...args: unknown[]) => void,
  ): () => void;
}
