import { create } from 'zustand';

export type Network = 'mainnet-beta' | 'devnet';

interface SettingsState {
  network: Network;
  rpcEndpoint: string;

  biometricsEnabled: boolean;
  pin: string | null;
  pendingBioEnable: boolean;

  lang: string;

  setNetwork: (n: Network) => void;
  setRpcEndpoint: (v: string) => void;

  setBiometricsEnabled: (v: boolean) => void;
  setPin: (v: string | null) => void;
  setPendingBioEnable: (v: boolean) => void;

  setLang: (v: string) => void;

  resetAuth: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  network: 'mainnet-beta',
  rpcEndpoint: 'Public',

  biometricsEnabled: false,
  pin: null,
  pendingBioEnable: false,

  lang: 'ja',

  setNetwork: (n) => set({ network: n }),
  setRpcEndpoint: (v) => set({ rpcEndpoint: v }),

  setBiometricsEnabled: (v) => set({ biometricsEnabled: v }),
  setPin: (v) => set({ pin: v }),
  setPendingBioEnable: (v) => set({ pendingBioEnable: v }),

  setLang: (v) => set({ lang: v }),

  resetAuth: () => set({ pin: null, biometricsEnabled: false, pendingBioEnable: false }),
}));
