import AsyncStorage from '@react-native-async-storage/async-storage';
import LOCAL_TOKEN_LIST from '../constants/token_list.json';
import { JUPITER_API_KEY } from '../constants/config';

const CACHE_KEY = 'ramya_tokens_cache_v1';
const CACHE_META_KEY = 'ramya_tokens_cache_meta_v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h

// 壊れアイコンURLの永続キャッシュ（TokenIcon の onError で書き込む想定）
const BAD_ICON_URL_KEY = 'ramya_bad_icon_urls_v1';
const BAD_ICON_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14日

const JUPITER_TOKENS_V2_VERIFIED = 'https://api.jup.ag/tokens/v2/tag?query=verified';

export type TokenInfo = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  status?: 'verified' | 'unknown' | 'suspicious';
  tags?: string[];
};

type TokenListResult = { tokens: TokenInfo[]; source: string };
type CacheMeta = { cachedAt: number; count: number };

type BadIconMap = Record<string, { failedAt: number }>;

// ----------------------------
// utils
// ----------------------------
function normalizeLogoUri(uri: any): string {
  if (!uri) return '';
  let s = String(uri).trim();
  if (!s) return '';

  // ipfs:// -> https gateway
  if (s.startsWith('ipfs://')) {
    const cid = s.replace('ipfs://', '');
    s = `https://cloudflare-ipfs.com/ipfs/${cid}`;
  }

  // RN標準Imageが苦手な形式は落ちないように無効化
  const lower = s.toLowerCase();
  if (lower.endsWith('.svg')) return '';
  if (lower.startsWith('data:image/svg')) return '';

  return s;
}

function normalizeToken(raw: any): TokenInfo | null {
  const address = raw?.address ?? raw?.mint ?? raw?.id ?? null;
  if (!address || typeof address !== 'string') return null;

  const decimals =
    typeof raw?.decimals === 'number'
      ? raw.decimals
      : typeof raw?.decimals === 'string'
        ? Number(raw.decimals)
        : NaN;

  if (!Number.isFinite(decimals)) return null;

  const symbol = String(raw?.symbol ?? '').trim() || 'UNKNOWN';
  const name = String(raw?.name ?? '').trim() || symbol;

  const logoURI = normalizeLogoUri(
    raw?.logoURI ?? raw?.logoUri ?? raw?.logo_uri ?? raw?.icon ?? ''
  );

  return {
    address,
    symbol,
    name,
    decimals,
    logoURI,
    status: raw?.status === 'verified' ? 'verified' : 'unknown',
    tags: Array.isArray(raw?.tags) ? raw.tags : undefined,
  };
}

function dedupe(tokens: TokenInfo[]) {
  const seen = new Set<string>();
  const out: TokenInfo[] = [];
  for (const t of tokens) {
    if (!t.address || seen.has(t.address)) continue;
    seen.add(t.address);
    out.push(t);
  }
  return out;
}

// ----------------------------
// local list
// ----------------------------
function loadLocal(): TokenInfo[] {
  const listData: any = LOCAL_TOKEN_LIST;
  const arr = Array.isArray(listData) ? listData : (listData.tokens || []);
  const normalized = arr.map(normalizeToken).filter(Boolean) as TokenInfo[];

  // ★ ローカルは「あなたの公式」なので問答無用で verified
  return dedupe(
    normalized.map((t) => ({
      ...t,
      status: 'verified',
      logoURI: t.logoURI || '',
    }))
  );
}

function mergeLocalOverrides(jupiter: TokenInfo[], local: TokenInfo[]) {
  // jupiter -> local 上書き（ローカル最強）
  const map = new Map<string, TokenInfo>();
  jupiter.forEach((t) => map.set(t.address, { ...t, status: t.status ?? 'unknown' }));
  local.forEach((t) => map.set(t.address, t));
  return Array.from(map.values());
}

// ----------------------------
// bad icon url cache (persist)
// ----------------------------
async function loadBadIconMap(): Promise<BadIconMap> {
  try {
    const raw = await AsyncStorage.getItem(BAD_ICON_URL_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw) as BadIconMap;
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

async function saveBadIconMap(map: BadIconMap) {
  try {
    await AsyncStorage.setItem(BAD_ICON_URL_KEY, JSON.stringify(map));
  } catch {}
}

function isBadIconEntry(entry: { failedAt: number } | undefined) {
  if (!entry?.failedAt) return false;
  return Date.now() - entry.failedAt < BAD_ICON_TTL_MS;
}

async function isBadIconUrl(url: string): Promise<boolean> {
  if (!url) return false;
  const norm = normalizeLogoUri(url);
  if (!norm) return false;

  const map = await loadBadIconMap();
  const e = map[norm];
  return isBadIconEntry(e);
}

/**
 * ✅ TokenIcon の onError から呼ぶ用（URL単位でBAN）
 * - “404になったURL” を 14日間だけ除外対象にする
 */
export async function markBadIconUrl(url: string) {
  const norm = normalizeLogoUri(url);
  if (!norm) return;

  const map = await loadBadIconMap();
  map[norm] = { failedAt: Date.now() };
  await saveBadIconMap(map);
}

/**
 * 任意：デバッグ用
 */
export async function clearBadIconUrlCache() {
  try {
    await AsyncStorage.removeItem(BAD_ICON_URL_KEY);
  } catch {}
}

// ----------------------------
// filtering policy
// ----------------------------
async function applyIconFilters(tokens: TokenInfo[], requireLogo: boolean): Promise<TokenInfo[]> {
  // 1) 空logoを落とす（requireLogo=true のとき）
  let out = tokens;
  if (requireLogo) {
    out = out.filter((t) => !!normalizeLogoUri(t.logoURI));
  }

  // 2) 壊れURLを落とす（URLはあるけど 404 のやつ）
  //    ※ TokenIcon.onError で markBadIconUrl() してる前提
  const filtered: TokenInfo[] = [];
  for (const t of out) {
    const u = normalizeLogoUri(t.logoURI);
    if (!u) {
      // requireLogo=false のときだけ残す
      if (!requireLogo) filtered.push(t);
      continue;
    }
    const bad = await isBadIconUrl(u);
    if (!bad) filtered.push({ ...t, logoURI: u });
  }
  return filtered;
}

// ----------------------------
// public API
// ----------------------------

/**
 * ✅ 速い起動用
 * - キャッシュがあれば（TTL切れでも）一旦返す…はやく見せたい場合はここを緩める
 * - ただ今の挙動は「fresh cache のみ採用」なので、堅実なまま
 *
 * @param opts.requireLogo true にすると logoURI無し/壊れURL を除外
 */
export async function loadTokenListFast(
  opts: { requireLogo?: boolean } = {}
): Promise<TokenListResult> {
  const requireLogo = !!opts.requireLogo;

  try {
    const metaStr = await AsyncStorage.getItem(CACHE_META_KEY);
    if (!metaStr) {
      console.log('[TOKEN] fast: no meta -> local');
      const local = loadLocal();
      const filtered = await applyIconFilters(local, requireLogo);
      return { tokens: filtered, source: 'local' };
    }

    const meta = JSON.parse(metaStr) as CacheMeta;
    const cachedAt = meta?.cachedAt;

    if (!cachedAt) {
      console.log('[TOKEN] fast: meta has no cachedAt -> local', meta);
      const local = loadLocal();
      const filtered = await applyIconFilters(local, requireLogo);
      return { tokens: filtered, source: 'local' };
    }

    const age = Date.now() - cachedAt;
    if (age >= CACHE_TTL_MS) {
      console.log(`[TOKEN] fast: cache stale age=${age}ms -> local`);
      const local = loadLocal();
      const filtered = await applyIconFilters(local, requireLogo);
      return { tokens: filtered, source: 'local' };
    }

    const cachedStr = await AsyncStorage.getItem(CACHE_KEY);
    if (!cachedStr) {
      console.log('[TOKEN] fast: no cached data -> local');
      const local = loadLocal();
      const filtered = await applyIconFilters(local, requireLogo);
      return { tokens: filtered, source: 'local' };
    }

    const cached = JSON.parse(cachedStr) as TokenInfo[];
    if (!Array.isArray(cached) || cached.length === 0) {
      console.log('[TOKEN] fast: cached not array/empty -> local');
      const local = loadLocal();
      const filtered = await applyIconFilters(local, requireLogo);
      return { tokens: filtered, source: 'local' };
    }

    const local = loadLocal();
    const merged = mergeLocalOverrides(cached, local);
    const filtered = await applyIconFilters(merged, requireLogo);

    return { tokens: filtered, source: `cache(fresh)+local${requireLogo ? '+logoOnly' : ''}` };
  } catch (e) {
    console.log('[TOKEN] fast: exception -> local', e);
    const local = loadLocal();
    const filtered = await applyIconFilters(local, requireLogo);
    return { tokens: filtered, source: 'local' };
  }
}

/**
 * ✅ 裏で更新（成功したらキャッシュを書き換え）
 * - API Keyが無いなら何もしない
 *
 * @param opts.requireLogo true にすると logoURI無し/壊れURL を除外
 */
export async function refreshTokenListInBackground(
  opts: { requireLogo?: boolean } = {}
): Promise<TokenListResult | null> {
  const requireLogo = !!opts.requireLogo;

  if (!JUPITER_API_KEY) {
    console.log('[TOKEN] ℹ️ no JUPITER_API_KEY -> skip refresh');
    return null;
  }

  try {
    const res = await fetch(JUPITER_TOKENS_V2_VERIFIED, {
      headers: { Accept: 'application/json', 'x-api-key': JUPITER_API_KEY,'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.log(
        `[TOKEN] ❌ Jupiter token list failed: ${res.status} ${res.statusText} body=${body.slice(0, 200)}`
      );
      return null;
    }

    const json = await res.json().catch(() => null);
    if (!Array.isArray(json)) {
      console.log('[TOKEN] ❌ Jupiter token list: invalid shape (not array)');
      return null;
    }

    const normalized = dedupe(json.map(normalizeToken).filter(Boolean) as TokenInfo[]);
    if (normalized.length < 50) {
      console.log(`[TOKEN] ❌ Jupiter token list too small: ${normalized.length}`);
      return null;
    }

    // キャッシュ保存（※フィルタ前の生データを保存：方針変えても復元できる）
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(normalized));
    await AsyncStorage.setItem(
      CACHE_META_KEY,
      JSON.stringify({ cachedAt: Date.now(), count: normalized.length } satisfies CacheMeta)
    );

    const local = loadLocal();
    const merged = mergeLocalOverrides(normalized, local);

    const logoEmpty = normalized.filter((t) => !normalizeLogoUri(t.logoURI)).length;

    const filtered = await applyIconFilters(merged, requireLogo);

    console.log(
      `[TOKEN] ✅ cached Jupiter list: ${normalized.length} (logo empty: ${logoEmpty}), merged: ${merged.length}, final: ${filtered.length}${requireLogo ? ' (logoOnly)' : ''
      }`
    );

    return { tokens: filtered, source: `jupiter+cache+local${requireLogo ? '+logoOnly' : ''}` };
  } catch (e) {
    console.log('[TOKEN] ❌ refreshTokenListInBackground error', e);
    return null;
  }
}

/**
 * 任意：キャッシュを手動で消したい時用（デバッグ）
 */
export async function clearTokenListCache() {
  await Promise.all([
    AsyncStorage.removeItem(CACHE_KEY),
    AsyncStorage.removeItem(CACHE_META_KEY),
  ]);
}
