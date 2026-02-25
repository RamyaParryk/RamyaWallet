import { PublicKey } from '@solana/web3.js';
import { 
  JUPITER_API_KEY as JUP_ENV, 
  HELIUS_API_KEY as HELIUS_ENV,
  REFERRAL_ACCOUNT_PUBKEY,
  ADMOB_ANDROID_BANNER_ID as ADMOB_ANDROID_ENV,
} from '@env';

// API Keys
export const JUPITER_API_KEY = JUP_ENV || '';
export const HELIUS_API_KEY  = HELIUS_ENV || '';
export const MY_FEE_ACCOUNT = REFERRAL_ACCOUNT_PUBKEY || '';

// RPC
export const MAINNET_RPC_URL = HELIUS_API_KEY 
  ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : 'https://api.mainnet-beta.solana.com';

// ============================================
// Jupiter Config
// ============================================

export const JUPITER_BASE_PATH = 'https://quote-api.jup.ag/v6';

// ★ Plan A: Jupiter公式 (API)
export const JUPITER_TOKEN_LIST_API = 'https://tokens.jup.ag/tokens?tags=verified';
// ★ Plan B: 自分のバックアップ (Solflareは削除)
export const TOKEN_LIST_URL = 'https://raw.githubusercontent.com/RamyaParryk/RamyaWallet/refs/heads/main/token_list.json';
// 価格取得用
export const JUPITER_PRICE_API = 'https://api.jup.ag/price/v2'; 
export const COINGECKO_PRICE_API = 'https://api.coingecko.com/api/v3/simple/price?ids=solana,usd-coin,tether,jito-staked-sol,bonk,render-token,helium,drift-protocol,kamino&vs_currencies=usd';

export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const JITO_SOL_MINT = "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn";
export const SOL_MINT = "So11111111111111111111111111111111111111112";

export const MY_PLATFORM_FEE_BPS = 0; 
export const YOUTUBE_URL = "https://www.youtube.com/@ramyaparryk";
export const GITHUB_URL = "https://github.com/RamyaParryk/RamyaWallet";