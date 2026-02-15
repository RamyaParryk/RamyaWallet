import AsyncStorage from '@react-native-async-storage/async-storage';

const FAIL_CACHE_KEY = 'ramya_icon_fail_cache_v1';

// 「失敗URL」はしばらく除外したい（長めでOK）
const FAIL_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14日

type FailMap = Record<string, number>; // url -> failedAt(ms)

// メモリキャッシュ（高速）
const memFail = new Map<string, number>();

let hydrated = false;

async function hydrateOnce() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(FAIL_CACHE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as FailMap;
    const now = Date.now();
    for (const [url, ts] of Object.entries(obj)) {
      if (typeof ts === 'number' && now - ts < FAIL_TTL_MS) memFail.set(url, ts);
    }
  } catch {}
}

async function persist() {
  try {
    const now = Date.now();
    const obj: FailMap = {};
    for (const [url, ts] of memFail.entries()) {
      if (now - ts < FAIL_TTL_MS) obj[url] = ts;
    }
    await AsyncStorage.setItem(FAIL_CACHE_KEY, JSON.stringify(obj));
  } catch {}
}

export async function initIconFailCache() {
  await hydrateOnce();
}

export function isIconUrlFailed(url: string): boolean {
  const ts = memFail.get(url);
  if (!ts) return false;
  return Date.now() - ts < FAIL_TTL_MS;
}

export async function markIconUrlFailed(url: string) {
  if (!url) return;
  await hydrateOnce();
  memFail.set(url, Date.now());
  // 逐次保存でもOK。重いなら debounce でもいい
  await persist();
}
