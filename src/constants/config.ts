import { PublicKey } from '@solana/web3.js';
import { 
  JUPITER_API_KEY as JUP_ENV, 
  HELIUS_API_KEY as HELIUS_ENV,
  REFERRAL_ACCOUNT_PUBKEY,
  ADMOB_ANDROID_BANNER_ID as ADMOB_ANDROID_ENV,
  COIN_GENKO_API_KEY as ENV_CG_KEY,
  MORALIS_API_KEY as MORALIS_ENV,
  ZERION_API_KEY as ZERION_ENV,
} from '@env';

export const JUPITER_API_KEY = JUP_ENV || '';
export const HELIUS_API_KEY  = HELIUS_ENV || '';
export const MY_FEE_ACCOUNT = REFERRAL_ACCOUNT_PUBKEY || '';
export const COIN_GENKO_API_KEY = ENV_CG_KEY || '';
export const MORALIS_API_KEY = MORALIS_ENV || '';
export const ZERION_API_KEY = ZERION_ENV || '';

export const MAINNET_RPC_URL = HELIUS_API_KEY 
  ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : 'https://api.mainnet-beta.solana.com';

// --- Mints ---
export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const JITO_SOL_MINT = "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn";
export const MSOL_MINT = "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So";
export const BSOL_MINT = "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1";

export const SKR_MINT = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";

export const JUPITER_BASE_PATH = 'https://api.jup.ag/swap/v1';
export const JUPITER_PRICE_API = 'https://api.jup.ag/price/v2';
export const JUPITER_TOKEN_LIST_API = 'https://tokens.jup.ag/tokens?tags=verified';
export const TOKEN_LIST_URL = 'https://raw.githubusercontent.com/RamyaParryk/RamyaWallet/refs/heads/main/token_list.json';

export const COINGECKO_PRICE_API = 'https://api.coingecko.com/api/v3/simple/price?ids=solana,usd-coin,tether,jito-staked-sol,bonk,render-token,helium,drift-protocol,kamino&vs_currencies=usd';

// apy を fallbackApy に変更
export const SUPPORTED_LSTS = [
  { mint: JITO_SOL_MINT, fallbackSymbol: 'JitoSOL', fallbackApy: '6.2%' },
  { mint: MSOL_MINT, fallbackSymbol: 'mSOL', fallbackApy: '5.95%' },
  { mint: BSOL_MINT, fallbackSymbol: 'bSOL', fallbackApy: '6.01%' }
];

export const LST_APY_APIS = {
  SANCTUM: 'https://extra-api.sanctum.so/v1/apy/latest', // 🌟 メイン（これ1つで全部取れる）
  JITO: 'https://api.jito.network/api/v1/apys', // 予備（弾かれやすい）
  MARINADE: 'https://api.marinade.finance/msol/apy/30d', // 予備（生テキスト）
  SOLBLAZE: 'https://stake.solblaze.org/api/v1/apy', // 🌟 予備（検証済みの通るURL！）
};

export const YOUTUBE_URL = "https://www.youtube.com/@ramyaparryk";
export const GITHUB_URL = "https://ramyaparryk.github.io/RamyaWallet/";

export const MY_PLATFORM_FEE_BPS = 0;
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const JITO_STAKE_PROGRAM_ID = new PublicKey('Stake11111111111111111111111111111111111111');