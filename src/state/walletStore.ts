import { create } from 'zustand';

export interface WalletData {
  address: string;
  secretKey: Uint8Array;
  // mnemonic はセキュリティ的には保存しない方が安全。
  mnemonic?: string;
}

interface WalletState {
  wallet: WalletData | null;
  setWallet: (w: WalletData | null) => void;
  resetWallet: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  wallet: null,
  setWallet: (w) => set({ wallet: w }),
  resetWallet: () => set({ wallet: null }),
}));
