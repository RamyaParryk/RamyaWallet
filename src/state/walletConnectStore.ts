import { create } from 'zustand';
import { Core } from '@walletconnect/core';
import { Web3Wallet, IWeb3Wallet } from '@walletconnect/web3wallet';
import { REOWN } from '@env';

import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { Buffer } from 'buffer';
import { VersionedTransaction, Keypair } from '@solana/web3.js';

import { SeedVault } from '@solana-mobile/seed-vault-lib';
import { useConnectionStore } from './connectionStore';
// 🌟 完成したラッパーをインポート
import { signWithSeedVault, signMessageWithSeedVault } from '../utils/solanaUtils';

export const WALLETCONNECT_PROJECT_ID = REOWN || ''; 

interface WalletConnectState {
  web3wallet: IWeb3Wallet | null;
  initialized: boolean;
  activeSessions: any[];
  pendingSessionProposals: any[];
  pendingRequests: any[];
  
  initWalletConnect: () => Promise<void>;
  pair: (uri: string) => Promise<void>;
  approveSession: (proposal: any, userAddress: string) => Promise<void>;
  rejectSession: (proposal: any) => Promise<void>;
  
  approveRequest: (request: any, wallet: any) => Promise<void>;
  rejectRequest: (request: any) => Promise<void>;
}

export const useWalletConnectStore = create<WalletConnectState>((set, get) => ({
  web3wallet: null,
  initialized: false,
  activeSessions: [],
  pendingSessionProposals: [],
  pendingRequests: [],

  initWalletConnect: async () => {
    if (get().initialized) return;
    try {
      const core = new Core({ projectId: WALLETCONNECT_PROJECT_ID });
      const web3wallet = await Web3Wallet.init({
        core: core as any,
        metadata: {
          name: 'RamyaWallet',
          description: 'A fast and secure Solana wallet',
          url: 'https://ramyaparryk.github.io/RamyaWallet/', 
          icons: ['https://ramyaparryk.github.io/RamyaWallet/icon.png'], 
        },
      });

      web3wallet.on('session_proposal', (proposal) => {
        set((state) => ({ pendingSessionProposals: [...state.pendingSessionProposals, proposal] }));
      });

      web3wallet.on('session_request', (request) => {
        set((state) => ({ pendingRequests: [...state.pendingRequests, request] }));
      });

      web3wallet.on('session_delete', () => {
        set({ activeSessions: Object.values(web3wallet.getActiveSessions()) });
      });

      set({ web3wallet, initialized: true, activeSessions: Object.values(web3wallet.getActiveSessions()) });
    } catch (error) { console.error(error); }
  },

  pair: async (uri: string) => {
    const { web3wallet } = get();
    if (!web3wallet) throw new Error('WalletConnect not initialized');
    await web3wallet.core.pairing.pair({ uri });
  },

  approveSession: async (proposal: any, userAddress: string) => {
    const { web3wallet } = get();
    if (!web3wallet) return;

    const requiredMethods = proposal.params.requiredNamespaces?.solana?.methods || [];
    const approvedMethods = Array.from(new Set([
      ...requiredMethods,
      'solana_signTransaction',
      'solana_signMessage',
      'solana_signAndSendTransaction'
    ]));

    const namespaces = {
      solana: {
        chains: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
        accounts: [`solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:${userAddress}`],
        methods: approvedMethods,
        events: proposal.params.requiredNamespaces?.solana?.events || [],
      },
    };

    try {
      await web3wallet.approveSession({ id: proposal.id, namespaces });
      set((state) => ({
        pendingSessionProposals: state.pendingSessionProposals.filter(p => p.id !== proposal.id),
        activeSessions: Object.values(web3wallet.getActiveSessions())
      }));
    } catch (error) { console.error(error); }
  },

  rejectSession: async (proposal: any) => {
    const { web3wallet } = get();
    if (!web3wallet) return;
    await web3wallet.rejectSession({ id: proposal.id, reason: { code: 5000, message: 'User rejected.' } });
    set((state) => ({ pendingSessionProposals: state.pendingSessionProposals.filter(p => p.id !== proposal.id) }));
  },

  approveRequest: async (request: any, wallet: any) => {
    const { web3wallet } = get();
    if (!web3wallet) return;

    try {
      const { topic, id, params } = request;
      const method = params.request.method;
      const reqParams = params.request.params;
      let result: any = null;

      if (method === 'solana_signMessage') {
        const msgString = reqParams.message || reqParams.pubkey; 
        let msgBytes: Uint8Array;
        try { msgBytes = bs58.decode(msgString); } catch { msgBytes = Buffer.from(msgString, 'utf8'); }
        
        if (wallet.walletType === 'seed-vault') {
          // 🌟 ラッパーを使用
          const signatureBytes = await signMessageWithSeedVault(msgBytes, wallet);
          result = { signature: bs58.encode(signatureBytes) };
        } else {
          if (!wallet.secretKey) throw new Error("Secret key is missing");
          const signatureBytes = nacl.sign.detached(msgBytes, wallet.secretKey);
          result = { signature: bs58.encode(signatureBytes) };
        }
      } 
      else if (method === 'solana_signTransaction') {
        const txString = reqParams.transaction || reqParams.transactions?.[0];
        let txBytes: Uint8Array;
        try { txBytes = bs58.decode(txString); } catch { txBytes = Buffer.from(txString, 'base64'); }

        if (wallet.walletType === 'seed-vault') {
          // 🌟 旧コードを削除し、ラッパーを使用
          const signedTxBytes = await signWithSeedVault(txBytes, wallet);
          result = { signature: bs58.encode(signedTxBytes) };
        } else {
          if (!wallet.secretKey) throw new Error("Secret key is missing");
          const transaction = VersionedTransaction.deserialize(txBytes);
          transaction.sign([Keypair.fromSecretKey(wallet.secretKey)]);
          result = { signature: bs58.encode(transaction.serialize()) };
        }
      }
      else if (method === 'solana_signAndSendTransaction') {
        const txString = reqParams.transaction || reqParams.transactions?.[0];
        let txBytes: Uint8Array;
        try { txBytes = bs58.decode(txString); } catch { txBytes = Buffer.from(txString, 'base64'); }

        const connection = useConnectionStore.getState().connection;
        if (!connection) throw new Error("Connection not established");

        let txid = '';
        if (wallet.walletType === 'seed-vault') {
          // 🌟 旧コードを削除し、ラッパーを使用
          const signedTxBytes = await signWithSeedVault(txBytes, wallet);
          txid = await connection.sendRawTransaction(signedTxBytes, { skipPreflight: true });
        } else {
          if (!wallet.secretKey) throw new Error("Secret key is missing");
          const transaction = VersionedTransaction.deserialize(txBytes);
          transaction.sign([Keypair.fromSecretKey(wallet.secretKey)]);
          txid = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: true });
        }
        result = { signature: txid };
      }

      await web3wallet.respondSessionRequest({
        topic,
        response: { id, jsonrpc: '2.0', result }
      });

      set((state) => ({ pendingRequests: state.pendingRequests.filter(r => r.id !== id) }));
    } catch (error) {
      console.error("Approve Request Error:", error);
      await get().rejectRequest(request);
    }
  },

  rejectRequest: async (request: any) => {
    const { web3wallet } = get();
    if (!web3wallet) return;
    const { topic, id } = request;

    try {
      await web3wallet.respondSessionRequest({
        topic,
        response: { id, jsonrpc: '2.0', error: { code: 5000, message: 'User rejected the request.' } }
      });
    } catch (error) {
      console.log("Reject Request Error:", error);
    }

    set((state) => ({ pendingRequests: state.pendingRequests.filter(r => r.id !== id) }));
  }
}));