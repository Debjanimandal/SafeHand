import type { Hex } from 'viem';

export interface ProoflyContracts {
  registry: Hex | null;
  policy: Hex | null;
  session: Hex | null;
  taskGate: Hex | null;
}

function asOptionalHex(value: string | undefined): Hex | null {
  return value && value.startsWith('0x') ? (value as Hex) : null;
}

export function getConfiguredContracts(): ProoflyContracts {
  return {
    registry: asOptionalHex(import.meta.env.VITE_PROOFLY_REGISTRY_ADDRESS),
    policy: asOptionalHex(import.meta.env.VITE_PROOFLY_POLICY_ADDRESS),
    session: asOptionalHex(import.meta.env.VITE_PROOFLY_SESSION_ADDRESS),
    taskGate: asOptionalHex(import.meta.env.VITE_PROOFLY_TASK_GATE_ADDRESS),
  };
}
