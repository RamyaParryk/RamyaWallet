import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAINNET_RPC_URL } from '../constants/config';

const ICON_CACHE_KEY = 'ramya_icon_cache_v2';
const ICON_NEGATIVE_KEY = 'ramya_icon_cache_neg_v2';

// 14日キャッシュ
const ICON_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14;
// 取得不能mintは24時間は再問い合わせしない（無駄なRPC削減）
const NEGATIVE_TTL_MS = 1000 * 60 * 60 * 24;

type CacheEntry = { uri: string; cachedAt: number };
type IconCache = Record<string, CacheEntry>;
type NegCache = Record<string, { cachedAt: number }>;

function normalizeLogoUri(uri: any): string {
  if (!uri) return '';
  let s = String(uri).trim();
  if (!s) return '';

  if (s.startsWith('ipfs://')) {
    const cid = s.replace('ipfs://', '');
    s = `https://cloudflare-ipfs.com/ipfs/${cid}`;
  }

  const lower = s.toLowerCase();
  if (lower.endsWith('.svg')) return '';
  if (lower.startsWith('data:image/svg')) return '';

  return s;
}

async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function saveJson(key: string, value: any) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

async function getCachedIconUri(mint: string): Promise<string> {
  const cache = await loadJson<IconCache>(ICON_CACHE_KEY, {});
  const e = cache[mint];
  if (!e) return '';
  if (Date.now() - e.cachedAt > ICON_CACHE_TTL_MS) return '';
  return e.uri || '';
}

async function isNegativeCached(mint: string): Promise<boolean> {
  const neg = await loadJson<NegCache>(ICON_NEGATIVE_KEY, {});
  const e = neg[mint];
  if (!e) return false;
  return Date.now() - e.cachedAt < NEGATIVE_TTL_MS;
}

async function setNegativeCache(mint: string) {
  const neg = await loadJson<NegCache>(ICON_NEGATIVE_KEY, {});
  neg[mint] = { cachedAt: Date.now() };
  await saveJson(ICON_NEGATIVE_KEY, neg);
}

async function setIconCache(mint: string, uri: string) {
  const cache = await loadJson<IconCache>(ICON_CACHE_KEY, {});
  cache[mint] = { uri, cachedAt: Date.now() };
  await saveJson(ICON_CACHE_KEY, cache);
}

// Helius DAS getAsset でアイコンURLを引く
async function resolveIconFromHelius(mint: string): Promise<string> {
  try {
    const res = await fetch(MAINNET_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-asset',
        method: 'getAsset',
        params: { id: mint },
      }),
    });

    if (!res.ok) {
      console.log(`[ICON] helius getAsset failed: ${res.status} ${res.statusText}`);
      return '';
    }

    const json = await res.json();
    const result = json?.result;
    if (!result) return '';

    const uri =
      normalizeLogoUri(result?.content?.links?.image) ||
      normalizeLogoUri(result?.content?.metadata?.image) ||
      normalizeLogoUri(result?.content?.files?.[0]?.uri);

    return uri || '';
  } catch (e) {
    console.log('[ICON] resolveIconFromHelius error', e);
    return '';
  }
}

/**
 * ✅ TokenIcon から使う「最終解決」関数
 * - preferredUri が有効ならそれ
 * - キャッシュがあればそれ
 * - negative cache なら即諦め
 * - Helius で引いて、取れたらキャッシュ
 */
export async function resolveTokenIcon(mint: string, preferredUri?: string): Promise<string> {
  const direct = normalizeLogoUri(preferredUri);
  if (direct) return direct;

  const cached = await getCachedIconUri(mint);
  if (cached) return cached;

  if (await isNegativeCached(mint)) return '';

  const heliusUri = await resolveIconFromHelius(mint);
  if (heliusUri) {
    await setIconCache(mint, heliusUri);
    return heliusUri;
  }

  await setNegativeCache(mint);
  return '';
}

// （必要なら外部でも使えるように export）
export { normalizeLogoUri };
