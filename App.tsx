// ==========================================
// Ramya Wallet - Main Application Entry Point
// ==========================================

// ▼▼▼ Polyfill (Solana/暗号化機能のために必須) ▼▼▼
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;
// ▲▲▲ Polyfill End ▲▲▲

import React, { useState, useEffect, useCallback, useMemo } from 'react'; 
import { 
  SafeAreaView, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  TextInput, 
  ActivityIndicator, 
  StatusBar, 
  Alert, 
  Switch, 
  Linking,
  BackHandler, 
  KeyboardAvoidingView, 
  Platform, 
  Image, 
  FlatList, 
  Share,
  Modal,
  Dimensions
} from 'react-native';
import { 
  Wallet, 
  Send, 
  ArrowDownLeft, 
  Settings, 
  Copy, 
  RefreshCw, 
  LogOut, 
  ShieldCheck, 
  Zap, 
  ArrowDown, 
  X, 
  Search, 
  ChevronDown, 
  CreditCard, 
  History, 
  ChevronRight, 
  Check, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  ChevronLeft, 
  Server, 
  Lock, 
  ArrowLeft, 
  Download, 
  Users, 
  Plus, 
  Trash2, 
  TrendingUp, 
  CircleHelp, 
  Info, 
  Youtube, 
  Smartphone, 
  Share2,
  Percent,
  Globe,
  Shield,
  Github
} from 'lucide-react-native';

// Solana & Crypto Libraries
import { 
  Keypair, 
  Connection, 
  clusterApiUrl, 
  VersionedTransaction, 
  LAMPORTS_PER_SOL, 
  PublicKey, 
  SystemProgram, 
  Transaction 
} from '@solana/web3.js';
import 'text-encoding-polyfill';

// シードフレーズ生成用
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39';
import { derivePath } from 'ed25519-hd-key';

// データ保存用ライブラリ
import AsyncStorage from '@react-native-async-storage/async-storage';

// 生体認証ライブラリ
import ReactNativeBiometrics from 'react-native-biometrics';

// クリップボードライブラリ
import Clipboard from '@react-native-clipboard/clipboard';

// セキュアな領域へ保存
import EncryptedStorage from 'react-native-encrypted-storage';

// 翻訳ファイル
import { TRANSLATIONS, useTranslation } from './src/constants/translations';

// Styleseet
import { styles } from './src/styles/globalStyles';

// Screen
import { HistoryScreen } from './src/screens/HistoryScreen';

// Screen
import { SettingsScreen } from './src/screens/SettingsScreen';

// ==========================================
// 定数・設定 (Configuration)
// ==========================================

const JUPITER_TOKEN_LIST_API = 'https://token.jup.ag/strict'; 
const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6/quote';
const JUPITER_SWAP_API = 'https://quote-api.jup.ag/v6/swap';
const JUPITER_PRICE_API = 'https://api.jup.ag/price/v2';

const STORAGE_KEY = 'my_solana_wallet_settings_v1'; // 設定用
const STORAGE_KEY_CONTACTS = 'my_solana_contacts_v1'; 
const STORAGE_KEY_LANG = 'my_solana_language_v1'; 
const SECURE_WALLET_KEY = 'secure_wallet_data_v1';  // ★追加: 秘密鍵用

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const JITO_SOL_MINT = "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn";
const SOL_MINT = "So11111111111111111111111111111111111111112";

const MY_PLATFORM_FEE_BPS = 40; 
const MY_FEE_ACCOUNT = "EAW4J7YxLn7yc2QbpNgSzovukKViQowg38nJmQ76RmHj";
const YOUTUBE_URL = "https://www.youtube.com/@ramyaparryk";
const GITHUB_URL = "https://github.com/RamyaParryk/RamyaWallet";

const rnBiometrics = new ReactNativeBiometrics();


// ==========================================
// ユーティリティ関数 (Utils)
// ==========================================

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const shortenAddress = (addr: string) => {
  if (!addr) return '';
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
};

const secretKeyToString = (secretKey: Uint8Array) => {
  if (!secretKey) return "";
  return JSON.stringify(Array.from(secretKey));
};

// 型定義
interface Asset {
  mint: string;
  symbol: string;
  name: string;
  amount: number;
  decimals: number;
  price: number; 
  value: number; 
  logoURI: string;
}

// デフォルトトークンリスト（API取得失敗時のフォールバック）
const DEFAULT_TOKENS = [
  { 
    symbol: 'SOL', 
    name: 'Solana', 
    address: 'So11111111111111111111111111111111111111112', 
    decimals: 9, 
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png' 
  },
  { 
    symbol: 'USDC', 
    name: 'USD Coin', 
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 
    decimals: 6, 
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png' 
  },
  { 
    symbol: 'BONK', 
    name: 'Bonk', 
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', 
    decimals: 5, 
    logoURI: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I' 
  },
];

// ==========================================
// 共通UIコンポーネント
// ==========================================

const HeaderRow = ({ title, onBack, rightIcon }: any) => (
  <View style={styles.headerRow}>
    {onBack && (
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <ChevronLeft size={24} color="#fff" />
        <Text style={styles.backButtonText}> </Text> 
      </TouchableOpacity>
    )}
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={{width: 60, alignItems:'flex-end'}}>{rightIcon}</View>
  </View>
);

const NavButton = ({ icon: Icon, label, active, onPress }: any) => (
  <TouchableOpacity onPress={onPress} style={styles.navBtn}>
    <Icon size={24} color={active ? '#a855f7' : '#666'} />
    <Text style={[styles.navText, active && {color:'#a855f7'}]}>{label}</Text>
  </TouchableOpacity>
);

const ActionButton = ({icon: Icon, label, onPress, color = '#1a1a1a'}: any) => (
  <TouchableOpacity onPress={onPress} style={{alignItems:'center', gap:5}}>
    <View style={[styles.actionCircle, {backgroundColor: color}]}><Icon size={24} color="#fff"/></View>
    <Text style={styles.label}>{label}</Text>
  </TouchableOpacity>
);

const AssetItem = ({symbol, name, amount, price, logoURI}: any) => (
  <View style={styles.assetRow}>
    <View style={{flexDirection:'row', alignItems:'center', gap:12}}>
       {logoURI ? (
         <Image source={{uri: logoURI}} style={{width:40, height:40, borderRadius:20}} />
       ) : (
         <View style={[styles.coinIcon, {backgroundColor: '#333'}]}><Text style={{fontWeight:'bold', color:'white'}}>{symbol[0]}</Text></View>
       )}
       <View><Text style={styles.assetSym}>{symbol}</Text><Text style={styles.assetAmt}>{amount.toLocaleString()} {symbol}</Text></View>
    </View>
    <View style={{alignItems:'flex-end'}}>
      <Text style={styles.assetVal}>${(amount * price).toLocaleString(undefined, {maximumFractionDigits:2})}</Text>
      <Text style={{color:'#666', fontSize:14}}>@ ${price.toLocaleString()}</Text>
    </View>
  </View>
);

const TokenSelectBtn = ({token, onPress, label}: any) => (
  <TouchableOpacity style={styles.tokenBtn} onPress={onPress}>
     <Text style={styles.tokenBtnText}>{token?.symbol || label}</Text>
     <ChevronDown size={14} color="#aaa"/>
  </TouchableOpacity>
);

const SettingItem = ({ icon: Icon, title, desc, onPress, color="#222" }: any) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
       <View style={[styles.settingIcon, {backgroundColor: color}]}><Icon size={20} color={color === '#222' ? '#fff' : '#ef4444'}/></View>
       <View style={{flex:1}}>
         <Text style={[styles.settingText, color !== '#222' && {color:'#ef4444'}]}>{title}</Text>
         {desc && <Text style={styles.descTextSmall}>{desc}</Text>}
       </View>
       {color === '#222' && <ChevronRight size={20} color="#444" />}
    </TouchableOpacity>
);

// ==========================================
// メインコンポーネント (App)
// ==========================================

export default function App() {
  // --- Global State ---
  const [currentScreen, setCurrentScreen] = useState('splash'); 
  const [activeTab, setActiveTab] = useState('home');
  const [wallet, setWallet] = useState<any>(null); 
  
  // Assets & Balances
  const [assets, setAssets] = useState<Asset[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [balances, setBalances] = useState({ SOL: 0, USDC: 0, BONK: 0 }); // 互換性のため維持

  // Settings
  const [network, setNetwork] = useState<'mainnet-beta' | 'devnet'>('mainnet-beta');
  const [rpcEndpoint, setRpcEndpoint] = useState('Public'); 
  const [connection, setConnection] = useState<Connection | null>(null);
  
  // Security
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [pin, setPin] = useState<string | null>(null); 
  const [pendingBioEnable, setPendingBioEnable] = useState(false);
  
  // Data & Contacts
  const [contacts, setContacts] = useState<any[]>([]); 
  const [tokenMap, setTokenMap] = useState<Map<string, any>>(new Map());
  const [tokenList, setTokenList] = useState<any[]>(DEFAULT_TOKENS); 
  const [notification, setNotification] = useState<string | null>(null);

  // ★言語設定
  const [lang, setLang] = useState('ja');
  const t = useTranslation(lang);

  // 通知表示関数
  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // 戻るボタンのハードウェア制御
  useEffect(() => {
    const backAction = () => {
      const subScreens = [
        'settings_security', 'settings_network', 'settings_help', 'settings_about', 'settings_lang', 'pin_setup', 'import', 'address_book', 'stake',
        'receive', 'send'
      ];
      
      if (currentScreen.startsWith('settings_') || subScreens.includes(currentScreen)) {
        // インポート画面から戻る場合はウェルカムへ
        if (currentScreen === 'import') {
          setCurrentScreen('welcome');
        } else {
          // それ以外はメイン画面へ戻る
          setCurrentScreen('main'); 
        }
        return true; 
      }
      // メインやウェルカム画面ではデフォルト動作（アプリ終了など）
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentScreen]);

  // アプリ起動時のデータ読み込み (セキュリティ修正版)
  useEffect(() => {
    const loadWallet = async () => {
      await wait(2000); // スプラッシュ表示時間
      try {
        // 設定と連絡先の読み込み (AsyncStorage)
        const settingsJson = await AsyncStorage.getItem(STORAGE_KEY);
        const contactsValue = await AsyncStorage.getItem(STORAGE_KEY_CONTACTS);
        const langValue = await AsyncStorage.getItem(STORAGE_KEY_LANG);

        if (contactsValue) setContacts(JSON.parse(contactsValue));
        if (langValue) setLang(langValue);

        // ★秘密鍵の読み込み (EncryptedStorage)
        const secureJson = await EncryptedStorage.getItem(SECURE_WALLET_KEY);

        if (secureJson) {
          // ウォレットデータがある場合
          const storedWallet = JSON.parse(secureJson);
          
          // 秘密鍵の復元 (JSON配列 -> Uint8Array)
          const restoredWallet = {
            ...storedWallet,
            secretKey: new Uint8Array(Object.values(storedWallet.secretKey))
          };
          setWallet(restoredWallet);

          // 設定の復元
          if (settingsJson) {
            const settings = JSON.parse(settingsJson);
            setPin(settings.pin);
            setBiometricsEnabled(settings.biometricsEnabled);
            setNetwork(settings.network || 'mainnet-beta');
            
            // PINがあればロック画面へ
            if (settings.pin) {
              setCurrentScreen('unlock');
            } else {
              setCurrentScreen('main');
            }
          } else {
            // ウォレットはあるが設定がない場合
            setCurrentScreen('main');
          }
        } else {
          // ウォレットがない場合 -> ウェルカム画面へ
          setCurrentScreen('welcome');
        }
      } catch(e) {
        console.log("Load error:", e);
        setCurrentScreen('welcome');
      }
    };
    loadWallet();
  }, []);

  // ウォレットデータの保存 (セキュリティ修正版)
  const saveWalletData = async (newWallet: any, newPin: any, bio: boolean, net: string) => {
    try {
      // 1. 機密情報（ウォレット本体）はEncryptedStorageへ
      if (newWallet) {
        await EncryptedStorage.setItem(
          SECURE_WALLET_KEY,
          JSON.stringify(newWallet)
        );
      }

      // 2. 公開設定（PIN、生体認証設定、ネットワーク）はAsyncStorageへ
      // ※ここに秘密鍵を含めないように注意
      const settingsToSave = {
        pin: newPin,
        biometricsEnabled: bio,
        network: net
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
      
    } catch (e) {
      console.log("Save error:", e);
    }
  };

  // アドレス帳の保存
  const saveContacts = async (newContacts: any[]) => {
    setContacts(newContacts);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(newContacts));
    } catch (e) { console.log("Contact save error", e); }
  };

  // 言語設定の保存
  const changeLanguage = async (newLang: string) => {
    setLang(newLang);
    try { await AsyncStorage.setItem(STORAGE_KEY_LANG, newLang); } catch (e) {}
    setCurrentScreen('main'); // 設定画面から戻る
  };

  // ログアウト処理
  const handleLogout = async () => {
    Alert.alert(
      t('logout_confirm_title'), 
      t('logout_confirm_desc'),
      [
        { text: t('cancel'), style: "cancel" },
        { 
          text: t('delete'), 
          style: "destructive",
          onPress: async () => {
            try {
              // ★両方のストレージをクリア
              await EncryptedStorage.removeItem(SECURE_WALLET_KEY);
              await AsyncStorage.removeItem(STORAGE_KEY);
              await AsyncStorage.removeItem(STORAGE_KEY_CONTACTS); 
              
              setWallet(null);
              setPin(null);
              setBiometricsEnabled(false);
              setContacts([]);
              setAssets([]); 
              setCurrentScreen('welcome');
            } catch(e) { console.log(e); }
          }
        }
      ]
    );
  };

  // トークンリストの取得 (Jupiter API)
  const fetchTokens = useCallback(async () => {
      try {
        const res = await fetch(JUPITER_TOKEN_LIST_API);
        if (!res.ok) { throw new Error(`HTTP status ${res.status}`); }
        const data = await res.json();
        if(Array.isArray(data)) {
          setTokenList(data);
          // マップ化して検索を高速化
          const map = new Map();
          data.forEach(t => map.set(t.address, t));
          setTokenMap(map);
          console.log(`Fetched ${data.length} tokens.`);
        }
      } catch (e: any) {
        console.log("Token list fetch failed (dev environment?)");
      }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // 資産・残高の更新ロジック
  const refreshAssets = useCallback(async () => {
    if (!wallet || !connection) return;
    
    try {
      const pubKey = new PublicKey(wallet.address);
      const tempAssets: Asset[] = [];
      const mintsToFetchPrice: string[] = [];

      // 1. SOL残高
      const solBalance = await connection.getBalance(pubKey);
      if (solBalance > 0 || true) { 
        const solMint = SOL_MINT;
        tempAssets.push({
          mint: solMint,
          symbol: "SOL",
          name: "Solana",
          amount: solBalance / LAMPORTS_PER_SOL,
          decimals: 9,
          price: 0,
          value: 0,
          logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
        });
        mintsToFetchPrice.push(SOL_MINT);
      }

      // 2. SPLトークン (USDC, BONKなど)
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
        programId: TOKEN_PROGRAM_ID
      });

      tokenAccounts.value.forEach((accountInfo: any) => {
        const info = accountInfo.account.data.parsed.info;
        const mint = info.mint;
        const amount = info.tokenAmount.uiAmount;

        if (amount > 0) {
          const tokenMeta = tokenMap.get(mint);
          tempAssets.push({
            mint: mint,
            symbol: tokenMeta?.symbol || "UNKNOWN",
            name: tokenMeta?.name || shortenAddress(mint),
            amount: amount,
            decimals: info.tokenAmount.decimals,
            price: 0,
            value: 0,
            logoURI: tokenMeta?.logoURI || ""
          });
          mintsToFetchPrice.push(mint);
        }
      });

      // 3. 価格取得 (Jupiter Price API)
      if (mintsToFetchPrice.length > 0 && network === 'mainnet-beta') {
        try {
          const ids = mintsToFetchPrice.slice(0, 30).join(','); // 一度に取れる数に制限があるため簡易的に30件
          const priceRes = await fetch(`${JUPITER_PRICE_API}?ids=${ids}`);
          const priceData = await priceRes.json();
          
          if (priceData.data) {
            let total = 0;
            tempAssets.forEach(asset => {
              const priceInfo = priceData.data[asset.mint];
              if (priceInfo) {
                asset.price = parseFloat(priceInfo.price);
                asset.value = asset.amount * asset.price;
                total += asset.value;
              }
            });
            setTotalValue(total);
          }
        } catch (e) {
          console.log("Price fetch failed", e);
        }
      }

      // 価値順にソート
      tempAssets.sort((a, b) => b.value - a.value);
      setAssets(tempAssets);
      
      // 旧balancesステートとの互換性維持
      const sol = tempAssets.find(a => a.symbol === 'SOL')?.amount || 0;
      setBalances({ SOL: sol, USDC: 0, BONK: 0 }); // 他はassetsで管理

    } catch (e) {
      console.log("Asset refresh failed", e);
    }
  }, [wallet, connection, network, tokenMap]);

  // 接続の確立
  useEffect(() => {
    const conn = new Connection(clusterApiUrl(network), 'confirmed');
    setConnection(conn);
  }, [network]);

  // 接続時・ウォレットロード時に資産更新
  useEffect(() => {
    if (wallet && connection) {
      refreshAssets();
      // ★修正: 多言語対応の通知
      showNotification((network === 'devnet' ? "Devnet " : "Mainnet ") + t('connected'));
    }
  }, [connection, wallet]);

  // PIN設定完了時のハンドラ
  const handlePinSet = (newPin: string) => {
    setPin(newPin);
    saveWalletData(wallet, newPin, biometricsEnabled, network);
    showNotification(t('pin_setup'));
    
    // 生体認証ONの予約があればここで有効化
    if (pendingBioEnable) {
      setBiometricsEnabled(true);
      setPendingBioEnable(false);
      saveWalletData(wallet, newPin, true, network);
      showNotification(t('biometrics') + " ON");
    }
    setCurrentScreen('settings_security');
  };

  // ★修正: 成功可否を返すように変更し、PINをリセット
  const generateWalletFromMnemonic = async (mnemonicInput: string) => {
    try {
      const seed = mnemonicToSeedSync(mnemonicInput);
      const path = "m/44'/501'/0'/0'"; 
      const derivedSeed = derivePath(path, seed.toString('hex')).key;
      const keypair = Keypair.fromSeed(derivedSeed);

      const newWallet = { 
        address: keypair.publicKey.toBase58(), 
        secretKey: keypair.secretKey,
        mnemonic: mnemonicInput 
      };
      setWallet(newWallet);
      setPin(null); // インポート時はPINをリセット
      
      saveWalletData(newWallet, null, false, 'mainnet-beta');
      setCurrentScreen('main');
      showNotification(t('wallet_restored'));
      return true;
    } catch (e) {
      console.error(e);
      showNotification(t('error'));
      return false;
    }
  };

  // 新規作成処理
  const createWallet = async () => {
    await wait(500);
    try {
      const mnemonic = generateMnemonic(128); 
      const seed = mnemonicToSeedSync(mnemonic);
      const path = "m/44'/501'/0'/0'"; 
      const derivedSeed = derivePath(path, seed.toString('hex')).key;
      const keypair = Keypair.fromSeed(derivedSeed);

      setWallet({ 
        address: keypair.publicKey.toBase58(), 
        secretKey: keypair.secretKey,
        mnemonic: mnemonic 
      });
      setCurrentScreen('create');
    } catch (e) {
      console.error(e);
      showNotification(t('create_error'));
      setCurrentScreen('welcome');
    }
  };

  // 作成確認後の確定
  const handleCreateConfirm = () => {
    saveWalletData(wallet, null, false, 'mainnet-beta');
    setCurrentScreen('main');
  };

  // ------------------------------------------
  // 画面レンダリング (Render Router)
  // ------------------------------------------
  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash': return <SplashScreen />; 
      case 'welcome': return (
        <WelcomeScreen 
          t={t}
          onStart={() => setCurrentScreen('loading')} 
          onImport={() => setCurrentScreen('import')} 
        />
      );
      case 'loading': return <LoadingScreen t={t} onFinish={createWallet} />;
      case 'create': return <CreateWalletScreen t={t} wallet={wallet} onConfirm={handleCreateConfirm} />; 
      case 'import': return (
        <ImportWalletScreen 
          t={t}
          onBack={() => setCurrentScreen('welcome')}
          onImport={generateWalletFromMnemonic}
        />
      );
      case 'unlock': return (
        <UnlockScreen 
          t={t}
          correctPin={pin} 
          biometricsEnabled={biometricsEnabled} 
          onUnlock={() => setCurrentScreen('main')} 
          onLogout={handleLogout} 
        />
      );
      case 'main': return (
        <MainScreen 
          t={t}
          activeTab={activeTab} setActiveTab={setActiveTab}
          wallet={wallet} assets={assets} totalValue={totalValue} 
          onRefresh={refreshAssets} 
          tokenList={tokenList} network={network} connection={connection}
          onRetryFetchTokens={fetchTokens} 
          notify={showNotification} 
          onNavigate={(screen: any) => setCurrentScreen(screen)} // 遷移関数
          onLogout={handleLogout}
          contacts={contacts} // アドレス帳データ
        />
      );
      case 'receive': return (
        <ReceiveScreen 
          t={t}
          wallet={wallet} 
          onBack={() => setCurrentScreen('main')} 
          notify={showNotification} 
        />
      );
      case 'send': return (
        <SendScreen 
          t={t}
          wallet={wallet} 
          connection={connection}
          contacts={contacts} 
          onBack={() => setCurrentScreen('main')} 
          notify={showNotification} 
        />
      );
      case 'history': return (
        <HistoryScreen 
          t={t} 
          connection={connection} 
          address={wallet?.address} 
          onBack={() => setCurrentScreen('main')} 
        />
      );
      case 'stake': return ( 
        <StakingScreen 
          t={t}
          wallet={wallet}
          connection={connection}
          notify={showNotification}
          onBack={() => setCurrentScreen('main')}
          solBalance={assets.find(a => a.symbol === 'SOL')?.amount || 0}
        />
      );
      case 'settings_security': return (
        <SecuritySettingsScreen 
          t={t}
          wallet={wallet} 
          biometrics={biometricsEnabled} 
          setBiometrics={async (enabled: boolean) => {
            if (enabled) {
              if (!pin) {
                Alert.alert(t('pin_required'), "", [
                  { text: t('cancel'), style: "cancel" },
                  { text: t('pin_setup'), onPress: () => {
                      setPendingBioEnable(true);
                      setCurrentScreen('pin_setup');
                    } 
                  }
                ]);
                return;
              }
              try {
                const { available } = await rnBiometrics.isSensorAvailable();
                if (available && available !== 'FaceID' && available !== 'TouchID' && available !== 'Biometrics') {
                   Alert.alert(t('error'), t('biometrics_error'));
                   return;
                }
                const { success } = await rnBiometrics.simplePrompt({ promptMessage: t('biometrics') });
                if (success) {
                  setBiometricsEnabled(true);
                  saveWalletData(wallet, pin, true, network);
                }
              } catch(e) {
                Alert.alert(t('auth_cancelled'));
              }
            } else {
              setBiometricsEnabled(false);
              saveWalletData(wallet, pin, false, network); 
            }
          }}
          hasPin={!!pin}
          onSetupPin={() => {
            setPendingBioEnable(false);
            setCurrentScreen('pin_setup');
          }}
          onBack={() => setCurrentScreen('main')} 
        />
      );
      case 'address_book': return ( 
        <AddressBookScreen 
          t={t}
          contacts={contacts} 
          onSave={saveContacts}
          notify={showNotification}
          onBack={() => setCurrentScreen('main')}
        />
      );
      case 'settings_help': return (
        <HelpScreen t={t} onBack={() => setCurrentScreen('main')} />
      );
      case 'settings_about': return (
        <AboutScreen t={t} onBack={() => setCurrentScreen('main')} />
      );
      case 'settings_lang': return (
        <LanguageScreen 
          onBack={() => setCurrentScreen('main')} 
          onChange={changeLanguage} 
          currentLang={lang} 
        />
      );
      case 'pin_setup': return (
        <PinSetupScreen 
          t={t}
          onSuccess={handlePinSet}
          onCancel={() => {
            setPendingBioEnable(false);
            setCurrentScreen('settings_security');
          }}
        />
      );
      case 'settings_network': return (
        <NetworkSettingsScreen 
          t={t}
          currentNetwork={network} 
          setNetwork={(net: any) => {
            setNetwork(net);
            saveWalletData(wallet, pin, biometricsEnabled, net); 
          }}
          currentRpc={rpcEndpoint} setRpc={setRpcEndpoint}
          onBack={() => setCurrentScreen('main')} 
        />
      );
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2e1065" />
      {notification && (
        <View style={styles.notification}>
          <Text style={styles.notificationText}>{notification}</Text>
        </View>
      )}
      {renderScreen()}
    </SafeAreaView>
  );
}

// ==========================================
// 個別画面コンポーネント (Screens)
// ==========================================

const SplashScreen = () => (
  <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#2e1065' }]}>
    {/* assets/splash.png を表示 */}
    <Image 
      source={require('./assets/splash.png')} 
      style={{ width: '50%', height: undefined, aspectRatio: 1, resizeMode: 'contain' }} // 幅50%、アスペクト比維持
    />
  </View>
);

const WelcomeScreen = ({ t, onStart, onImport }: any) => (
  <View style={styles.centerContent}>
    <View style={styles.logoBox}><Zap size={40} color="white" fill="white" /></View>
    <Text style={styles.title}>{t('welcome_title')}</Text>
    <Text style={styles.subtitle}>{t('welcome_subtitle')}</Text>
    
    <TouchableOpacity style={styles.primaryButton} onPress={onStart}>
      <Text style={styles.primaryButtonText}>{t('create_new')}</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.secondaryButton} onPress={onImport}>
      <Download size={20} color="#a855f7" style={{marginRight:8}} />
      <Text style={styles.secondaryButtonText}>{t('import_wallet')}</Text>
    </TouchableOpacity>
  </View>
);

const ImportWalletScreen = ({ t, onBack, onImport }: any) => {
  const [mnemonic, setMnemonic] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    const cleanMnemonic = mnemonic.trim().toLowerCase(); 
    if (!cleanMnemonic) return;
    if (!validateMnemonic(cleanMnemonic)) {
      Alert.alert(t('error'), t('invalid_phrase'));
      return;
    }
    setLoading(true);
    await wait(500);
    const success = await onImport(cleanMnemonic);
    // ★修正: 成功した場合は画面遷移してアンマウントされるため、setLoading(false)を呼ばない
    if (!success) {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <HeaderRow title={t('import_wallet')} onBack={onBack} />
        <Text style={styles.descText}>{t('secret_phrase_desc')}</Text>
        <TextInput 
          style={styles.mnemonicInput}
          placeholder="apple banana cherry..."
          placeholderTextColor="#555"
          multiline
          numberOfLines={4}
          value={mnemonic}
          onChangeText={setMnemonic}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity 
          style={[styles.primaryButton, (!mnemonic || loading) && {backgroundColor:'#333'}]} 
          onPress={handleImport}
          disabled={!mnemonic || loading}
        >
          {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.primaryButtonText}>{t('import_wallet')}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const LoadingScreen = ({ t, onFinish }: any) => {
  useEffect(() => { onFinish(); }, []);
  return (
    <View style={styles.centerContent}>
      <ActivityIndicator size="large" color="#9333ea" />
      <Text style={styles.subtitle}>{t('loading_mnemonic')}</Text>
    </View>
  );
};

const CreateWalletScreen = ({ t, wallet, onConfirm }: any) => {
  const words = wallet?.mnemonic ? wallet.mnemonic.split(' ') : [];
  return (
    <View style={styles.content}>
      <Text style={styles.screenTitle}>{t('secret_phrase_title')}</Text>
      <Text style={styles.descText}>{t('secret_phrase_desc')}</Text>
      <View style={styles.mnemonicContainer}>
        {words.map((word: string, i: number) => (
          <View key={i} style={styles.wordTag}>
            <Text style={styles.wordNum}>{i+1}</Text>
            <Text style={styles.wordText}>{word}</Text>
          </View>
        ))}
      </View>
      <View style={styles.warningBox}>
        <ShieldCheck size={20} color="#eab308" />
        <Text style={styles.warningText}>{t('warning_share')}</Text>
      </View>
      <TouchableOpacity style={[styles.primaryButton, {marginTop: 'auto'}]} onPress={onConfirm}>
        <Text style={styles.primaryButtonText}>{t('saved_btn')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const UnlockScreen = ({ t, correctPin, biometricsEnabled, onUnlock, onLogout }: any) => {
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (biometricsEnabled) {
      checkBiometrics();
    }
  }, []);

  const checkBiometrics = async () => {
    try {
      const { success } = await rnBiometrics.simplePrompt({ promptMessage: t('welcome_back') });
      if (success) {
        onUnlock();
      }
    } catch(e) {}
  };

  const handlePress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        if (newPin === correctPin) {
          setTimeout(onUnlock, 100);
        } else {
          Alert.alert(t('error'), t('pin_mismatch'), [{ text: "OK", onPress: () => setPin('') }]);
        }
      }
    }
  };

  return (
    <View style={styles.pinContainer}>
      <Text style={styles.pinTitle}>{t('welcome_back')}</Text>
      <Text style={styles.pinDesc}>{t('enter_pin')}</Text>
      <View style={styles.pinDots}>
        {[...Array(4)].map((_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotActive]} />
        ))}
      </View>
      <View style={styles.numPad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <TouchableOpacity key={num} style={styles.numBtn} onPress={() => handlePress(num.toString())}>
            <Text style={styles.numText}>{num}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.numBtnPlaceholder} />
        <TouchableOpacity style={styles.numBtn} onPress={() => handlePress("0")}>
          <Text style={styles.numText}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.numBtn} onPress={() => setPin(pin.slice(0, -1))}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      {biometricsEnabled && (
         <TouchableOpacity style={{marginTop: 30}} onPress={checkBiometrics}>
           <Text style={{color: '#a855f7', fontWeight:'bold'}}>{t('use_biometrics')}</Text>
         </TouchableOpacity>
      )}
      <TouchableOpacity style={{marginTop: 30}} onPress={onLogout}>
        <Text style={{color: '#666'}}>{t('logout_reset')}</Text>
      </TouchableOpacity>
    </View>
  );
};

// メイン画面（タブ管理 + 子画面への遷移管理）
const MainScreen = ({ t, activeTab, setActiveTab, onNavigate, onLogout, onRetryFetchTokens, contacts, ...props }: any) => {
  return (
    <View style={{flex:1}}>
      <View style={{flex:1}}>
        {activeTab === 'home' && (
          <Dashboard 
             t={t}
             onNav={setActiveTab} 
             onNavigate={onNavigate} 
             {...props} 
          />
        )}
        {activeTab === 'swap' && <Swap t={t} {...props} onRetryFetch={onRetryFetchTokens} />} 
        {activeTab === 'history' && (
          <HistoryScreen 
            t={t} 
            connection={props.connection} 
            address={props.wallet?.address} 
            onBack={() => setActiveTab('home')} // タブなのでホームに戻るように設定
          />
        )}
        {activeTab === 'settings' && <SettingsScreen t={t} onNavigate={onNavigate} onLogout={onLogout} />}
      </View>
      <View style={styles.bottomNav}>
         <NavButton icon={Wallet} label={t('home')} active={activeTab === 'home'} onPress={() => setActiveTab('home')} />
         <NavButton icon={RefreshCw} label={t('swap')} active={activeTab === 'swap'} onPress={() => setActiveTab('swap')} />
         <NavButton icon={History} label={t('history')} active={activeTab === 'history'} onPress={() => setActiveTab('history')} />
         <NavButton icon={Settings} label={t('settings')} active={activeTab === 'settings'} onPress={() => setActiveTab('settings')} />
      </View>
    </View>
  );
};

const PinSetupScreen = ({ t, onSuccess, onCancel }: any) => {
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');

  const handlePress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        setTimeout(() => handleComplete(newPin), 100);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handleComplete = (inputPin: string) => {
    if (step === 'create') {
      setFirstPin(inputPin);
      setPin('');
      setStep('confirm');
    } else {
      if (inputPin === firstPin) {
        onSuccess(inputPin);
      } else {
        Alert.alert(t('error'), t('pin_mismatch'), [{ text: "OK", onPress: () => { setStep('create'); setPin(''); setFirstPin(''); } }]);
      }
    }
  };

  return (
    <View style={styles.pinContainer}>
      <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
        <X size={24} color="#fff" />
      </TouchableOpacity>
      
      <Text style={styles.pinTitle}>{step === 'create' ? t('pin_setup') : "OK"}</Text>
      <View style={styles.pinDots}>
        {[...Array(4)].map((_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.numPad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <TouchableOpacity key={num} style={styles.numBtn} onPress={() => handlePress(num.toString())}>
            <Text style={styles.numText}>{num}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.numBtnPlaceholder} />
        <TouchableOpacity style={styles.numBtn} onPress={() => handlePress("0")}>
          <Text style={styles.numText}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.numBtn} onPress={() => handlePress("0")}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const AddressBookScreen = ({ t, contacts, onSave, notify, onBack }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState(''); const [newAddr, setNewAddr] = useState('');

  const addContact = () => {
    if(!newName || !newAddr) return;
    try {
      new PublicKey(newAddr); 
      const updated = [...contacts, { name: newName, address: newAddr }];
      onSave(updated);
      setNewName(''); setNewAddr(''); setModalVisible(false);
      notify(t('added'));
    } catch(e) {
      Alert.alert(t('error'), t('invalid_address'));
    }
  };

  const deleteContact = (index: number) => {
    Alert.alert(t('delete'), t('confirm_delete'), [
      { text: t('cancel'), style: "cancel" },
      { text: t('delete'), style: "destructive", onPress: () => {
          const updated = contacts.filter((_:any, i:number) => i !== index);
          onSave(updated);
      }}
    ]);
  };

  return (
    <View style={styles.content}>
      <HeaderRow title={t('address_book')} onBack={onBack} rightIcon={<TouchableOpacity onPress={() => setModalVisible(true)}><Plus size={24} color="#a855f7" /></TouchableOpacity>} />
      <ScrollView>{contacts.length === 0 ? <Text style={styles.descText}>Empty</Text> : contacts.map((c: any, i: number) => (
        <View key={i} style={styles.settingItem}>
             <View style={{flex:1}}>
               <Text style={styles.settingText}>{c.name}</Text>
               <Text style={styles.descTextSmall}>{shortenAddress(c.address)}</Text>
             </View>
             <View style={{flexDirection:'row', gap:15}}>
               <TouchableOpacity onPress={() => {Clipboard.setString(c.address); notify(t('copied'));}}>
                 <Copy size={20} color="#666" />
               </TouchableOpacity>
               <TouchableOpacity onPress={() => deleteContact(i)}>
                 <Trash2 size={20} color="#ef4444" />
               </TouchableOpacity>
             </View>
          </View>
      ))}</ScrollView>
      {modalVisible && <View style={styles.modalOverlay}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContent}><Text style={styles.sectionTitle}>{t('add_new')}</Text><TextInput style={styles.inputField} placeholder={t('name')} value={newName} onChangeText={setNewName} /><TextInput style={styles.inputField} placeholder={t('address')} value={newAddr} onChangeText={setNewAddr} /><TouchableOpacity style={styles.primaryButton} onPress={addContact}><Text style={styles.primaryButtonText}>{t('save')}</Text></TouchableOpacity><TouchableOpacity onPress={() => setModalVisible(false)} style={{marginTop:15}}><Text style={{color:'#666',textAlign:'center'}}>{t('close')}</Text></TouchableOpacity></KeyboardAvoidingView></View>}
    </View>
  );
};

const SecuritySettingsScreen = ({ t, wallet, biometrics, setBiometrics, hasPin, onSetupPin, onBack }: any) => {
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showKey, setShowKey] = useState(false);

  if (!wallet) return <View style={styles.content} />;

  return (
    <ScrollView style={styles.content}>
      <HeaderRow title={t('security')} onBack={onBack} />
      <SettingItem icon={Lock} title={t('pin_setup')} desc={hasPin ? "OK" : "NO"} onPress={onSetupPin} />
      <View style={[styles.rowBetween, {paddingVertical:16, borderTopWidth:1, borderTopColor:'#222'}]}>
        <Text style={styles.settingText}>{t('biometrics')}</Text>
        <Switch value={biometrics} onValueChange={setBiometrics} trackColor={{false: "#333", true: "#9333ea"}} />
      </View>
      <Text style={[styles.sectionHeader, {marginTop:30}]}>{t('recovery_phrase')}</Text>
      <View style={styles.infoCard}>
         <View style={styles.rowBetween}>
           <Text style={styles.label}>12 words</Text>
           <TouchableOpacity onPress={() => setShowMnemonic(!showMnemonic)}>
             <Text style={styles.linkText}>{showMnemonic ? t('hide') : t('show')}</Text>
           </TouchableOpacity>
         </View>
         {showMnemonic && (
           <Text style={styles.secretText}>
             {wallet?.mnemonic ? wallet.mnemonic : "利用不可"}
           </Text>
         )}
      </View>

      <Text style={[styles.sectionHeader, {marginTop:10}]}>{t('private_key')}</Text>
      <View style={styles.infoCard}>
         <View style={styles.rowBetween}>
           <Text style={styles.label}>{t('raw_key')}</Text>
           <TouchableOpacity onPress={() => setShowKey(!showKey)}>
             <Text style={styles.linkText}>{showKey ? t('hide') : t('show')}</Text>
           </TouchableOpacity>
         </View>
         {showKey && wallet?.secretKey && (
           <Text style={styles.secretText}>{secretKeyToString(wallet.secretKey)}</Text>
         )}
      </View>
    </ScrollView>
  );
};

const NetworkSettingsScreen = ({ t, currentNetwork, setNetwork, currentRpc, setRpc, onBack }: any) => {
  const networks = [
    { id: 'mainnet-beta', name: 'Mainnet Beta', desc: 'Real Money' },
    { id: 'devnet', name: 'Devnet', desc: 'Test Env' },
  ];
  const rpcs = [
    { id: 'Public', name: 'Public Node' },
    { id: 'Helius', name: 'Helius' },
    { id: 'QuickNode', name: 'QuickNode' },
  ];

  return (
    <View style={styles.content}>
      <HeaderRow title={t('network')} onBack={onBack} />
      <ScrollView>
        <Text style={styles.sectionHeader}>{t('environment')}</Text>
        <View style={styles.settingGroup}>
          {networks.map((net: any) => (
            <TouchableOpacity 
              key={net.id} 
              style={[styles.networkItem, currentNetwork === net.id && styles.networkItemActive]}
              onPress={() => setNetwork(net.id)}
            >
               <View>
                 <Text style={[styles.settingText, currentNetwork === net.id && {color:'#a855f7'}]}>{net.name}</Text>
                 <Text style={styles.descTextSmall}>{net.desc}</Text>
               </View>
               {currentNetwork === net.id && <Check size={20} color="#a855f7" />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionHeader, {marginTop:20}]}>{t('rpc_endpoint')}</Text>
        <View style={styles.settingGroup}>
          {rpcs.map((rpc: any) => (
            <TouchableOpacity 
              key={rpc.id} 
              style={[styles.networkItem, currentRpc === rpc.id && styles.networkItemActive]}
              onPress={() => setRpc(rpc.id)}
            >
               <Text style={[styles.settingText, currentRpc === rpc.id && {color:'#a855f7'}]}>{rpc.name}</Text>
               {currentRpc === rpc.id && <Check size={20} color="#a855f7" />}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const Dashboard = ({ t, wallet, assets, totalValue, onNav, notify, onRefresh, onNavigate }: any) => {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.addressPill} onPress={() => { Clipboard.setString(wallet?.address); notify(t('address_copied')); }}>
          <View style={styles.greenDot} />
          <Text style={styles.addressText}>{shortenAddress(wallet?.address)}</Text>
          <Copy size={12} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => { notify(t('processing')); onRefresh(); }}>
          <RefreshCw size={20} color="#888" />
        </TouchableOpacity>
      </View>

      <View style={styles.balanceSection}>
        <Text style={styles.label}>{t('total_assets')}</Text>
        <Text style={styles.bigBalance}>${totalValue.toLocaleString(undefined, {maximumFractionDigits:2})}</Text>
        
        <View style={styles.actionRow}>
           <ActionButton icon={ArrowDownLeft} label={t('receive')} onPress={() => onNavigate('receive')} />
           <ActionButton icon={Send} label={t('send')} onPress={() => onNavigate('send')} />
           <ActionButton icon={CreditCard} label={t('buy')} onPress={() => Alert.alert(t('buy'), t('purchase_provider'), [{text:t('cancel'), style:"cancel"},{text:"MoonPay",onPress:()=>Linking.openURL('https://www.moonpay.com/buy')},{text:"Transak",onPress:()=>Linking.openURL('https://global.transak.com/')}])} />
           <View style={{alignItems:'center', gap:5}}>
             <TouchableOpacity style={[styles.actionCircle, {backgroundColor:'#22c55e'}]} onPress={() => onNavigate('stake')}>
               <TrendingUp size={24} color="#fff"/>
             </TouchableOpacity>
             <Text style={styles.label}>{t('stake')}</Text>
           </View>
        </View>
      </View>

      <View style={styles.assetsCard}>
        <View style={styles.assetsHeader}>
           <Text style={styles.sectionTitle}>{t('assets')}</Text>
           <TouchableOpacity onPress={() => onNav('swap')}><Text style={styles.linkText}>{t('trade')}</Text></TouchableOpacity>
        </View>
        
        {assets.length === 0 ? (
          <Text style={{color:'#666', textAlign:'center', marginTop:20}}>{t('no_assets')}</Text>
        ) : (
          assets.map((asset: any) => (
            <AssetItem 
              key={asset.mint}
              symbol={asset.symbol} 
              name={asset.name} 
              amount={asset.amount} 
              price={asset.price} 
              logoURI={asset.logoURI}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
};

// ★修正: Swapコンポーネント (FlatList + Search + 取得状況表示)
  const Swap = ({ t, wallet, tokenList, notify, connection, onRetryFetch }: any) => {
  const [fromToken, setFromToken] = useState(tokenList[0] || {});
  const [toToken, setToToken] = useState(tokenList[1] || {});
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalSide, setModalSide] = useState('from');
  const [searchQuery, setSearchQuery] = useState('');

  // ★トークンリストの取得状況をチェックし、少なければ再取得
  useEffect(() => {
    if (modalVisible && tokenList.length <= 7) { // デフォルトが増えたので7件以下なら再取得
      onRetryFetch();
    }
  }, [modalVisible]);

  // ★メモ化とアドレス検索の強化
  const filteredTokens = useMemo(() => {
    if (!searchQuery) return tokenList;
    const lowerQuery = searchQuery.toLowerCase();
    return tokenList.filter((t: any) => 
      (t.symbol?.toLowerCase().includes(lowerQuery) || 
       t.name?.toLowerCase().includes(lowerQuery) ||
       t.address?.includes(searchQuery)) // アドレス検索対応
    );
  }, [tokenList, searchQuery]);

  useEffect(() => {
    if(!amount || parseFloat(amount) <= 0) { setQuote(null); return; }
    const timer = setTimeout(async () => {
       setLoading(true);
       try {
         const amountInLamports = Math.floor(parseFloat(amount) * Math.pow(10, fromToken.decimals));
         const params = new URLSearchParams({
           inputMint: fromToken.address,
           outputMint: toToken.address,
           amount: amountInLamports.toString(),
           slippageBps: '50', 
           platformFeeBps: MY_PLATFORM_FEE_BPS.toString()
         });
         const res = await fetch(`${JUPITER_QUOTE_API}?${params}`);
         const data = await res.json();
         if (data.error) throw new Error(data.error);
         setQuote(data);
       } catch (e: any) { 
         console.log("Quote Error", e); 
         setQuote(null); 
       } finally { setLoading(false); }
    }, 600);
    return () => clearTimeout(timer);
  }, [amount, fromToken, toToken]);

  const doSwap = async () => {
    if (!wallet || !quote || !connection) return;
    setLoading(true);
    try {
      const swapBody = { 
        quoteResponse: quote, 
        userPublicKey: wallet.address, 
        wrapAndUnwrapSol: true,
        feeAccount: MY_FEE_ACCOUNT 
      };
      const swapRes = await fetch(JUPITER_SWAP_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(swapBody) });
      const swapJson = await swapRes.json();
      if (swapJson.error) throw new Error(swapJson.error);
      const swapTransactionBuf = Buffer.from(swapJson.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      
      if(!wallet.secretKey) throw new Error("秘密鍵が見つかりません");
      const keypair = Keypair.fromSecretKey(wallet.secretKey);
      
      transaction.sign([keypair]);
      const rawTransaction = transaction.serialize();
      const txid = await connection.sendRawTransaction(rawTransaction, { skipPreflight: true, maxRetries: 2 });
      notify("Tx...");
      await connection.confirmTransaction(txid);
      notify(t('send_success'));
      setAmount(''); setQuote(null);
    } catch (e: any) { notify(t('error')); } finally { setLoading(false); }
  };

  return (
    <View style={styles.content}>
      <Text style={styles.screenTitle}>{t('swap')}</Text>
      <View style={styles.swapCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>{t('pay')}</Text>
          <TokenSelectBtn token={fromToken} label={t('select')} onPress={() => {setModalSide('from'); setModalVisible(true)}} />
        </View>
        <TextInput style={styles.input} placeholder="0" placeholderTextColor="#555" keyboardType="numeric" value={amount} onChangeText={setAmount} />
      </View>
      <View style={{alignItems:'center', marginVertical:-15, zIndex:10}}><View style={styles.arrowCircle}><ArrowDown size={20} color="#a855f7" /></View></View>
      <View style={[styles.swapCard, {paddingTop: 25}]}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>{t('receive_lbl')}</Text>
          <TokenSelectBtn token={toToken} label={t('select')} onPress={() => {setModalSide('to'); setModalVisible(true)}} />
        </View>
        {loading ? <ActivityIndicator style={{alignSelf:'flex-start', marginVertical:10}}/> : <Text style={styles.input}>{quote ? (quote.outAmount / Math.pow(10, toToken.decimals)).toFixed(4) : '0.00'}</Text>}
      </View>
      {/* 常にバッジを表示 */}
      <View style={styles.infoBox}>
         <Text style={styles.infoText}>{quote ? `${t('route')}: Jupiter Aggregator` : 'Jupiter Aggregator'}</Text>
         <View style={{flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4}}>
           <Text style={[styles.infoText, {color:'#a855f7', marginRight: 8}]}>{t('fee')}: 0.4% ({t('included')})</Text>
           <View style={styles.jitoBadge}>
             <Shield size={12} color="white" style={{marginRight: 4}} />
             <Text style={styles.jitoText}>{t('jito_protection')}</Text>
           </View>
         </View>
      </View>
      <TouchableOpacity style={[styles.primaryButton, (!quote || loading) && {backgroundColor:'#333'}]} disabled={!quote || loading} onPress={doSwap}>
        <Text style={styles.primaryButtonText}>{loading ? t('processing') : t('swap_btn')}</Text>
      </TouchableOpacity>

      {modalVisible && (
        <View style={styles.modalOverlay}>
           <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContent}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>{t('select')}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><X color="#fff" /></TouchableOpacity>
              </View>
              
              <View style={{ backgroundColor: '#222', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginVertical: 10 }}>
                <Search size={20} color="#888" />
                <TextInput 
                  style={{ flex: 1, color: 'white', padding: 12 }}
                  placeholder={`Search (${tokenList.length})`} // ★件数を表示
                  placeholderTextColor="#666"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <FlatList
                data={filteredTokens}
                keyExtractor={(item) => item.address}
                initialNumToRender={10}
                maxToRenderPerBatch={20}
                windowSize={10}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.tokenItem} onPress={() => { 
                    if(modalSide === 'from') setFromToken(item); 
                    else setToToken(item); 
                    setModalVisible(false); 
                    setSearchQuery(''); 
                  }}>
                     <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
                       {item.logoURI ? (
                         <Image source={{uri: item.logoURI}} style={{width: 30, height: 30, borderRadius: 15}} />
                       ) : (
                         <View style={{width:30, height:30, borderRadius:15, backgroundColor:'#555', alignItems:'center', justifyContent:'center'}}>
                           <Text style={{color:'#fff', fontSize:10}}>{item.symbol?.[0]}</Text>
                         </View>
                       )}
                       <View>
                         <Text style={styles.tokenSym}>{item.symbol}</Text>
                         <Text style={styles.tokenName}>{item.name}</Text>
                       </View>
                     </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={() => (
                   <Text style={{color:'#666', textAlign:'center', marginTop:20}}>No Token</Text>
                )}
              />
           </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
};

// ★追加: 受取る画面 (QRコード表示)
const ReceiveScreen = ({ t, wallet, onBack, notify }: any) => {
  const address = wallet?.address || "";
  
  const handleCopy = () => {
    Clipboard.setString(address);
    notify(t('address_copied'));
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: address });
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <View style={styles.content}>
      <HeaderRow title={t('receive')} onBack={onBack} />

      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
         {/* QRコード画像表示 (API利用) */}
         <View style={{backgroundColor: 'white', padding: 20, borderRadius: 20, marginBottom: 30}}>
            <Image 
              source={{uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${address}`}} 
              style={{width: 200, height: 200}} 
            />
         </View>

         <Text style={{color: '#888', marginBottom: 10}}>{t('solana_address')}</Text>
         <Text style={{color: 'white', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, marginHorizontal: 20}}>{address}</Text>

         <View style={{flexDirection: 'row', gap: 20}}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleCopy}>
              <Copy size={20} color="#a855f7" style={{marginRight: 8}} />
              <Text style={styles.secondaryButtonText}>{t('copy')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleShare}>
              <Share2 size={20} color="#a855f7" style={{marginRight: 8}} />
              <Text style={styles.secondaryButtonText}>{t('share')}</Text>
            </TouchableOpacity>
         </View>
      </View>
    </View>
  );
};

// ★追加: 送る画面
const SendScreen = ({ t, wallet, connection, contacts, onBack, notify }: any) => {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showContacts, setShowContacts] = useState(false);

  const handleSend = async () => {
    if (!address || !amount) return;
    setLoading(true);
    try {
      const destPubkey = new PublicKey(address);
      const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(wallet.address),
          toPubkey: destPubkey,
          lamports: lamports,
        })
      );
      
      const keypair = Keypair.fromSecretKey(wallet.secretKey);
      const signature = await connection.sendTransaction(transaction, [keypair]);
      notify(t('sending'));
      await connection.confirmTransaction(signature);
      
      Alert.alert(t('send_success'), `Tx: ${signature.slice(0,8)}...`);
      setAddress('');
      setAmount('');
      onBack();
    } catch (e: any) {
      Alert.alert(t('send_failed'), e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.content}>
      <HeaderRow title={t('send')} onBack={onBack} rightIcon={<TouchableOpacity onPress={() => setShowContacts(true)}><Users size={24} color="#a855f7"/></TouchableOpacity>} />

      <ScrollView>
        <View style={styles.swapCard}>
          <Text style={styles.label}>{t('recipient')}</Text>
          <TextInput 
            style={[styles.input, {fontSize: 14, fontWeight:'normal'}]} 
            placeholder="Address" 
            placeholderTextColor="#555" 
            value={address} 
            onChangeText={setAddress}
            multiline
          />
        </View>

        <View style={[styles.swapCard, {marginTop: 20}]}>
          <Text style={styles.label}>{t('amount_sol')}</Text>
          <TextInput 
            style={styles.input} 
            placeholder="0.00" 
            placeholderTextColor="#555" 
            keyboardType="numeric" 
            value={amount} 
            onChangeText={setAmount} 
          />
        </View>

        <TouchableOpacity 
          style={[styles.primaryButton, {marginTop: 40}, (!address || !amount || loading) && {backgroundColor: '#333'}]}
          disabled={!address || !amount || loading}
          onPress={handleSend}
        >
          <Text style={styles.primaryButtonText}>{loading ? t('processing') : t('send')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* アドレス帳モーダル */}
      {showContacts && (
        <View style={styles.modalOverlay}>
           <View style={styles.modalContent}>
              <View style={styles.rowBetween}><Text style={styles.sectionTitle}>{t('address_book')}</Text><TouchableOpacity onPress={() => setShowContacts(false)}><X color="#fff" /></TouchableOpacity></View>
              <ScrollView>
                 {contacts.length === 0 ? <Text style={{color:'#666',marginTop:20}}>Empty</Text> : 
                   contacts.map((c:any, i:number) => (
                    <TouchableOpacity key={i} style={styles.tokenItem} onPress={() => { setAddress(c.address); setShowContacts(false); }}>
                       <Text style={styles.tokenSym}>{c.name}</Text><Text style={styles.tokenName}>{shortenAddress(c.address)}</Text>
                    </TouchableOpacity>
                 ))}
              </ScrollView>
           </View>
        </View>
      )}
    </View>
  );
};

const StakingScreen = ({ t, wallet, connection, notify, onBack, solBalance }: any) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);

  useEffect(() => {
    if(!amount || parseFloat(amount) <= 0) { setQuote(null); return; }
    
    const fetchQuote = async () => {
       setLoading(true);
       try {
         const inputLamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
         const params = new URLSearchParams({
           inputMint: SOL_MINT,
           outputMint: JITO_SOL_MINT,
           amount: inputLamports.toString(),
           slippageBps: '50', // 0.5%
           platformFeeBps: MY_PLATFORM_FEE_BPS.toString()
         });
         
         const res = await fetch(`${JUPITER_QUOTE_API}?${params}`);
         const data = await res.json();
         if (data.error) throw new Error(data.error);
         setQuote(data);
       } catch (e: any) { console.log(e); } 
       finally { setLoading(false); }
    };

    const timer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timer);
  }, [amount]);

  const doStake = async () => {
    if (!wallet || !quote || !connection) return;
    setLoading(true);
    try {
      const swapBody = { 
        quoteResponse: quote, 
        userPublicKey: wallet.address, 
        wrapAndUnwrapSol: true,
        feeAccount: MY_FEE_ACCOUNT 
      };
      
      const swapRes = await fetch(JUPITER_SWAP_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(swapBody) });
      const swapJson = await swapRes.json();
      if (swapJson.error) throw new Error(swapJson.error);

      const swapTransactionBuf = Buffer.from(swapJson.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      
      const keypair = Keypair.fromSecretKey(wallet.secretKey);
      transaction.sign([keypair]);
      
      const rawTransaction = transaction.serialize();
      const txid = await connection.sendRawTransaction(rawTransaction, { skipPreflight: true, maxRetries: 2 });
      notify(t('processing'));
      await connection.confirmTransaction(txid);
      
      notify(t('staking_success'));
      setAmount('');
      setQuote(null);
    } catch (e: any) { 
      console.error(e); 
      Alert.alert(t('error'), e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <View style={styles.content}>
      <HeaderRow title={t('staking_btn')} onBack={onBack} />

      <ScrollView>
        <View style={styles.infoCard}>
           <Text style={styles.label}>{t('liquid_staking')}</Text>
           <Text style={styles.descText}>{t('staking_desc')}</Text>
        </View>

        <View style={styles.swapCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>{t('deposit')} (SOL)</Text>
            <View style={{flexDirection:'row', alignItems:'center', gap:5}}>
               <View style={[styles.coinIcon, {backgroundColor:'#9945FF'}]}><Text style={{fontWeight:'bold', color:'white'}}>S</Text></View>
               <Text style={{color:'white', fontWeight:'bold'}}>SOL</Text>
            </View>
          </View>
          <TextInput 
            style={styles.input} 
            placeholder="0" 
            placeholderTextColor="#555" 
            keyboardType="numeric" 
            value={amount} 
            onChangeText={setAmount} 
          />
          <Text style={styles.balanceText}>Balance: {solBalance?.toFixed(4)} SOL</Text>
        </View>

        <View style={{alignItems:'center', marginVertical:10}}>
          <ArrowDown size={24} color="#666" />
        </View>

        <View style={[styles.swapCard, {backgroundColor:'#222'}]}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>{t('receive_lbl')} (JitoSOL)</Text>
            <View style={{flexDirection:'row', alignItems:'center', gap:5}}>
               <View style={[styles.coinIcon, {backgroundColor:'#22c55e'}]}><Text style={{fontWeight:'bold', color:'white'}}>J</Text></View>
               <Text style={{color:'white', fontWeight:'bold'}}>JitoSOL</Text>
            </View>
          </View>
          {loading ? <ActivityIndicator color="#a855f7" /> : (
            <Text style={styles.input}>
               {quote ? (quote.outAmount / 1000000000).toFixed(4) : "0.00"}
            </Text>
          )}
          {/* APY表示: 視認性を向上 */}
          <Text style={[styles.balanceText, {color: '#22c55e', fontWeight: 'bold', fontSize: 14}]}>
          {t('apy_est')}
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.primaryButton, (!quote || loading) && {backgroundColor:'#333'}, {marginTop:30}]} 
          disabled={!quote || loading} 
          onPress={doStake}
        >
          <Text style={styles.primaryButtonText}>{loading ? t('processing') : t('staking_btn')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// ★追加: HelpScreen
const HelpScreen = ({ t, onBack }: any) => {
  return (
    <ScrollView style={styles.content}>
      <HeaderRow title={t('help')} onBack={onBack} />
      <Text style={styles.sectionHeader}>FAQ</Text>
      
      <View style={styles.helpItemContainer}>
         <View style={styles.helpHeaderRow}>
            <View style={styles.helpIconBadge}>
              <RefreshCw size={16} color="#fff" />
            </View>
            <Text style={styles.helpTitle}>{t('faq_restore')}</Text>
         </View>
         <Text style={styles.helpDesc}>{t('faq_restore_desc')}</Text>
      </View>

      <View style={styles.helpItemContainer}>
         <View style={styles.helpHeaderRow}>
            <View style={[styles.helpIconBadge, {backgroundColor: '#22c55e'}]}>
              <TrendingUp size={16} color="#fff" />
            </View>
            <Text style={styles.helpTitle}>{t('faq_stake')}</Text>
         </View>
         <Text style={styles.helpDesc}>{t('faq_stake_desc')}</Text>
      </View>
      
      {/* APYのFAQ */}
      <View style={styles.helpItemContainer}>
         <View style={styles.helpHeaderRow}>
            <View style={[styles.helpIconBadge, {backgroundColor: '#22c55e'}]}>
              <Percent size={16} color="#fff" />
            </View>
            <Text style={styles.helpTitle}>{t('faq_apy')}</Text>
         </View>
         <Text style={styles.helpDesc}>{t('faq_apy_desc')}</Text>
      </View>

      <View style={styles.helpItemContainer}>
         <View style={styles.helpHeaderRow}>
            <View style={[styles.helpIconBadge, {backgroundColor: '#eab308'}]}>
              <Zap size={16} color="#fff" />
            </View>
            <Text style={styles.helpTitle}>{t('faq_fee')}</Text>
         </View>
         <Text style={styles.helpDesc}>{t('faq_fee_desc')}</Text>
      </View>

      <View style={styles.helpItemContainer}>
         <View style={styles.helpHeaderRow}>
            <View style={[styles.helpIconBadge, {backgroundColor: '#ef4444'}]}>
              <ShieldCheck size={16} color="#fff" />
            </View>
            <Text style={styles.helpTitle}>{t('faq_device')}</Text>
         </View>
         <Text style={styles.helpDesc}>{t('faq_device_desc')}</Text>
      </View>

      <View style={styles.helpItemContainer}>
         <View style={styles.helpHeaderRow}>
            <View style={[styles.helpIconBadge, {backgroundColor: '#a855f7'}]}>
              <Wallet size={16} color="#fff" />
            </View>
            <Text style={styles.helpTitle}>{t('faq_bank')}</Text>
         </View>
         <Text style={styles.helpDesc}>{t('faq_bank_desc')}</Text>
      </View>
      
      <View style={{height: 40}} />
    </ScrollView>
  );
};

// ★追加: AboutScreen
const AboutScreen = ({ t, onBack }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const openYoutube = () => {
    Linking.openURL(YOUTUBE_URL).catch(err => console.error("Couldn't load page", err));
  };

  const openGithub = () => {
    Linking.openURL(GITHUB_URL).catch(err => console.error("Couldn't load page", err));
  };

  return (
    <View style={styles.content}>
      <HeaderRow title={t('about')} onBack={onBack} />
      <ScrollView>
        <View style={{alignItems:'center', marginVertical: 30}}>
          <View style={[styles.logoBox, {width:100, height:100, borderRadius:30}]}>
             <Image source={require('./assets/splash.png')} style={{width: 60, height: 60, borderRadius: 15}}/>
          </View>
          <Text style={[styles.title, {fontSize:24, marginTop:10}]}>{t('welcome_title')}</Text>
          <Text style={{color:'#888'}}>Version 1.0.0</Text>
        </View>

        <View style={styles.settingGroup}>
           <TouchableOpacity style={styles.settingItem} onPress={openYoutube}>
              <View style={[styles.settingIcon, {backgroundColor:'#FF0000'}]}>
                <Youtube size={20} color="#fff"/>
              </View>
              <View style={{flex:1}}>
                <Text style={styles.settingText}>{t('official_youtube')}</Text>
                <Text style={styles.descTextSmall}>@ramyaparryk</Text>
              </View>
              <ExternalLink size={20} color="#444" />
           </TouchableOpacity>

<TouchableOpacity style={styles.settingItem} onPress={openGithub}>
              {/* GitHubカラー(黒/濃いグレー)に設定 */}
              <View style={[styles.settingIcon, {backgroundColor:'#171515'}]}>
                <Github size={20} color="#fff"/>
              </View>
              <View style={{flex:1}}>
                {/* 翻訳ファイルに 'official_github' がない場合は直接文字を入れてもOK */}
                <Text style={styles.settingText}>Official GitHub</Text> 
                <Text style={styles.descTextSmall}>Check Source Code</Text>
              </View>
              <ExternalLink size={20} color="#444" />
           </TouchableOpacity>

           <TouchableOpacity style={styles.settingItem} onPress={() => setModalVisible(true)}>
              <View style={styles.settingIcon}><Info size={20} color="#fff"/></View>
              <View style={{flex:1}}>
                <Text style={styles.settingText}>{t('terms')}</Text>
                <Text style={styles.descTextSmall}>{t('terms_desc')}</Text>
              </View>
              <ChevronRight size={20} color="#444" />
           </TouchableOpacity>
        </View>
        
        <Text style={{textAlign:'center', color:'#444', marginTop:50, marginBottom:30}}>
          Made with ❤️ for Solana Community
        </Text>
      </ScrollView>

      {/* 利用規約モーダル */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {height: '80%'}]}>
            <View style={styles.rowBetween}>
              <Text style={styles.modalTitle}>{t('terms_title')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><X color="#fff" /></TouchableOpacity>
            </View>
            <ScrollView style={{marginTop: 10}}>
              <Text style={styles.termTitle}>{t('term_1_title')}</Text>
              <Text style={styles.termText}>{t('term_1_desc')}</Text>
              
              <Text style={styles.termTitle}>{t('term_2_title')}</Text>
              <Text style={styles.termText}>{t('term_2_desc')}</Text>

              <Text style={styles.termTitle}>{t('term_3_title')}</Text>
              <Text style={styles.termText}>{t('term_3_desc')}</Text>

              <Text style={styles.termTitle}>{t('term_4_title')}</Text>
              <Text style={styles.termText}>{t('term_4_desc')}</Text>

              <Text style={styles.termTitle}>{t('term_5_title')}</Text>
              <Text style={styles.termText}>{t('term_5_desc')}</Text>
              <Text style={styles.termTitle}>{t('term_6_title')}</Text>
              <Text style={styles.termText}>{t('term_6_desc')}</Text>
              <View style={{height: 50}}/>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const LanguageScreen = ({ onBack, onChange, currentLang }: any) => {
  const langs = [
    { code: 'ja', label: '日本語' },
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'ru', label: 'Русский' },
    { code: 'de', label: 'Deutsch' },
    { code: 'zh', label: '中文' },
    { code: 'ko', label: '한국어' },
  ];
  return (
    <View style={styles.content}>
      <HeaderRow title="Language" onBack={onBack} />
      <ScrollView>
        {langs.map(l => (
          <TouchableOpacity key={l.code} style={styles.settingItem} onPress={() => onChange(l.code)}>
            <Text style={[styles.settingText, currentLang===l.code && {color:'#a855f7'}]}>{l.label}</Text>
            {currentLang===l.code && <Check size={20} color="#a855f7" />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};
