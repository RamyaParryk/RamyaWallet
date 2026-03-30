import { create } from 'zustand';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { MAINNET_RPC_URL } from '../constants/config';
import { useSettingsStore, type Network } from './settingsStore';


type Commitment = 'processed' | 'confirmed' | 'finalized';

type ConnectionState = {
  // current network / rpc
  network: Network;
  rpcUrl: string;
  commitment: Commitment;

  // current connection
  connection: Connection | null;

  // flags
  isReady: boolean;
  lastUpdatedAt: number | null;

  // actions
  initFromSettings: () => void;
  rebuild: (opts?: { network?: Network; rpcUrl?: string; commitment?: Commitment }) => void;

  // optional future: allow user-defined RPC
  setCustomRpcUrl: (rpcUrl: string) => void;
  clearCustomRpcUrl: () => void;

  // getter helpers
  getConnection: () => Connection;
};

function defaultRpcUrl(network: Network) {
  return network === 'mainnet-beta' ? MAINNET_RPC_URL : clusterApiUrl('devnet');
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  network: 'mainnet-beta',
  rpcUrl: defaultRpcUrl('mainnet-beta'),
  commitment: 'confirmed',

  connection: null,

  isReady: false,
  lastUpdatedAt: null,

  initFromSettings: () => {
    const s = useSettingsStore.getState();
    const net = s.network ?? 'mainnet-beta';

    // 将来: settingsStore に customRpcUrl を持たせたくなったらここで拾う
    // 現状はまずデフォルトURLでOK
    get().rebuild({ network: net });
  },

  rebuild: (opts) => {
    const nextNetwork = opts?.network ?? get().network;
    const nextCommitment = opts?.commitment ?? get().commitment;

    const nextRpcUrl =
      opts?.rpcUrl ??
      // customRpcUrl が設定されていればそれを使う（このstore内に保持）
      get().rpcUrl ??
      defaultRpcUrl(nextNetwork);

    const conn = new Connection(nextRpcUrl, nextCommitment);

    set({
      network: nextNetwork,
      rpcUrl: nextRpcUrl,
      commitment: nextCommitment,
      connection: conn,
      isReady: true,
      lastUpdatedAt: Date.now(),
    });
  },

  setCustomRpcUrl: (rpcUrl: string) => {
    // ここでは network は変えず、rpcUrl だけ差し替える
    get().rebuild({ rpcUrl });
  },

  clearCustomRpcUrl: () => {
    const net = get().network;
    get().rebuild({ rpcUrl: defaultRpcUrl(net) });
  },

  getConnection: () => {
    const c = get().connection;
    if (c) return c;

    // 未初期化でも落ちないように自動初期化
    const s = useSettingsStore.getState();
    const net = s.network ?? 'mainnet-beta';
    const url = defaultRpcUrl(net);
    const conn = new Connection(url, get().commitment);

    set({
      network: net,
      rpcUrl: url,
      connection: conn,
      isReady: true,
      lastUpdatedAt: Date.now(),
    });

    return conn;
  },
}));
