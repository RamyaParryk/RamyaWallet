import { createJupiterApiClient } from '@jup-ag/api';
import {
  MAINNET_RPC_URL,
  JUPITER_PRICE_API,
  MY_PLATFORM_FEE_BPS,
  MY_FEE_ACCOUNT,
  JUPITER_API_KEY,
  COIN_GENKO_API_KEY
} from '../constants/config';
import LOCAL_TOKEN_LIST from '../constants/token_list.json';

const LOG = { token: '[TOKEN]', jup: '[JUPITER]', price: '[PRICE]', rpc: '[RPC]' };

export const SOL_MINT = "So11111111111111111111111111111111111111112";

function maskKey(key: string) {
  if (!key) return '(empty)';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

// ★ 新しいAPIキーをヘッダーにセット
const GET_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  ...(JUPITER_API_KEY ? { 'x-api-key': JUPITER_API_KEY } : {}),
};

// ★ basePathを最新の「Jupiter v6」エンドポイントに固定
export const jupiterQuoteApi = createJupiterApiClient({
  basePath: 'https://quote-api.jup.ag/v6',
  fetchApi: (url, init) => fetch(url, { 
    ...init, 
    headers: { 
      ...(init?.headers as any), 
      ...GET_HEADERS,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    } 
  }),
});

// トークンリストも最新のグローバルCDN（APIキー不要）に変更
const JUPITER_TOKENS_V6_VERIFIED = 'https://tokens.jup.ag/tokens?tags=verified';

export type TokenInfo = { address: string; symbol: string; name: string; decimals: number; logoURI: string; tags?: string[]; };

function normalizeLogoUri(uri: any): string {
  if (!uri) return '';
  let s = String(uri);
  if (s.startsWith('ipfs://')) s = `https://cloudflare-ipfs.com/ipfs/${s.replace('ipfs://', '')}`;
  const lower = s.toLowerCase();
  if (lower.endsWith('.svg') || lower.startsWith('data:image/svg')) return '';
  return s;
}

function normalizeToken(raw: any): TokenInfo | null {
  const address = raw?.address ?? raw?.mint ?? raw?.id ?? raw?.tokenAddress ?? null;
  if (!address || typeof address !== 'string') return null;
  const symbol = String(raw?.symbol ?? '').trim();
  const name = String(raw?.name ?? raw?.displayName ?? '').trim();
  const decimals = typeof raw?.decimals === 'number' ? raw.decimals : typeof raw?.decimals === 'string' ? Number(raw.decimals) : NaN;
  if (!Number.isFinite(decimals)) return null;
  const logoURI = normalizeLogoUri(raw?.logoURI ?? raw?.logoUri ?? raw?.logo_uri ?? raw?.icon ?? '');
  return { address, symbol: symbol || 'UNKNOWN', name: name || symbol || address.slice(0, 4), decimals, logoURI, tags: Array.isArray(raw?.tags) ? raw.tags : undefined };
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
  return dedupe(arr.map(normalizeToken).filter(Boolean) as TokenInfo[]);
}

async function loadJupiterVerifiedTokens(): Promise<TokenInfo[] | null> {
  try {
    const res = await fetch(JUPITER_TOKENS_V6_VERIFIED, { headers: GET_HEADERS });
    if (!res.ok) return null;
    const json: any = await res.json().catch(() => null);
    if (!Array.isArray(json)) return null;
    const unique = dedupe(json.map(normalizeToken).filter(Boolean) as TokenInfo[]);
    if (unique.length < 50) return null;
    return unique;
  } catch { return null; }
}

export const fetchTokenList = async (): Promise<TokenInfo[]> => {
  const local = loadLocalTokens();
  try {
    const jup = await loadJupiterVerifiedTokens();
    if (jup) {
      const map = new Map<string, TokenInfo>();
      jup.forEach(t => map.set(t.address, t));
      local.forEach(t => map.set(t.address, t));
      return Array.from(map.values());
    }
  } catch (e) { }
  return local;
};

export const fetchOnChainMetadata = async (mint: string) => {
  try {
    const response = await fetch(MAINNET_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'get-asset', method: 'getAsset', params: { id: mint } }),
    });
    const json: any = await response.json().catch(() => null);
    if (!json?.result) return null;
    const logo = normalizeLogoUri(json.result.content?.links?.image || json.result.content?.metadata?.image || json.result.content?.files?.[0]?.uri || '');
    return { name: json.result.content?.metadata?.name || 'Unknown', symbol: json.result.content?.metadata?.symbol || '???', logoURI: logo, status: 'verified' };
  } catch { return null; }
};

export const fetchPrices = async (ids: string) => {
  if (!ids) return null;
  try {
    const addresses = ids.split(',');
    const hasSol = addresses.includes(SOL_MINT) || addresses.includes('native-stake');
    const splAddresses = addresses.filter(a => a !== SOL_MINT && a !== 'native-stake').join(',');
    const priceMap: any = {};

    if (hasSol) {
      const solRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd`, {
        headers: { 'x-cg-demo-api-key': COIN_GENKO_API_KEY || '' }
      });
      if (solRes.ok) {
        const solData: any = await solRes.json();
        if (solData.solana?.usd) {
          priceMap[SOL_MINT] = { price: String(solData.solana.usd) };
          priceMap['native-stake'] = { price: String(solData.solana.usd) };
        }
      }
    }

    if (splAddresses) {
      const url = `https://api.coingecko.com/api/v3/simple/token_price/solana?contract_addresses=${splAddresses}&vs_currencies=usd`;
      const res = await fetch(url, {
        headers: { 'x-cg-demo-api-key': COIN_GENKO_API_KEY || '' }
      });
      if (res.ok) {
        const data: any = await res.json();
        Object.keys(data).forEach((address) => {
          if (data[address]?.usd !== undefined) priceMap[address] = { price: String(data[address].usd) };
        });
      }
    }
    return priceMap;
  } catch (e) {
    console.warn(`${LOG.price} ❌ CoinGecko error:`, e);
  }

  try {
    const res = await fetch(`${JUPITER_PRICE_API}?ids=${ids}`, { headers: GET_HEADERS });
    if (res.ok) {
      const json: any = await res.json();
      if (json?.data) return json.data;
    }
  } catch (e) { }
  return null;
};

export const getQuote = async (inputMint: string, outputMint: string, amount: number) => {
  try { return await jupiterQuoteApi.quoteGet({ inputMint, outputMint, amount, slippageBps: 100, platformFeeBps: MY_PLATFORM_FEE_BPS }); } catch (e) { return null; }
};

// ★ 手動のfetch POSTを廃止し、公式SDKのswapPostに一本化（これで完全にv6になります）
export const getSwapTransaction = async (quoteResponse: any, userPublicKey: string, options: any = {}) => {
  try {
    const swapRequest = {
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: true,
      ...(MY_FEE_ACCOUNT ? { feeAccount: MY_FEE_ACCOUNT } : {}),
      ...options
    };
    const result = await jupiterQuoteApi.swapPost({ swapRequest });
    return result?.swapTransaction ?? null;
  } catch (error) { 
    console.error(`${LOG.jup} ❌ Swap TX Error:`, error);
    return null; 
  }
};

export const warmupNetwork = async () => { try { await fetch('https://www.google.com', { method: 'HEAD' }); } catch {} };