// src/utils/tokenMetadata.ts
import { MAINNET_RPC_URL } from '../constants/config';

/**
 * Helius DAS API を使ってトークンの詳細を取得する
 * これにより、外部リストが死んでいても名前と画像が表示されます
 */
export async function fetchOnChainMetadata(mint: string) {
  try {
    const response = await fetch(MAINNET_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-metadata',
        method: 'getAsset', // Helius独自の強力なメソッド
        params: { id: mint },
      }),
    });

    const { result } = await response.json();
    if (!result) return null;

    return {
      name: result.content?.metadata?.name || 'Unknown Token',
      symbol: result.content?.metadata?.symbol || '???',
      logoURI: result.content?.links?.image || '',
    };
  } catch (e) {
    console.error(`[METADATA] Helius fetch failed for ${mint}`, e);
    return null;
  }
}