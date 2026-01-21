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

// 定数（config）をインポート
import { 
  JUPITER_TOKEN_LIST_API, 
  JUPITER_QUOTE_API, 
  JUPITER_SWAP_API, 
  JUPITER_PRICE_API, 
  JUPITER_API_KEY,
  TOKEN_PROGRAM_ID, 
  JITO_SOL_MINT, 
  SOL_MINT, 
  MY_PLATFORM_FEE_BPS, 
  MY_FEE_ACCOUNT 
} from './src/constants/config';

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
// ダッシュボード（ホーム画面）
import { DashboardScreen } from './src/screens/DashboardScreen';
// Swap画面
import { SwapScreen } from './src/screens/SwapScreen';
// 戻るボタン付きヘッダー
import { HeaderRow } from './src/components/HeaderRow';
// 送金受信画面
import { ReceiveScreen, SendScreen } from './src/screens/TransferScreens';
// ステーキング画面
import { StakingScreen } from './src/screens/StakingScreen';
// アドレス帳
import { AddressBookScreen } from './src/screens/AddressBookScreen';
// 各種関数
import { wait } from './src/utils/solanaUtils';
// 起動画面など
import { 
  SplashScreen, WelcomeScreen, ImportWalletScreen, LoadingScreen, CreateWalletScreen 
} from './src/screens/OnboardingScreens';
// アンロック・PIN作成画面
import { UnlockScreen, PinSetupScreen } from './src/screens/AuthScreens';
// ヘルパー関数
import { secretKeyToString } from './src/utils/solanaUtils';
// 設定画面
import { 
  SecuritySettingsScreen, NetworkSettingsScreen, HelpScreen, AboutScreen, LanguageScreen 
} from './src/screens/SettingsDetailScreens';

// ==========================================
// 定数・設定 (Configuration)
// ==========================================

const STORAGE_KEY = 'my_solana_wallet_settings_v1'; // 設定用
const STORAGE_KEY_CONTACTS = 'my_solana_contacts_v1'; 
const STORAGE_KEY_LANG = 'my_solana_language_v1'; 
const SECURE_WALLET_KEY = 'secure_wallet_data_v1';  // 秘密鍵用

const rnBiometrics = new ReactNativeBiometrics();


// ==========================================
// ユーティリティ関数 (Utils)
// ==========================================

const shortenAddress = (addr: string) => {
  if (!addr) return '';
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
};

// 型定義
interface Asset {
  mint: string;
  symbol: string;
  name: string;
  amount: number;
  decimals: number;
  price?: number;
  value?: number;
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

const NavButton = ({ icon: Icon, label, active, onPress }: any) => (
  <TouchableOpacity onPress={onPress} style={styles.navBtn}>
    <Icon size={24} color={active ? '#a855f7' : '#666'} />
    <Text style={[styles.navText, active && {color:'#a855f7'}]}>{label}</Text>
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
    console.log("🛠️ API KEY CHECK:", JUPITER_API_KEY);
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
  //  Alert.alert("API Key Check", `Key is: ${JUPITER_API_KEY}`); // API Keyが読み込まれたか確認
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

// トークンリストの取得 (Jupiter / GitHub)
const fetchTokens = useCallback(async () => {
  try {
    console.log('[TOKEN] fetching token list...');

    const res = await fetch(JUPITER_TOKEN_LIST_API, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RamyaWallet/1.0',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP status ${res.status}`);
    }

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid token list format');
    }

    // token list
    setTokenList(data);

    // map 化（超重要）
    const map = new Map<string, any>();
    data.forEach(t => {
      if (t?.address) {
        map.set(t.address, t);
      }
    });
    setTokenMap(map);

    console.log(`[TOKEN] fetched ${data.length} tokens`);

  } catch (e) {
    console.log('[TOKEN] fetch failed, fallback to DEFAULT_TOKENS', e);

    // fallback
    setTokenList(DEFAULT_TOKENS);

    const fallbackMap = new Map<string, any>();
    DEFAULT_TOKENS.forEach(t => {
      if (t?.address) {
        fallbackMap.set(t.address, t);
      }
    });
    setTokenMap(fallbackMap);
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
    // 一度に取得できる数に制限があるため最大30件
    const ids = mintsToFetchPrice.slice(0, 30).join(',');

const priceRes = await fetch(
  `${JUPITER_PRICE_API}?ids=${ids}&vsToken=USDC&showExtraInfo=true`,
  {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'RamyaWallet/1.0.5',
      'x-api-key': JUPITER_API_KEY
    },
  }
);

    if (!priceRes.ok) {
      throw new Error(`Price API error ${priceRes.status}`);
    }

    const priceData = await priceRes.json();
    console.log('[PRICE]', priceData);
    if (priceData?.data) {
      let total = 0;

      tempAssets.forEach(asset => {
        const priceInfo = priceData.data[asset.mint];

        if (priceInfo && priceInfo.price != null) {
          asset.price = Number(priceInfo.price);
          asset.value = asset.amount * asset.price;
          total += asset.value;
        } else {
    asset.price = undefined;
    asset.value = undefined; // or 0
        }
      });

      setTotalValue(total);
    }
  } catch (e) {
    console.log("Price fetch failed", e);
  }
}


      // 価値順にソート
      tempAssets.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
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
          setBiometrics={(enabled: boolean) => {
            setBiometricsEnabled(enabled);
            saveWalletData(wallet, pin, enabled, network);
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

// メイン画面（タブ管理 + 子画面への遷移管理）
const MainScreen = ({ t, activeTab, setActiveTab, onNavigate, onLogout, onRetryFetchTokens, contacts,wallet, ...props }: any) => {
  return (
    <View style={{flex:1}}>
      <View style={{flex:1}}>
        {activeTab === 'home' && (
          <DashboardScreen 
             t={t}
             onNav={setActiveTab} 
             onNavigate={onNavigate} 
             wallet={wallet}
             {...props} 
          />
        )}
        {activeTab === 'swap' && <SwapScreen t={t} {...props} onRetryFetch={onRetryFetchTokens} />} 
        {activeTab === 'history' && (
          <HistoryScreen 
            t={t} 
            connection={props.connection} 
            address={wallet?.address} 
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
