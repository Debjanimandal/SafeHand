import type { Hex } from 'viem';
import { bytesToHex, hexToBytes } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import type { EncryptedPayload } from '../storage/encryption';
import { decryptBytes, encryptBytes } from '../storage/encryption';

export interface StoredWallet extends EncryptedPayload {
  address: Hex;
  createdAt: number;
}

const WALLET_KEY = 'proofly.wallet.v1';

function erase(bytes: Uint8Array): void {
  bytes.fill(0);
}

async function getFromStorage<T>(key: string): Promise<T | null> {
  const output = await chrome.storage.local.get([key]);
  return (output[key] as T | undefined) ?? null;
}

async function setToStorage<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export async function getStoredWallet(): Promise<StoredWallet | null> {
  return getFromStorage<StoredWallet>(WALLET_KEY);
}

export async function getWalletAddress(): Promise<Hex | null> {
  const wallet = await getStoredWallet();
  return wallet?.address ?? null;
}

export async function createWallet(password: string): Promise<Hex> {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const keyBytes = hexToBytes(privateKey);

  try {
    const encrypted = await encryptBytes(password, keyBytes);
    const stored: StoredWallet = {
      ...encrypted,
      address: account.address,
      createdAt: Date.now(),
    };

    await setToStorage(WALLET_KEY, stored);
    return account.address;
  } finally {
    erase(keyBytes);
  }
}

export async function decryptPrivateKey(password: string): Promise<Uint8Array> {
  const wallet = await getStoredWallet();

  if (!wallet) {
    throw new Error('Wallet is not initialized.');
  }

  const decrypted = await decryptBytes(password, wallet);

  if (decrypted.length !== 32) {
    erase(decrypted);
    throw new Error('Invalid private key length.');
  }

  return decrypted;
}

export function privateKeyBytesToHex(bytes: Uint8Array): Hex {
  return bytesToHex(bytes);
}
