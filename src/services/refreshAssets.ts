import type { Connection } from '@solana/web3.js';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

import { TOKEN_PROGRAM_ID, SOL_MINT } from '../constants/config';
import { shortenAddress } from '../utils/solanaUtils';
import { fetchTokenList, fetchPrices, fetchOnChainMetadata } from './jupiterService';

import { useWalletStore } from '../state/walletStore';
import { useConnectionStore } from '../state/connectionStore';
import { useAssetStore, type Asset } from '../state/assetStore';

const STAKE_PROGRAM_ID = new PublicKey('Stake11111111111111111111111111111111111111');
// ★ 追加: Token-2022プログラムID (最新のミームコインなどに必要)
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

let inFlight: Promise<void> | null = null;
let lastRunAt = 0;

type RefreshOptions = { force?: boolean; minIntervalMs?: number; };

function now() { return Date.now(); }

async function ensureTokenMapAndList(): Promise<Map<string, any>> {
  const assetState = useAssetStore.getState();
  const currentMap = assetState.tokenMap;
  if (currentMap && currentMap.size > 0) return currentMap;

  const tokens = await fetchTokenList();
  if (!tokens || tokens.length === 0) return new Map<string, any>();

  const seen = new Set<string>();
  const unique = tokens.filter((t: any) => {
    const key = t.address || t.mint;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const map = new Map<string, any>();
  unique.forEach((t: any) => {
    const k = t.address || t.mint;
    if (k) map.set(k, t);
  });

  useAssetStore.getState().setTokenList(unique);
  useAssetStore.getState().setTokenMap(map);
  return map;
}

async function buildAssets(params: { connection: Connection; walletAddress: string; tokenMap: Map<string, any>; }): Promise<{ assets: Asset[]; totalValue: number }> {
  const { connection, walletAddress, tokenMap } = params;
  const pubKey = new PublicKey(walletAddress);
  const tempAssets: Asset[] = [];
  const mintsToFetchPrice: string[] = [];

  // ---- SOL
  const solLamports = await connection.getBalance(pubKey);
  const solLogo = tokenMap.get(SOL_MINT)?.logoURI || '';
  tempAssets.push({ mint: SOL_MINT, symbol: 'SOL', name: 'Solana', amount: solLamports / LAMPORTS_PER_SOL, decimals: 9, price: 0, value: 0, logoURI: solLogo, status: 'verified' });
  mintsToFetchPrice.push(SOL_MINT);

  // ---- Native Stake
  let totalStakeLamports = 0;
  try {
    const stakeAccounts = await connection.getParsedProgramAccounts(STAKE_PROGRAM_ID, { filters: [{ memcmp: { offset: 12, bytes: walletAddress } }] });
    for (const account of stakeAccounts) totalStakeLamports += (account.account.lamports || 0);
  } catch (e) { console.log("[REFRESH] Native Stake error:", e); }

  if (totalStakeLamports > 0) {
    tempAssets.push({ mint: 'native-stake', symbol: 'SOL', name: 'Native Stake', amount: totalStakeLamports / LAMPORTS_PER_SOL, decimals: 9, price: 0, value: 0, logoURI: solLogo, status: 'verified' });
  }

  // ---- ★ 修正: 通常のSPLとToken-2022の両方を同時に取得する
  const [tokenAccounts, token2022Accounts] = await Promise.all([
    connection.getParsedTokenAccountsByOwner(pubKey, { programId: TOKEN_PROGRAM_ID }),
    connection.getParsedTokenAccountsByOwner(pubKey, { programId: TOKEN_2022_PROGRAM_ID })
  ]);

  const allParsedAccounts = [...tokenAccounts.value, ...token2022Accounts.value];

  for (const accountInfo of allParsedAccounts) {
    const info: any = accountInfo.account.data.parsed.info;
    const mint = info.mint as string;
    const amount = info.tokenAmount.uiAmount as number;

    if (!amount || amount <= 0) continue;

    const listedToken = tokenMap.get(mint);
    let finalName = listedToken?.name || shortenAddress(mint);
    let finalSymbol = listedToken?.symbol || 'UNKNOWN';
    const finalDecimals = info.tokenAmount.decimals as number;
    let finalLogo = listedToken?.logoURI || '';

    if (!finalLogo || finalSymbol === 'UNKNOWN') {
      try {
        const onChain = await fetchOnChainMetadata(mint);
        if (onChain) {
          if (onChain.logoURI && !finalLogo) finalLogo = onChain.logoURI;
          if (finalSymbol === 'UNKNOWN' && onChain.symbol) { finalSymbol = onChain.symbol; finalName = onChain.name; }
        }
      } catch {}
    }

    tempAssets.push({ mint, symbol: finalSymbol, name: finalName, amount, decimals: finalDecimals, logoURI: finalLogo, status: listedToken ? 'verified' : 'unknown', price: 0, value: 0 });
    mintsToFetchPrice.push(mint);
  }

  // ---- Prices
  let totalValue = 0;
  if (mintsToFetchPrice.length > 0) {
    const ids = mintsToFetchPrice.slice(0, 50).join(',');
    const priceMap = await fetchPrices(ids);
    if (priceMap) {
      const solPrice = priceMap[SOL_MINT]?.price ? Number(priceMap[SOL_MINT].price) : 0;
      for (const a of tempAssets) {
        if (a.mint === 'native-stake') {
          a.price = solPrice;
          a.value = a.amount * solPrice;
        } else {
          const p = priceMap[a.mint]?.price ? Number(priceMap[a.mint].price) : 0;
          a.price = p;
          a.value = a.amount * p;
        }
      }
      totalValue = tempAssets.reduce((sum, a) => sum + (a.value || 0), 0);
    }
  }

  tempAssets.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  return { assets: tempAssets, totalValue };
}

export async function refreshAssetsService(options: RefreshOptions = {}): Promise<void> {
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
      const { assets, totalValue } = await buildAssets({ connection, walletAddress: wallet.address, tokenMap });

      const assetStore = useAssetStore.getState();
      assetStore.setAssets(assets);
      assetStore.setTotalValue(totalValue);
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}