import { Connection, PublicKey } from '@solana/web3.js';

export const SKR_STAKING_PROGRAM_ID = new PublicKey(
  'SKRskrmtL83pcL4YqLWt6iPefDqwXQWHSw9S9vz94BZ'
);

const GLOBAL_STAKING_CONFIG = new PublicKey('4HQy82s9CHTv1GsYKnANHMiHfhcqesYkK6sB3RDSYyqw');
const USER_STAKE_SHARES_OFFSET = 105; // 🎯 完全特定したShareの固定位置

export async function fetchStakedSkrAmount(
  connection: Connection,
  walletAddress: string
): Promise<number> {
  try {
    const accounts = await connection.getProgramAccounts(SKR_STAKING_PROGRAM_ID, {
      filters: [
        { dataSize: 169 },
        {
          memcmp: {
            offset: 41,
            bytes: walletAddress,
          },
        },
      ],
    });

    if (accounts.length === 0) return 0;

    // 1. 最新の「Share Price（交換レート）」を取得
    let sharePriceRatio = 1.061840322; // フォールバック値（API失敗時などの安全用）
    try {
      const configAcc = await connection.getAccountInfo(GLOBAL_STAKING_CONFIG);
      if (configAcc) {
         const configData = configAcc.data;
         // ※レートのオフセットが特定できれば、ここも固定化するとより安全
         for (let i = 8; i < configData.length - 8; i++) {
            const val = Number(configData.readBigUInt64LE(i));
            if (val > 1_000_000_000 && val < 1_500_000_000) {
               sharePriceRatio = val / 1_000_000_000;
               break;
            }
         }
      }
    } catch (e) {
      console.log("[SKR STAKE] レート取得エラー、フォールバック値を使用します", e);
    }

    let totalShares = 0;

    // 2. 特定したオフセットから直接Shareを読み取る
    for (const acc of accounts) {
      const data = acc.account.data;
      const rawShares = data.readBigUInt64LE(USER_STAKE_SHARES_OFFSET);
      const shares = Number(rawShares) / 1_000_000;
      totalShares += shares;
    }

    // 3. 最終的なSKR残高を計算
    const finalSKR = totalShares * sharePriceRatio;
    
    // 念のためログは残しておく
    console.log(`[SKR STAKE] ✅ 本番処理完了:`);
    console.log(`- 合計Shares: ${totalShares}`);
    console.log(`- 適用レート: x${sharePriceRatio}`);
    console.log(`- SKR残高: ${finalSKR} SKR`);

    return finalSKR > 0 ? finalSKR : 0;

  } catch (e) {
    console.error('[SKR STAKE] 取得エラー:', e);
    return 0;
  }
}