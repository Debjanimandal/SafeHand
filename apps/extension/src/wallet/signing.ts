import type { Hex, TransactionSerializable } from 'viem';
import {
  bytesToHex,
  createWalletClient,
  hashMessage,
  hexToBytes,
  isHex,
  keccak256,
  serializeTransaction,
  type TransactionRequest,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getChainByHexId } from '../chain/chains';
import { decryptPrivateKey } from './keys';
import type { CompositeSignaturePayload } from '../shared/types';

function erase(bytes: Uint8Array): void {
  bytes.fill(0);
}

export async function signMessageWithPassword(password: string, message: string): Promise<Hex> {
  const keyBytes = await decryptPrivateKey(password);

  try {
    const account = privateKeyToAccount(bytesToHex(keyBytes));

    if (isHex(message)) {
      return account.signMessage({ message: { raw: message } });
    }

    return account.signMessage({ message });
  } finally {
    erase(keyBytes);
  }
}

export async function signTypedDataWithPassword(
  password: string,
  typedData: {
    domain: Record<string, unknown>;
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    message: Record<string, unknown>;
  },
): Promise<Hex> {
  const keyBytes = await decryptPrivateKey(password);

  try {
    const account = privateKeyToAccount(bytesToHex(keyBytes));
    return account.signTypedData(typedData as never);
  } finally {
    erase(keyBytes);
  }
}

export async function signTransactionWithPassword(
  password: string,
  tx: TransactionSerializable,
): Promise<Hex> {
  const keyBytes = await decryptPrivateKey(password);

  try {
    const account = privateKeyToAccount(bytesToHex(keyBytes));
    return account.signTransaction(tx);
  } finally {
    erase(keyBytes);
  }
}

export async function signAndBroadcastTransaction(
  password: string,
  chainId: Hex,
  tx: TransactionRequest,
): Promise<Hex> {
  const chain = getChainByHexId(chainId);
  const keyBytes = await decryptPrivateKey(password);

  try {
    const account = privateKeyToAccount(bytesToHex(keyBytes));
    const client = createWalletClient({
      account,
      chain: chain.viemChain,
      transport: chain.transport,
    });

    if (!tx.to) {
      throw new Error('Transaction target contract is required.');
    }

    return client.sendTransaction({
      account,
      to: tx.to,
      value: tx.value,
      data: tx.data,
      nonce: tx.nonce,
      gas: tx.gas,
      maxFeePerGas: tx.maxFeePerGas,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
      chain: chain.viemChain,
    });
  } finally {
    erase(keyBytes);
  }
}

export async function buildCompositeSignature(
  password: string,
  signal: string,
  proof: {
    zkProof: string[];
    nullifier: Hex;
    voiceHash: Hex;
  },
): Promise<CompositeSignaturePayload> {
  const signature = await signMessageWithPassword(password, signal);
  return {
    signature,
    zkProof: proof.zkProof,
    nullifier: proof.nullifier,
    voiceHash: proof.voiceHash,
    humanVerified: true,
  };
}

export function hashSignaturePayload(input: string): Hex {
  return keccak256(hashMessage(input));
}

export function safeHexToBytes(input: Hex): Uint8Array {
  return hexToBytes(input);
}

export function serializeUnsignedTx(tx: TransactionSerializable): Hex {
  return keccak256(serializeTransaction(tx));
}
