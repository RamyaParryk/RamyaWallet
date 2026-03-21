import type { Connection } from '@solana/web3.js';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

import { TOKEN_PROGRAM_ID, SOL_MINT } from '../constants/config';
import { shortenAddress } from '../utils/solanaUtils';
import { fetchTokenList, fetchPrices, fetchOnChainMetadata } from './jupiterService';

import { useWalletStore } from '../state/walletStore';
import { useConnectionStore } from '../state/connectionStore';
import { useAssetStore, type Asset } from '../state/assetStore';

const STAKE_PROGRAM_ID = new PublicKey('Stake11111111111111111111111111111111111111');
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

  const addAsset = (data: Partial<Asset> & { mint: string; symbol: string; name: string; amount: number }) => {
    tempAssets.push({
      decimals: 0,
      logoURI: '',
      status: 'verified',
      price: 0,
      value: 0,
      ...data
    });
  };

  // ---- SOL
  const solLamports = await connection.getBalance(pubKey);
  addAsset({ 
    mint: SOL_MINT, symbol: 'SOL', name: 'Solana', amount: solLamports / LAMPORTS_PER_SOL, 
    decimals: 9, logoURI: tokenMap.get(SOL_MINT)?.logoURI 
  });
  mintsToFetchPrice.push(SOL_MINT);

  // ---- Native Stake
  let totalStakeLamports = 0;
  try {
    const stakeAccounts = await connection.getParsedProgramAccounts(STAKE_PROGRAM_ID, { filters: [{ memcmp: { offset: 12, bytes: walletAddress } }] });
    for (const account of stakeAccounts) totalStakeLamports += (account.account.lamports || 0);
  } catch (e) { console.log("[REFRESH] Native Stake error:", e); }

  if (totalStakeLamports > 0) {
    addAsset({ 
      mint: 'native-stake', symbol: 'SOL', name: 'Native Stake', amount: totalStakeLamports / LAMPORTS_PER_SOL, 
      decimals: 9, logoURI: tokenMap.get(SOL_MINT)?.logoURI 
    });
  }

  // ---- 通常のSPLとToken-2022
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

    addAsset({ 
      mint, symbol: finalSymbol, name: finalName, amount, 
      decimals: finalDecimals, logoURI: finalLogo, status: listedToken ? 'verified' : 'unknown' 
    });
    mintsToFetchPrice.push(mint);
  }

// ---- NFT (Helius DAS API)
  try {
    const response = await fetch(connection.rpcEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 'nft-fetch', method: 'getAssetsByOwner',
        params: { ownerAddress: walletAddress, page: 1, limit: 1000, displayOptions: { showFungible: false } }, // ここは trueであるべきかも
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.result && data.result.items) {
        for (const item of data.result.items) {
          const mint = item.id;
          if (!tempAssets.find(a => a.mint === mint)) {
            const name = item.content?.metadata?.name || 'Unknown NFT';
            const symbol = item.content?.metadata?.symbol || 'NFT';
            const logoURI = item.content?.links?.image || item.content?.files?.[0]?.uri || '';
            const amount = item.ownership?.amount || 1;
            
            let description = item.content?.metadata?.description || '';
            const isToken2022 = item.token_info?.token_program === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
            const isSpam = item.mutable === true && (name.toLowerCase().includes('airdrop') || name.toLowerCase().includes('claim'));

            // ★ 調査用ログ: NFTのログ詳出力、Seekerは含まれないかも
            console.log('[NFT]', {
            name,
            symbol,
            jsonUri: item.content?.json_uri,
            metaUri: item.content?.metadata?.uri,
            });

            // ★ 2段構え！説明文が空ならJSONを直接読みに行く
            if (!description) {
              const jsonUri = item.content?.json_uri || item.content?.metadata?.uri;
              if (jsonUri && jsonUri.startsWith('http')) {
                try {
                  if (name.includes('Seeker')) console.log(`[DEBUG] Fetching deep JSON from: ${jsonUri}`);
                  
                  const metaRes = await fetch(jsonUri);
                  const metaJson = await metaRes.json();
                  
                  if (name.includes('Seeker')) console.log(`[DEBUG] Deep JSON result:`, metaJson);

                  // いろんな場所にある可能性を考慮して探す
                  if (metaJson.description) {
                    description = metaJson.description;
                  } else if (metaJson.metadata?.description) {
                    description = metaJson.metadata.description;
                  }
                } catch (e) {
                  console.log("Failed to fetch deep JSON for NFT:", mint, e);
                }
              }
            }

            addAsset({
              mint, symbol, name, amount, logoURI,
              status: isSpam ? 'suspicious' : 'verified',
              description, isToken2022, possibleSpam: isSpam
            });
          }
        }
      }
    }
  } catch (e) {
    console.log("[REFRESH] DAS API NFT fetch error:", e);
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
        } else if (a.decimals > 0) { 
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