import { PublicKey } from '@solana/web3.js';
import { JUPITER_API_KEY as ENV_KEY } from '@env';

// ============================================
// Jupiter API Config
// ============================================
export const JUPITER_API_KEY = ENV_KEY || '';

// ベースURL（公式）
export const JUPITER_BASE_URL = 'https://api.jup.ag';

// エンドポイント
export const JUPITER_QUOTE_API = `${JUPITER_BASE_URL}/swap/v1/quote`;
export const JUPITER_SWAP_API  = `${JUPITER_BASE_URL}/swap/v1/swap`;
export const JUPITER_PRICE_API = `${JUPITER_BASE_URL}/price/v2`; 
export const COINGECKO_PRICE_API = 'https://api.coingecko.com/api/v3/simple/price';

// トークンリスト
export const JUPITER_TOKEN_LIST_API = 'https://tokens.jup.ag/tokens?tags=verified';

// ============================================
// Token Mints & Program IDs (変更なし)
// ============================================
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const JITO_SOL_MINT = "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn";
export const SOL_MINT = "So11111111111111111111111111111111111111112";

// ============================================
// Fee & Social (変更なし)
// ============================================
export const MY_PLATFORM_FEE_BPS = 40; 
export const MY_FEE_ACCOUNT = "EAW4J7YxLn7yc2QbpNgSzovukKViQowg38nJmQ76RmHj";
export const YOUTUBE_URL = "https://www.youtube.com/@ramyaparryk";
export const GITHUB_URL = "https://github.com/RamyaParryk/RamyaWallet";