/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WORLD_APP_ID?: string;
  readonly VITE_WORLD_ACTION?: string;
  readonly VITE_WORLD_RP_ID?: string;
  readonly VITE_PROOFLY_API_BASE_URL?: string;
  readonly VITE_BASE_SEPOLIA_RPC_URL?: string;
  readonly VITE_BASE_MAINNET_RPC_URL?: string;
  readonly VITE_PROOFLY_REGISTRY_ADDRESS?: `0x${string}`;
  readonly VITE_PROOFLY_POLICY_ADDRESS?: `0x${string}`;
  readonly VITE_PROOFLY_SESSION_ADDRESS?: `0x${string}`;
  readonly VITE_PROOFLY_TASK_GATE_ADDRESS?: `0x${string}`;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*?script' {
  const url: string;
  export default url;
}
