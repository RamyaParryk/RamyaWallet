// Seed Vault Lib (Native Module) の型定義
declare module '@solana-mobile/seed-vault-lib' {
  export const SeedVault: {
    // シミュレーター許可フラグ(allowSimulated)を受け取るメソッドなど
    isSeedVaultAvailable(allowSimulated?: boolean): Promise<boolean>;
    authorizeNewSeed(): Promise<any>;
    getAuthorizedSeeds(): Promise<any[]>;
    signMessages(authToken: any, paths: any[], messages: any[]): Promise<any[]>;
    signTransactions(authToken: any, paths: any[], transactions: any[]): Promise<any[]>;
    [key: string]: any; 
  };
}

// 環境変数
declare module '@env' {
  export const JUPITER_BASE_PATH: string;
  export const MY_FEE_ACCOUNT: string;
  export const MY_PLATFORM_FEE_BPS: string;
}

// 画像ファイル
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';