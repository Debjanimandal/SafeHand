import { createPublicClient, createWalletClient, http, isAddress, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { POLICY_ABI, REGISTRY_ABI } from './abis';

const RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org';

export function getPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
}

function getRelayerWalletClient() {
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  if (!key) throw new Error('DEPLOYER_PRIVATE_KEY is not configured.');
  const account = privateKeyToAccount(key as Hex);
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
}

/** Converts a 0x-prefixed hex string of 8 packed uint256 values into a BigInt tuple. */
function hexToUint256Array(hex: string): [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint] {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex;
  const padded = normalized.padStart(64 * 8, '0');
  const arr: bigint[] = [];
  for (let i = 0; i < 8; i++) {
    arr.push(BigInt('0x' + padded.slice(i * 64, (i + 1) * 64)));
  }
  return arr as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
}

export async function registerHumanProofOnChain(
  walletAddress: string,
  nullifierHash: string,
  merkleRoot: string,
  proofHex: string,
): Promise<Hex | null> {
  const registryAddress = process.env.NEXT_PUBLIC_PROOFLY_REGISTRY_ADDRESS;
  if (!registryAddress || !isAddress(registryAddress)) return null;
  if (!process.env.DEPLOYER_PRIVATE_KEY) return null;

  const client = getRelayerWalletClient();

  return client.writeContract({
    address: registryAddress as Hex,
    abi: REGISTRY_ABI,
    functionName: 'registerHumanProof',
    args: [
      walletAddress as Hex,
      BigInt(merkleRoot),
      BigInt(nullifierHash),
      hexToUint256Array(proofHex),
    ],
  });
}

export async function isVerifiedOnChain(walletAddress: string): Promise<boolean> {
  const registryAddress = process.env.NEXT_PUBLIC_PROOFLY_REGISTRY_ADDRESS;
  if (!registryAddress || !isAddress(registryAddress)) return false;

  const client = getPublicClient();
  return client.readContract({
    address: registryAddress as Hex,
    abi: REGISTRY_ABI,
    functionName: 'isVerified',
    args: [walletAddress as Hex],
  });
}

export async function isPolicyActiveOnChain(ownerAddress: string, agentAddress: string): Promise<boolean> {
  const policyAddress = process.env.NEXT_PUBLIC_PROOFLY_POLICY_ADDRESS;
  if (!policyAddress || !isAddress(policyAddress)) return false;

  const client = getPublicClient();
  return client.readContract({
    address: policyAddress as Hex,
    abi: POLICY_ABI,
    functionName: 'isPolicyActive',
    args: [ownerAddress as Hex, agentAddress as Hex],
  });
}
