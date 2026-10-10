import type { Hex } from 'viem';
import { create } from 'zustand';
import { runtimeRequest } from '../background/client';
import type { PendingApprovalRequest } from '../shared/types';

interface RuntimeState {
  unlocked: boolean;
  address: Hex | null;
  chainId: Hex;
  pendingApprovals: Record<string, PendingApprovalRequest>;
}

interface WalletStore extends RuntimeState {
  loaded: boolean;
  refresh: () => Promise<void>;
}

export const useWalletStore = create<WalletStore>((set) => ({
  loaded: false,
  unlocked: false,
  address: null,
  chainId: '0x14a34',
  pendingApprovals: {},

  async refresh(): Promise<void> {
    const result = await runtimeRequest<RuntimeState>('PROOFLY_POPUP_GET_STATE');
    set({ ...result, loaded: true });
  },
}));
