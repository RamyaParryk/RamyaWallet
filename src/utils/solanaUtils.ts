import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { SeedVault } from '@solana-mobile/seed-vault-lib';
import { Buffer } from 'buffer';
import nacl from 'tweetnacl';

export const fetchTransactionHistory = async (connection: Connection, address: string) => {
  try {
    const pubKey = new PublicKey(address);
    const signatures = await connection.getSignaturesForAddress(pubKey, { limit: 10 });
    const history = await Promise.all(
      signatures.map(async (sig) => {
        const tx = await connection.getParsedTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
        const date = sig.blockTime ? new Date(sig.blockTime * 1000).toLocaleString() : 'Unknown';
        return { signature: sig.signature, date, status: sig.confirmationStatus, error: !!sig.err, memo: sig.memo || "" };
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
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') });
  const balances: { [mint: string]: number } = {};
  tokenAccounts.value.forEach((account) => {
    const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
    if (amount > 0) balances[account.account.data.parsed.info.mint] = amount;
  });
  return balances;
};

export const shortenAddress = (addr: string) => {
  if (!addr) return '';
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
};

export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const secretKeyToString = (secretKey: Uint8Array) => {
  if (!secretKey) return "";
  return JSON.stringify(Array.from(secretKey));
};

export const parseSolanaError = (error: any, t: any) => {
  const msg = error?.message || String(error);
  let translated = t('err_unknown') || '不明なエラー';

  if (msg.includes("InsufficientFunds") || msg.includes("insufficient funds") || msg.includes("custom program error: 0x1\n") || msg.includes("custom program error: 0x1 ")) {
    translated = t('err_insufficient_funds') || '残高が不足しています';
  } else if (msg.includes("InvalidAccountData") || msg.includes("AccountNotFound")) {
    translated = t('err_invalid_account') || '無効なアカウントです';
  } else if (msg.includes("Slippage tolerance exceeded") || msg.includes("0x1771") || msg.includes("0x1788") || msg.includes("6024")) {
    translated = t('err_slippage') || 'スリッページエラー';
  } else if (msg.includes("timeout") || msg.includes("Transaction was not confirmed")) {
    translated = t('err_timeout') || 'タイムアウトしました';
  } else if (msg.includes("User rejected") || msg.includes("1007")) {
    translated = t('err_rejected') || 'リクエストが拒否されました';
  } else if (msg.includes("signature verification")) {
    translated = t('err_signature_mismatch') || '署名の検証に失敗しました';
  }

  return `${translated}\n\n[Raw Log]\n${msg}`;
};

// ========================================================
// 🌟 Seed Vault 署名ラッパー (真の完成版)
// ========================================================
export const signWithSeedVault = async (
  txBytes: Uint8Array,
  wallet: any
): Promise<Uint8Array> => {
  const SV: any = SeedVault;

  if (!wallet?.authToken || !wallet?.derivationPath) {
    throw new Error('Seed Vault authToken or derivationPath is missing');
  }

  const vTx = VersionedTransaction.deserialize(txBytes);
  const walletPubkey = new PublicKey(wallet.address);

  const signerIndex = vTx.message.staticAccountKeys.findIndex((k) =>
    k.equals(walletPubkey)
  );

  if (signerIndex < 0) {
    throw new Error(`Seed Vault signer not found in transaction. wallet=${wallet.address}`);
  }

  // 🌟 あなたが暴き出した真実：txBytesではなくmessageBytesを渡す！
  const messageBytes = vTx.message.serialize();
  const base64Message = Buffer.from(messageBytes).toString('base64');
  
  const requestPayload = {
    payload: base64Message, 
    requestedSignatures: [wallet.derivationPath],
  };

  const payloads = await SV.signTransactions(wallet.authToken.toString(), [requestPayload]);

  if (!payloads || payloads.length === 0) {
    throw new Error('Seed Vault returned an empty payload.');
  }

  const p = payloads[0];
  let sigBytes: Uint8Array | null = null;

  if (typeof p === 'string') {
    sigBytes = new Uint8Array(Buffer.from(p, 'base64'));
  } else if (p && typeof p === 'object') {
    if (Array.isArray(p.signatures) && p.signatures.length > 0) {
      sigBytes = new Uint8Array(Buffer.from(p.signatures[0], 'base64'));
    } else if (typeof p.signature === 'string') {
      sigBytes = new Uint8Array(Buffer.from(p.signature, 'base64'));
    } else if (typeof p.payload === 'string') {
      sigBytes = new Uint8Array(Buffer.from(p.payload, 'base64'));
    } else if (typeof p.signedPayload === 'string') {
      sigBytes = new Uint8Array(Buffer.from(p.signedPayload, 'base64'));
    } else if (p.buffer) {
      sigBytes = new Uint8Array(p.buffer);
    }
  }

  if (!sigBytes || sigBytes.length !== 64) {
    throw new Error(`Seed Vault did not return a valid 64-byte signature.`);
  }
  // 🌟 最強のローカル検証
  const ok = nacl.sign.detached.verify(
    messageBytes,
    sigBytes,
    walletPubkey.toBytes()
  );
  if (!ok) {
    throw new Error(`鍵の不一致エラー\nアプリのアドレス: ${shortenAddress(wallet.address)}\nSeed Vaultのパス: ${wallet.derivationPath}\n\n※アプリのウォレット設定から一度削除し、再度インポート（連携）し直してください。`);
  }
  vTx.signatures[signerIndex] = sigBytes;
  return vTx.serialize();
};
export const signMessageWithSeedVault = async (msgBytes: Uint8Array, wallet: any): Promise<Uint8Array> => {
  const SV: any = SeedVault;
  if (!wallet?.authToken || !wallet?.derivationPath) {
    throw new Error('Seed Vault authToken or derivationPath is missing');
  }

  const base64Msg = Buffer.from(msgBytes).toString('base64'); 
  const payloads = await SV.signMessages(wallet.authToken.toString(), [{ 
    payload: base64Msg, 
    requestedSignatures: [wallet.derivationPath] 
  }]);

  if (!payloads || payloads.length === 0) throw new Error("Seed Vault returned an empty payload.");
  
  const p = payloads[0];
  if (p && typeof p === 'object' && Array.isArray(p.signatures) && p.signatures.length > 0) return new Uint8Array(Buffer.from(p.signatures[0], 'base64'));
  if (typeof p === 'string') return new Uint8Array(Buffer.from(p, 'base64'));
  if (p?.signature) return new Uint8Array(Buffer.from(p.signature, 'base64'));
  return new Uint8Array(p);
};