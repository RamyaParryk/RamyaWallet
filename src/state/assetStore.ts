import { create } from 'zustand';

export interface Asset {
  mint: string;
  symbol: string;
  name: string;
  amount: number;
  decimals: number;
  price?: number;
  value?: number;
  logoURI: string;
  status?: 'verified' | 'unknown' | 'suspicious';
}

interface AssetState {
  assets: Asset[];
  totalValue: number;

  tokenList: any[];
  tokenMap: Map<string, any>;

  setAssets: (a: Asset[]) => void;
  setTotalValue: (v: number) => void;

  setTokenList: (l: any[]) => void;
  setTokenMap: (m: Map<string, any>) => void;

  resetAll: () => void;
}

export const useAssetStore = create<AssetState>((set) => ({
  assets: [],
  totalValue: 0,

  tokenList: [],
  tokenMap: new Map(),

  setAssets: (a) => set({ assets: a }),
  setTotalValue: (v) => set({ totalValue: v }),

  setTokenList: (l) => set({ tokenList: l }),
  setTokenMap: (m) => set({ tokenMap: m }),

  resetAll: () => set({ assets: [], totalValue: 0, tokenList: [], tokenMap: new Map() }),
}));