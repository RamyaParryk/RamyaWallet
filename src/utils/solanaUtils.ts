import { Connection, PublicKey } from '@solana/web3.js';

// トランザクション履歴を取得する関数
export const fetchTransactionHistory = async (connection: Connection, address: string) => {
  try {
    const pubKey = new PublicKey(address);
    // 1. 最新の署名を10件取得
    const signatures = await connection.getSignaturesForAddress(pubKey, { limit: 10 });

    const history = await Promise.all(
      signatures.map(async (sig) => {
        // 2. 各署名の詳細を取得
        const tx = await connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });

        // 3. 日付を読みやすい形式に変換
        const date = sig.blockTime 
          ? new Date(sig.blockTime * 1000).toLocaleString() 
          : 'Unknown';

        return {
          signature: sig.signature,
          date,
          status: sig.confirmationStatus,
          error: !!sig.err,
          // 簡易的な判別（本来はもっと複雑ですが、まずはここから）
          memo: sig.memo || ""
        };
      })
    );
    return history;
  } catch (e) {
    console.error("History fetch failed:", e);
    return [];
  }
};

// アドレスを短縮表示する関数
export const shortenAddress = (addr: string) => {
  if (!addr) return '';
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
};