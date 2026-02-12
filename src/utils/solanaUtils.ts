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
          // 簡易的な判別
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

export const fetchTokenBalances = async (connection: Connection, walletAddress: string) => {
  const pubkey = new PublicKey(walletAddress);
  
  // 所有しているすべてのトークンアカウントを取得
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
    programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  });

  // 使いやすいように { mint: amount } の形式に変換
  const balances: { [mint: string]: number } = {};
  
  tokenAccounts.value.forEach((account) => {
    const parsedInfo = account.account.data.parsed.info;
    const mint = parsedInfo.mint;
    const amount = parsedInfo.tokenAmount.uiAmount;
    
    if (amount > 0) {
      balances[mint] = amount;
    }
  });

  return balances;
};

// アドレスを短縮表示する関数
export const shortenAddress = (addr: string) => {
  if (!addr) return '';
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
};

// 指定ミリ秒待機する関数
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 秘密鍵を文字列化する関数
export const secretKeyToString = (secretKey: Uint8Array) => {
  if (!secretKey) return "";
  return JSON.stringify(Array.from(secretKey));
};

/**
 * SolanaやJupiterのエラーを表示
 */
export const parseSolanaError = (error: any, t: any) => {
  const msg = error?.message || String(error);

  if (msg.includes("InsufficientFunds") || msg.includes("0x1") || msg.includes("insufficient funds")) {
    return t('err_insufficient_funds');
  }
  if (msg.includes("InvalidAccountData") || msg.includes("AccountNotFound")) {
    return t('err_invalid_account');
  }
  if (msg.includes("Slippage tolerance exceeded") || msg.includes("0x1771")) {
    return t('err_slippage');
  }
  if (msg.includes("timeout") || msg.includes("Transaction was not confirmed")) {
    return t('err_timeout');
  }
  if (msg.includes("User rejected")) {
    return t('err_rejected');
  }

  return t('err_unknown');
};