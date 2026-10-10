export interface ProoflyContractAddresses {
  registry: string | null;
  policy: string | null;
  session: string | null;
  taskGate: string | null;
}

function envAddress(name: 'NEXT_PUBLIC_PROOFLY_REGISTRY_ADDRESS' | 'NEXT_PUBLIC_PROOFLY_POLICY_ADDRESS' | 'NEXT_PUBLIC_PROOFLY_SESSION_ADDRESS' | 'NEXT_PUBLIC_PROOFLY_TASK_GATE_ADDRESS'): string | null {
  const value = process.env[name];

  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    return null;
  }

  return value;
}

export function getProoflyContractAddresses(): ProoflyContractAddresses {
  return {
    registry: envAddress('NEXT_PUBLIC_PROOFLY_REGISTRY_ADDRESS'),
    policy: envAddress('NEXT_PUBLIC_PROOFLY_POLICY_ADDRESS'),
    session: envAddress('NEXT_PUBLIC_PROOFLY_SESSION_ADDRESS'),
    taskGate: envAddress('NEXT_PUBLIC_PROOFLY_TASK_GATE_ADDRESS'),
  };
}
