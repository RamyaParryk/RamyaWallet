import type { Connection } from '@solana/web3.js';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

import { TOKEN_PROGRAM_ID, SOL_MINT } from '../constants/config';
import { shortenAddress } from '../utils/solanaUtils';
import {
  fetchTokenList,
  fetchPrices,
  fetchOnChainMetadata,
} from './jupiterService';

import { useWalletStore } from '../state/walletStore';
import { useConnectionStore } from '../state/connectionStore';
import { useAssetStore, type Asset } from '../state/assetStore';

/**
 * どこからでも `await refreshAssetsService()` を呼べるようにするのが目的。
 */

let inFlight: Promise<void> | null = null;
let lastRunAt = 0;

type RefreshOptions = {
  /** trueなら連打抑制を無視 */
  force?: boolean;
  /** 連打抑制の間隔(ms)。デフォは3000ms */
  minIntervalMs?: number;
};

function now() {
  return Date.now();
}

async function ensureTokenMapAndList(): Promise<Map<string, any>> {
  const assetState = useAssetStore.getState();
  const currentMap = assetState.tokenMap;

  // 既にあればそれを使う
  if (currentMap && currentMap.size > 0) return currentMap;

  // なければ tokenList から作る
  const tokens = await fetchTokenList();
  if (!tokens || tokens.length === 0) {
    // 空のまま返す（呼び出し側で on-chain fallback する）
    return new Map<string, any>();
  }

  // 重複除外
  const seen = new Set<string>();
  const unique = tokens.filter((t: any) => {
    const key = t.address || t.mint;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // logoURI が空なら on-chain で補完（コストあるので必要な時だけ）
  const updated = await Promise.all(
    unique.map(async (t: any) => {
      if (!t.logoURI || t.logoURI === '') {
        try {
          const meta = await fetchOnChainMetadata(t.address || t.mint);
          if (meta?.logoURI) return { ...t, logoURI: meta.logoURI };
        } catch {}
      }
      return t;
    })
  );

  // store 更新
  const map = new Map<string, any>();
  updated.forEach((t: any) => {
    const k = t.address || t.mint;
    if (k) map.set(k, t);
  });

  useAssetStore.getState().setTokenList(updated);
  useAssetStore.getState().setTokenMap(map);

  return map;
}

async function buildAssets(params: {
  connection: Connection;
  walletAddress: string;
  tokenMap: Map<string, any>;
}): Promise<{ assets: Asset[]; totalValue: number }> {
  const { connection, walletAddress, tokenMap } = params;

  const pubKey = new PublicKey(walletAddress);
  const tempAssets: Asset[] = [];
  const mintsToFetchPrice: string[] = [];

  // ---- SOL
  const solLamports = await connection.getBalance(pubKey);
  const solInfo = tokenMap.get(SOL_MINT);
  const solLogo = solInfo?.logoURI || '';

  tempAssets.push({
    mint: SOL_MINT,
    symbol: 'SOL',
    name: 'Solana',
    amount: solLamports / LAMPORTS_PER_SOL,
    decimals: 9,
    price: 0,
    value: 0,
    logoURI: solLogo,
    status: 'verified',
  });

  mintsToFetchPrice.push(SOL_MINT);

  // ---- SPL
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
    programId: TOKEN_PROGRAM_ID,
  });

  for (const accountInfo of tokenAccounts.value) {
    const info: any = accountInfo.account.data.parsed.info;
    const mint = info.mint as string;
    const amount = info.tokenAmount.uiAmount as number;

    if (!amount || amount <= 0) continue;

    const listedToken = tokenMap.get(mint);

    let finalName = listedToken?.name || shortenAddress(mint);
    let finalSymbol = listedToken?.symbol || 'UNKNOWN';
    const finalDecimals = info.tokenAmount.decimals as number;
    let finalLogo = listedToken?.logoURI || '';

    // リストにない/ロゴなしなら on-chain で補完
    if (!finalLogo || finalSymbol === 'UNKNOWN') {
      try {
        const onChain = await fetchOnChainMetadata(mint);
        if (onChain) {
          if (onChain.logoURI && !finalLogo) finalLogo = onChain.logoURI;
          if (finalSymbol === 'UNKNOWN' && onChain.symbol) {
            finalSymbol = onChain.symbol;
            finalName = onChain.name;
          }
        }
      } catch {}
    }

    const isVerified = !!listedToken;

    tempAssets.push({
      mint,
      symbol: finalSymbol,
      name: finalName,
      amount,
      decimals: finalDecimals,
      logoURI: finalLogo,
      status: isVerified ? 'verified' : 'unknown',
      price: 0,
      value: 0,
    });

    mintsToFetchPrice.push(mint);
  }

  // ---- Prices
  let totalValue = 0;
  if (mintsToFetchPrice.length > 0) {
    const ids = mintsToFetchPrice.slice(0, 50).join(',');
    const priceMap = await fetchPrices(ids);

    if (priceMap) {
      for (const a of tempAssets) {
        const pInfo = priceMap[a.mint];
        if (pInfo?.price) {
          const p = Number(pInfo.price);
          a.price = p;
          a.value = a.amount * p;
        }
      }
      totalValue = tempAssets.reduce((sum, a) => sum + (a.value || 0), 0);
    }
  }

  // sort by value desc
  tempAssets.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  return { assets: tempAssets, totalValue };
}

/**
 * ✅ どこからでも呼べる資産更新（store直接更新）
 */
export async function refreshAssetsService(options: RefreshOptions = {}): Promise<void> {
  // 連打抑制（UIの連続タップや多重useEffect対策）
  const minInterval = options.minIntervalMs ?? 3000;
  if (!options.force && now() - lastRunAt < minInterval) return;

  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      lastRunAt = now();

      const wallet = useWalletStore.getState().wallet;
      const connection = useConnectionStore.getState().connection;

      if (!wallet || !connection) return;

      const tokenMap = await ensureTokenMapAndList();

      const { assets, totalValue } = await buildAssets({
        connection,
        walletAddress: wallet.address,
        tokenMap,
      });

      const assetStore = useAssetStore.getState();
      assetStore.setAssets(assets);
      assetStore.setTotalValue(totalValue);
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
