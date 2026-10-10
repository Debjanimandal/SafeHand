import { http, type Hex, type Chain, type Transport } from 'viem';
import { base, baseSepolia } from 'viem/chains';

export interface ChainDefinition {
  chainId: Hex;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  viemChain: Chain;
  transport: Transport;
}

const BASE_SEPOLIA_RPC = import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const BASE_MAINNET_RPC = import.meta.env.VITE_BASE_MAINNET_RPC_URL || 'https://mainnet.base.org';

const chains: Record<Hex, ChainDefinition> = {
  '0x14a34': {
    chainId: '0x14a34',
    name: 'Base Sepolia',
    rpcUrl: BASE_SEPOLIA_RPC,
    explorerUrl: 'https://sepolia.basescan.org',
    viemChain: baseSepolia,
    transport: http(BASE_SEPOLIA_RPC),
  },
  '0x2105': {
    chainId: '0x2105',
    name: 'Base',
    rpcUrl: BASE_MAINNET_RPC,
    explorerUrl: 'https://basescan.org',
    viemChain: base,
    transport: http(BASE_MAINNET_RPC),
  },
};

export const DEFAULT_CHAIN_ID: Hex = '0x14a34';

export function getSupportedChains(): ChainDefinition[] {
  return Object.values(chains);
}

export function getChainByHexId(chainId: Hex): ChainDefinition {
  const chain = chains[chainId];

  if (!chain) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }

  return chain;
}

export function isSupportedChain(chainId: Hex): boolean {
  return Boolean(chains[chainId]);
}
