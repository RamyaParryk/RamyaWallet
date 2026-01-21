import { PublicKey } from '@solana/web3.js';
import { JUPITER_API_KEY as ENV_KEY } from '@env';

// ============================================
// Jupiter API Config (API Key Enabled)
// ============================================

// ★重要: あなたのAPIキー
export const JUPITER_API_KEY = ENV_KEY || '';

// APIキーを使うためのベースURL
const JUPITER_BASE_URL = 'https://api.jup.ag';

// エンドポイント設定 (API Key対応版)
export const JUPITER_QUOTE_API = `${JUPITER_BASE_URL}/swap/v6/quote`;
export const JUPITER_SWAP_API  = `${JUPITER_BASE_URL}/swap/v6/swap`;
export const JUPITER_PRICE_API = `${JUPITER_BASE_URL}/price/v2`; // V2が推奨です

// トークンリスト
// アプリのクラッシュを防ぐため、"all" ではなく "strict" を使用し、
// 通信ブロック回避のため GitHub の Raw データを使用します。
export const JUPITER_TOKEN_LIST_API = 'https://raw.githubusercontent.com/jup-ag/token-list/main/strict.json';


// ============================================
// Token Mints & Program IDs
// ============================================
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const JITO_SOL_MINT = "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn";
export const SOL_MINT = "So11111111111111111111111111111111111111112";

// ============================================
// Fee Config
// ============================================
export const MY_PLATFORM_FEE_BPS = 40; 
export const MY_FEE_ACCOUNT = "EAW4J7YxLn7yc2QbpNgSzovukKViQowg38nJmQ76RmHj";

// ============================================
// Social URLs
// ============================================
export const YOUTUBE_URL = "https://www.youtube.com/@ramyaparryk";
export const GITHUB_URL = "https://github.com/RamyaParryk/RamyaWallet";