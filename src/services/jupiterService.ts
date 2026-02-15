import { createJupiterApiClient } from '@jup-ag/api';
import {
  JUPITER_PRICE_API,
  COINGECKO_PRICE_API,
  MAINNET_RPC_URL,
  JUPITER_BASE_PATH,
  MY_PLATFORM_FEE_BPS,
  MY_FEE_ACCOUNT,
  JUPITER_API_KEY,
} from '../constants/config';
import LOCAL_TOKEN_LIST from '../constants/token_list.json';

// =========================================================
// Logs
// =========================================================
const LOG = {
  token: '[TOKEN]',
  jup: '[JUPITER]',
  price: '[PRICE]',
  rpc: '[RPC]',
};

function maskKey(key: string) {
  if (!key) return '(empty)';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

async function safeReadText(res: Response) {
  try {
    const t = await res.text();
    return t.length > 250 ? t.slice(0, 250) + '…' : t;
  } catch {
    return '(failed to read body)';
  }
}

// =========================================================
// Headers
//  - GET: Accept + x-api-key（あれば）だけ
//  - POST: Content-Type + Accept + x-api-key（あれば）
// =========================================================
const GET_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  ...(JUPITER_API_KEY ? { 'x-api-key': JUPITER_API_KEY } : {}),
};

const POST_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  ...(JUPITER_API_KEY ? { 'x-api-key': JUPITER_API_KEY } : {}),
};

// =========================================================
// Jupiter Quote API client
// =========================================================
const jupiterQuoteApi = createJupiterApiClient({
  basePath: JUPITER_BASE_PATH,
  fetchApi: (url, init) =>
    fetch(url, {
      ...init,
      headers: { ...(init?.headers as any), ...GET_HEADERS },
    }),
});

// =========================================================
// Token list (Jupiter Tokens API v2)
// =========================================================
// verified list (recommended endpoint)
const JUPITER_TOKENS_V2_VERIFIED = 'https://api.jup.ag/tokens/v2/tag?query=verified';

export type TokenInfo = {
  address: string;  // mint
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;  // 必ず string
  tags?: string[];
};

function normalizeLogoUri(uri: any): string {
  if (!uri) return '';
  let s = String(uri);

  // ipfs:// -> https gateway
  if (s.startsWith('ipfs://')) {
    const cid = s.replace('ipfs://', '');
    // RN Imageが読める https に変換
    s = `https://cloudflare-ipfs.com/ipfs/${cid}`;
  }

  // RN標準 Image は svg / data:svg が死にがち → いったん空にして落ちるのを防ぐ
  const lower = s.toLowerCase();
  if (lower.endsWith('.svg')) return '';
  if (lower.startsWith('data:image/svg')) return '';

  return s;
}

function normalizeToken(raw: any): TokenInfo | null {
  // Jupiter/ローカルで揺れるので吸収
  const address =
    raw?.address ??
    raw?.mint ??
    raw?.id ??
    raw?.tokenAddress ??
    null;

  if (!address || typeof address !== 'string') return null;

  const symbol = String(raw?.symbol ?? '').trim();
  const name = String(raw?.name ?? raw?.displayName ?? '').trim();

  const decimals =
    typeof raw?.decimals === 'number'
      ? raw.decimals
      : typeof raw?.decimals === 'string'
        ? Number(raw.decimals)
        : NaN;

  // decimals 無いトークンが混ざると UI が落ちやすい（真っ黒）ので除外
  if (!Number.isFinite(decimals)) return null;

  const logoURI = normalizeLogoUri(raw?.logoURI ?? raw?.logoUri ?? raw?.logo_uri ?? raw?.icon ?? '');

  const tags = Array.isArray(raw?.tags) ? raw.tags : undefined;

  return {
    address,
    symbol: symbol || 'UNKNOWN',
    name: name || symbol || address.slice(0, 4),
    decimals,
    logoURI, // 空でもOK（落ちない）
    tags,
  };
}

function dedupe(tokens: TokenInfo[]): TokenInfo[] {
  const seen = new Set<string>();
  const out: TokenInfo[] = [];
  for (const t of tokens) {
    if (!t.address || seen.has(t.address)) continue;
    seen.add(t.address);
    out.push(t);
  }
  return out;
}

function loadLocalTokens(): TokenInfo[] {
  const listData: any = LOCAL_TOKEN_LIST;
  const arr = Array.isArray(listData) ? listData : (listData.tokens || []);
  const normalized = arr.map(normalizeToken).filter(Boolean) as TokenInfo[];
  return dedupe(normalized);
}

async function loadJupiterVerifiedTokens(): Promise<TokenInfo[] | null> {
  if (!JUPITER_API_KEY) return null;

  console.log(`${LOG.token} Jupiter token list request... key=${maskKey(JUPITER_API_KEY)}`);
  const res = await fetch(JUPITER_TOKENS_V2_VERIFIED, { headers: GET_HEADERS });

  if (!res.ok) {
    const body = await safeReadText(res);
    console.log(`${LOG.token} ❌ Jupiter token list failed: ${res.status} ${res.statusText} body=${body}`);
    return null;
  }

  const json = await res.json().catch(() => null);
  if (!Array.isArray(json)) {
    console.log(`${LOG.token} ⚠️ Jupiter token list shape invalid (not array).`);
    return null;
  }

  const normalized = json.map(normalizeToken).filter(Boolean) as TokenInfo[];
  const unique = dedupe(normalized);

  // 異常系の保険：少なすぎたらフォールバック
  if (unique.length < 50) {
    console.log(`${LOG.token} ⚠️ Jupiter token list too small (${unique.length}). fallback.`);
    return null;
  }

  // ロゴが空の数をログ
  const logoEmpty = unique.filter(t => !t.logoURI).length;
  console.log(`${LOG.token} ✅ Jupiter token list success: ${unique.length} tokens (logo empty: ${logoEmpty})`);

  return unique;
}

/**
 * ✅ UI安全版トークンリスト
 * - Jupiter (v2 verified) を試す（API Keyがある時）
 * - 失敗したら内包JSON
 * - 成功しても、最終的には「ローカルを優先して上書き」して安定性を上げる
 */
export const fetchTokenList = async (): Promise<TokenInfo[]> => {
  const local = loadLocalTokens();
  console.log(`${LOG.token} local tokens: ${local.length}`);

  try {
    const jup = await loadJupiterVerifiedTokens();

    if (jup) {
      // Jupiterに無い/欠ける情報をローカルで補完（ローカル優先で上書き）
      const map = new Map<string, TokenInfo>();
      jup.forEach(t => map.set(t.address, t));
      local.forEach(t => map.set(t.address, t)); // ← ローカルで上書き

      const merged = Array.from(map.values());
      console.log(`${LOG.token} ✅ merged tokens: ${merged.length} (local overrides Jupiter)`);
      return merged;
    }
  } catch (e) {
    console.log(`${LOG.token} ❌ Jupiter token list error`, e);
  }

  console.log(`${LOG.token} 📂 fallback local tokens: ${local.length}`);
  return local;
};

// =========================================================
// On-chain metadata (Helius getAsset RPC)
// =========================================================
export const fetchOnChainMetadata = async (mint: string) => {
  try {
    const response = await fetch(MAINNET_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-asset',
        method: 'getAsset',
        params: { id: mint },
      }),
    });

    const json = await response.json().catch(() => null);
    const result = json?.result;
    if (!result) return null;

    const logo = normalizeLogoUri(
      result.content?.links?.image ||
      result.content?.metadata?.image ||
      result.content?.files?.[0]?.uri ||
      ''
    );

    return {
      name: result.content?.metadata?.name || 'Unknown',
      symbol: result.content?.metadata?.symbol || '???',
      logoURI: logo,
      status: 'verified',
    };
  } catch {
    return null;
  }
};

// =========================================================
// Prices (CoinGecko -> Jupiter fallback)
// =========================================================
export const fetchPrices = async (ids: string) => {
  if (!ids) return null;

  // --- Plan A: CoinGecko ---
  try {
    const res = await fetch(COINGECKO_PRICE_API);
    if (res.ok) {
      const d = await res.json();
      const cgData: any = {};

      if (d.solana) cgData['So11111111111111111111111111111111111111112'] = { price: String(d.solana.usd) };
      if (d['usd-coin']) cgData['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'] = { price: String(d['usd-coin'].usd) };
      if (d.tether) cgData['Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'] = { price: String(d.tether.usd) };
      if (d['jito-staked-sol']) cgData['J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn'] = { price: String(d['jito-staked-sol'].usd) };
      if (d.bonk) cgData['DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'] = { price: String(d.bonk.usd) };

      console.log(`${LOG.price} ✅ CoinGecko success`);
      return cgData;
    } else {
      console.log(`${LOG.price} ⚠️ CoinGecko not ok status=${res.status}`);
    }
  } catch (e) {
    console.warn(`${LOG.price} ❌ CoinGecko error:`, e);
  }

  // --- Plan B: Jupiter price v2 fallback ---
  try {
    const url = `${JUPITER_PRICE_API}?ids=${ids}`;
    const res = await fetch(url, { headers: GET_HEADERS });
    if (res.ok) {
      const json = await res.json();
      if (json?.data) {
        console.log(`${LOG.price} ✅ Jupiter price success`);
        return json.data;
      }
      console.log(`${LOG.price} ⚠️ Jupiter price ok but empty`);
    } else {
      const body = await safeReadText(res);
      console.log(`${LOG.price} ❌ Jupiter price failed: ${res.status} body=${body}`);
    }
  } catch (e) {
    console.log(`${LOG.price} ❌ Jupiter price error:`, e);
  }

  return null;
};

// =========================================================
// Quote / Swap
// =========================================================
export const getQuote = async (inputMint: string, outputMint: string, amount: number) => {
  try {
    return await jupiterQuoteApi.quoteGet({
      inputMint,
      outputMint,
      amount,
      slippageBps: 100,
      platformFeeBps: MY_PLATFORM_FEE_BPS,
    });
  } catch (e) {
    console.log(`${LOG.jup} quote error`, e);
    return null;
  }
};

export const getSwapTransaction = async (
  quoteResponse: any,
  userPublicKey: string,
  options: any = {}
) => {
  try {
    const body = {
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: true,
      ...(MY_FEE_ACCOUNT ? { feeAccount: MY_FEE_ACCOUNT } : {}),
      ...options,
    };

    const response = await fetch(`${JUPITER_BASE_PATH}/swap`, {
      method: 'POST',
      headers: POST_HEADERS,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await safeReadText(response);
      console.log(`${LOG.jup} ❌ swap failed: ${response.status} ${response.statusText} body=${text}`);
      return null;
    }

    const json = await response.json();
    const swapTransaction = json?.swapTransaction ?? null;

    if (!swapTransaction) {
      console.log(`${LOG.jup} ⚠️ swap ok but swapTransaction missing`);
    }

    return swapTransaction;
  } catch (error) {
    console.error(`${LOG.jup} getSwapTransaction error:`, error);
    return null;
  }
};

// =========================================================
// Warmup
// =========================================================
export const warmupNetwork = async () => {
  try {
    await fetch('https://www.google.com', { method: 'HEAD' });
  } catch {}
};
