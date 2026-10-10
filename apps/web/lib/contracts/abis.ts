import type { Abi } from 'viem';

export const REGISTRY_ABI = [
  {
    type: 'event',
    name: 'HumanProofRegistered',
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'wallet', type: 'address' },
      { indexed: true, internalType: 'bytes32', name: 'nullifierHash', type: 'bytes32' },
      { indexed: false, internalType: 'uint256', name: 'verifiedAt', type: 'uint256' },
    ],
  },
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
  {
    type: 'function',
    name: 'nullifierUsed',
    stateMutability: 'view',
    inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
  },
] as const satisfies Abi;

export const POLICY_ABI = [
  {
    type: 'event',
    name: 'PolicySet',
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
      { indexed: true, internalType: 'address', name: 'agent', type: 'address' },
      { indexed: false, internalType: 'bytes32', name: 'policyHash', type: 'bytes32' },
      { indexed: false, internalType: 'uint256', name: 'expiry', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'PolicyRevoked',
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
      { indexed: true, internalType: 'address', name: 'agent', type: 'address' },
    ],
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
] as const satisfies Abi;
