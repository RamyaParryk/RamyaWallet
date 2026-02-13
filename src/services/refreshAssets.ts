import type { Connection } from '@solana/web3.js';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

import { TOKEN_PROGRAM_ID, SOL_MINT } from '../constants/config';
import { fetchPrices, fetchTokenList, fetchOnChainMetadata } from './jupiterService';
import { shortenAddress } from '../utils/solanaUtils';

// App.tsx 側で Asset 型を store から import しているなら、ここは不要。
// ただし services 側でも型を使いたいので最低限定義しておく。
export type Asset = {
  mint: string;
  symbol: string;
  name: string;
  amount: number;
  decimals: number;
  price?: number;
  value?: number;
  logoURI: string;
  status?: 'verified' | 'unknown' | 'suspicious';
};

type Params = {
  connection: Connection;
  walletAddress: string;
  tokenMap: Map<string, any>;
  onTokenMapUpdate?: (m: Map<string, any>) => void;
};

export async function refreshAssetsService(params: Params): Promise<{
  assets: Asset[];
  totalValue: number;
}> {
  const { connection, walletAddress } = params;
  let currentMap = params.tokenMap;

  // TokenMap が空なら再生成
  if (!currentMap || currentMap.size === 0) {
    try {
      const list = await fetchTokenList();
      if (list && list.length > 0) {
        const newMap = new Map<string, any>();
        list.forEach((tok: any) => {
          const key = tok.address || tok.mint;
          if (key) newMap.set(key, tok);
        });
        currentMap = newMap;
        params.onTokenMapUpdate?.(newMap);
      }
    } catch {}
  }

  const pubKey = new PublicKey(walletAddress);
  const tempAssets: Asset[] = [];
  const mintsToFetchPrice: string[] = [];

  // SOL
  const solBalance = await connection.getBalance(pubKey);
  const solInfo = currentMap.get(SOL_MINT);
  const solLogo = solInfo?.logoURI || '';

  tempAssets.push({
    mint: SOL_MINT,
    symbol: 'SOL',
    name: 'Solana',
    amount: solBalance / LAMPORTS_PER_SOL,
    decimals: 9,
    price: 0,
    value: 0,
    logoURI: solLogo,
    status: 'verified',
  });
  mintsToFetchPrice.push(SOL_MINT);

  // SPL
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
    programId: TOKEN_PROGRAM_ID,
  });

  for (const accountInfo of tokenAccounts.value) {
    const info: any = accountInfo.account.data.parsed.info;
    const mint = info.mint as string;
    const amount = info.tokenAmount.uiAmount as number;

    if (amount > 0) {
      const listedToken = currentMap.get(mint);

      let finalName = listedToken?.name || shortenAddress(mint);
      let finalSymbol = listedToken?.symbol || 'UNKNOWN';
      const finalDecimals = info.tokenAmount.decimals as number;
      let finalLogo = listedToken?.logoURI || '';

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
  }

  // Prices
  let totalValue = 0;
  if (mintsToFetchPrice.length > 0) {
    const ids = mintsToFetchPrice.slice(0, 50).join(',');
    const priceMap = await fetchPrices(ids);

    if (priceMap) {
      tempAssets.forEach((asset) => {
        const pInfo = priceMap[asset.mint];
        if (pInfo?.price) {
          const p = Number(pInfo.price);
          asset.price = p;
          asset.value = asset.amount * p;
        }
      });

      totalValue = tempAssets.reduce((sum, a) => sum + (a.value || 0), 0);
    }
  }

  tempAssets.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  return { assets: tempAssets, totalValue };
}
