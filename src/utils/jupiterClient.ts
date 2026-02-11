import { createJupiterApiClient } from '@jup-ag/api';
import {
  TOKEN_LIST_URL,
  JUPITER_TOKEN_LIST_API,
  JUPITER_PRICE_API,
  COINGECKO_PRICE_API,
  MAINNET_RPC_URL,
  JUPITER_BASE_PATH,
  MY_PLATFORM_FEE_BPS,
  MY_FEE_ACCOUNT,
  JUPITER_API_KEY
} from '../constants/config';
import LOCAL_TOKEN_LIST from '../constants/token_list.json';

// Jupiter用ヘッダー
const COMMON_HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'User-Agent': 'RamyaWallet/1.0.1',
  ...(JUPITER_API_KEY ? { 'x-api-key': JUPITER_API_KEY } : {})
};

const jupiterQuoteApi = createJupiterApiClient({
  basePath: JUPITER_BASE_PATH,
  fetchApi: (url, init) => fetch(url, { ...init, headers: { ...init?.headers, ...COMMON_HEADERS } }),
});

// ---------------------------------------------------------
// 2. トークンリスト取得
// ---------------------------------------------------------
export const fetchTokenList = async () => {

  console.log('[TOKEN] 📂 内包リストを使用します...');
  const listData: any = LOCAL_TOKEN_LIST;
  const tokens = Array.isArray(listData) ? listData : (listData.tokens || []);

  return tokens;

  /** 70程度のトークンなので、通信せずに内包json仕様 **/

  // // --- Plan A: Jupiter公式API ---
  // try {
  //   const res = await fetch(JUPITER_TOKEN_LIST_API, {
  //     method: 'GET',
  //     headers: { 'User-Agent': 'Mozilla/5.0' }
  //   });
  //   if (res.ok) {
  //     const tokens = await res.json();
  //     if (Array.isArray(tokens) && tokens.length > 500) {
  //       console.log(`[TOKEN] ✅ Jupiter成功: ${tokens.length} tokens`);
  //       return tokens;
  //     }
  //   }
  // } catch (e) {
  //   console.warn("[TOKEN] ⚠️ Jupiter失敗");
  // }

  // // --- Plan B: 自分のリスト ---
  // console.log('[TOKEN] 📂 アプリ内包リストを読み込みます...');
  // try {
  //   const res = await fetch(TOKEN_LIST_URL);
  //   if (res.ok) {
  //     const tokens = await res.json();
  //     console.log(`[TOKEN] ✅ バックアップ成功: ${tokens.length} tokens`);
  //     return tokens;
  //   }
  // } catch (e) {
  //   console.error("[TOKEN] 🚨 全リスト取得失敗");
  // }

  // return [];

};

// ---------------------------------------------------------
// 3. メタデータ取得
// ---------------------------------------------------------
export const fetchOnChainMetadata = async (mint: string) => {
  try {
    const response = await fetch(MAINNET_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 'get-asset', method: 'getAsset', params: { id: mint },
      }),
    });
    const { result } = await response.json();
    if (!result) return null;
    return {
      name: result.content?.metadata?.name || 'Unknown',
      symbol: result.content?.metadata?.symbol || '???',
      logoURI: result.content?.links?.image || result.content?.metadata?.image || result.content?.files?.[0]?.uri || '',
      status: 'verified',
    };
  } catch (e) { return null; }
};

// ---------------------------------------------------------
// 4. 価格取得 (fetchPrices に変更)
// ---------------------------------------------------------
export const fetchPrices = async (ids: string) => {
  if (!ids) return null;

  // --- Plan A: CoinGecko (最優先) ---
  try {
    const res = await fetch(COINGECKO_PRICE_API);
    if (res.ok) {
      const d = await res.json();
      const cgData: any = {};
      // 主要銘柄のマッピング
      if (d.solana) cgData['So11111111111111111111111111111111111111112'] = { price: String(d.solana.usd) };
      if (d['usd-coin']) cgData['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'] = { price: String(d['usd-coin'].usd) };
      if (d.tether) cgData['Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'] = { price: String(d.tether.usd) };
      if (d['jito-staked-sol']) cgData['J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn'] = { price: String(d['jito-staked-sol'].usd) };
      if (d.bonk) cgData['DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'] = { price: String(d.bonk.usd) };

      console.log(`[CLIENT] ✅ CoinGecko成功`);
      return cgData;
    }
  } catch (e) {
    console.warn("[CLIENT] CoinGecko失敗:", e);
  }

  // --- Plan B: Jupiter Price API v2 ---
  try {
    const url = `${JUPITER_PRICE_API}?ids=${ids}`;
    const res = await fetch(url, { headers: COMMON_HEADERS });
    if (res.ok) {
      const json = await res.json();
      if (json.data) return json.data;
    }
  } catch (e) { }

  return null;
};

// ... (getQuote, getSwapTransaction, warmupNetwork はそのまま)
export const getQuote = async (inputMint: string, outputMint: string, amount: number) => {
  try {
    return await jupiterQuoteApi.quoteGet({
      inputMint, outputMint, amount, slippageBps: 100, platformFeeBps: MY_PLATFORM_FEE_BPS,
    });
  } catch (e) { return null; }
};

export const getSwapTransaction = async (
  quoteResponse: any,
  userPublicKey: string,
  options: any = {} // ★ 第3引数を追加
) => {
  try {
    const response = await fetch(`${JUPITER_BASE_PATH}/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: true,
        // ★ options の中身（prioritizationFeeLamports など）を展開して渡す
        ...options,
      }),
    });

    const { swapTransaction } = await response.json();
    return swapTransaction;
  } catch (error) {
    console.error('getSwapTransaction error:', error);
    return null;
  }
};

export const warmupNetwork = async () => { try { await fetch('https://www.google.com', { method: 'HEAD' }); } catch (e) { } };