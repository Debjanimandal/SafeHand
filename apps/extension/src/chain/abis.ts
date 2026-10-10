import type { Abi } from 'viem';

export const REGISTRY_ABI = [
  {
    type: 'function',
    name: 'registerHumanProof',
    stateMutability: 'nonpayable',
    inputs: [
      { internalType: 'address', name: 'wallet', type: 'address' },
      { internalType: 'uint256', name: 'root', type: 'uint256' },
      { internalType: 'uint256', name: 'nullifierHash', type: 'uint256' },
      { internalType: 'uint256[8]', name: 'proof', type: 'uint256[8]' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'appIdHash',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'externalNullifierHash',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'isVerified',
    stateMutability: 'view',
    inputs: [{ internalType: 'address', name: 'wallet', type: 'address' }],
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
  },
] as const satisfies Abi;

export const POLICY_ABI = [
  {
    type: 'function',
    name: 'setPolicy',
    stateMutability: 'nonpayable',
    inputs: [
      { internalType: 'address', name: 'agent', type: 'address' },
      { internalType: 'bytes32', name: 'policyHash', type: 'bytes32' },
      { internalType: 'uint256', name: 'expiry', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'revokePolicy',
    stateMutability: 'nonpayable',
    inputs: [{ internalType: 'address', name: 'agent', type: 'address' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'isPolicyActive',
    stateMutability: 'view',
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'agent', type: 'address' },
    ],
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
  },
] as const satisfies Abi;
