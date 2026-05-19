import { create } from 'zustand';

export interface WalletData {
  address: string;
  walletType: 'local' | 'seed-vault';
  secretKey?: Uint8Array;
  mnemonic?: string;
  authToken?: string | number;
  // seedvault用
  derivationPath?: any;
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