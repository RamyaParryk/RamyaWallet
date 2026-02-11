import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Alert,
  BackHandler
} from 'react-native';
import {
  Wallet,
  RefreshCw,
  Settings,
  History
} from 'lucide-react-native';

import {
  Keypair,
  Connection,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  PublicKey
} from '@solana/web3.js';
import 'text-encoding-polyfill';

import {
  TOKEN_PROGRAM_ID,
  SOL_MINT,
  MAINNET_RPC_URL
} from './src/constants/config';

import { generateMnemonic, mnemonicToSeedSync } from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import { useTranslation } from './src/constants/translations';
import { styles } from './src/styles/globalStyles';

import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { SwapScreen } from './src/screens/SwapScreen';
import { ReceiveScreen, SendScreen } from './src/screens/TransferScreens';
import { StakingScreen } from './src/screens/StakingScreen';
import { AddressBookScreen } from './src/screens/AddressBookScreen';
import { wait, shortenAddress } from './src/utils/solanaUtils';
import {
  SplashScreen, WelcomeScreen, ImportWalletScreen, LoadingScreen, CreateWalletScreen
} from './src/screens/OnboardingScreens';
import { UnlockScreen, PinSetupScreen } from './src/screens/AuthScreens';
import {
  SecuritySettingsScreen, NetworkSettingsScreen, HelpScreen, AboutScreen, LanguageScreen
} from './src/screens/SettingsDetailScreens';

import {
  fetchTokenList,
  fetchPrices,
  warmupNetwork,
  fetchOnChainMetadata
} from './src/utils/jupiterClient';

const STORAGE_KEY = 'my_solana_wallet_settings_v1';
const STORAGE_KEY_CONTACTS = 'my_solana_contacts_v1';
const STORAGE_KEY_LANG = 'my_solana_language_v1';
const SECURE_WALLET_KEY = 'secure_wallet_data_v1';

interface Asset {
  mint: string;
  symbol: string;
  name: string;
  amount: number;
  decimals: number;
  price?: number;
  value?: number;
  logoURI: string;
  status?: 'verified' | 'unknown' | 'suspicious';
}

const NavButton = ({ icon: Icon, label, active, onPress }: any) => (
  <TouchableOpacity onPress={onPress} style={styles.navBtn}>
    <Icon size={24} color={active ? '#a855f7' : '#666'} />
    <Text style={[styles.navText, active && { color: '#a855f7' }]}>{label}</Text>
  </TouchableOpacity>
);

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('splash');
  const [activeTab, setActiveTab] = useState('home');
  const [wallet, setWallet] = useState<any>(null);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [totalValue, setTotalValue] = useState(0);

  const [network, setNetwork] = useState<'mainnet-beta' | 'devnet'>('mainnet-beta');
  const [rpcEndpoint, setRpcEndpoint] = useState('Public');
  const [connection, setConnection] = useState<Connection | null>(null);

  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [pin, setPin] = useState<string | null>(null);
  const [pendingBioEnable, setPendingBioEnable] = useState(false);

  const [contacts, setContacts] = useState<any[]>([]);
  const [tokenMap, setTokenMap] = useState<Map<string, any>>(new Map());
  const [tokenList, setTokenList] = useState<any[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  const [lang, setLang] = useState('ja');
  const t = useTranslation(lang);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // BackHandler logic
  useEffect(() => {
    const backAction = () => {
      const subScreens = [
        'settings_security', 'settings_network', 'settings_help', 'settings_about', 'settings_lang', 'pin_setup', 'import', 'address_book', 'stake',
        'receive', 'send'
      ];
      if (currentScreen.startsWith('settings_') || subScreens.includes(currentScreen)) {
        if (currentScreen === 'import') {
          setCurrentScreen('welcome');
        } else {
          setCurrentScreen('main');
        }
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentScreen]);

  // ★重要変更: fetchTokens を useEffect より「前」に移動して定義
  // これで初期化フローの中から呼び出せるようになります
  const fetchTokens = useCallback(async () => {
    console.log('[APP] 内包リストのロードを開始します...');
    
    // 内包リスト（またはAPI取得）
    const tokens = await fetchTokenList();

    if (tokens && tokens.length > 0) {
      const seen = new Set();
      const uniqueTokens = tokens.filter((t: any) => {
        if (!t.address || seen.has(t.address)) return false;
        seen.add(t.address);
        return true;
      });

      setTokenList(uniqueTokens);
      console.log(`[APP] ✅ リスト取得完了: ${uniqueTokens.length} tokens`);

      // 画像URL補完（Helius）
      // ★ここがポイント: await Promise.all で画像の補完が終わるのを「待つ」
      const updatedTokens = await Promise.all(uniqueTokens.map(async (t: any) => {
        if (!t.logoURI || t.logoURI === "") {
          try {
            const meta = await fetchOnChainMetadata(t.address);
            if (meta && meta.logoURI) {
              return { ...t, logoURI: meta.logoURI };
            }
          } catch (e) { }
        }
        return t;
      }));

      setTokenList(updatedTokens);

      const map = new Map<string, any>();
      updatedTokens.forEach((t: any) => {
        const key = t.address || t.mint;
        if (key) {
          map.set(key, t);
        }
      });
      setTokenMap(map);

      console.log(`[APP] ✨ TokenMap作成完了 (Size: ${map.size})`);
    } else {
      console.log(`[APP] ⚠️ トークンリストが空です`);
    }
  }, []);

  // ★重要変更: アプリ起動フローを一元化
  // ウォレット読み込み → ネットワーク準備 → 画像ロード → 画面遷移 の順で実行
  useEffect(() => {
    const initializeApp = async () => {
      // 1. スプラッシュ表示 (少し長めに待ってもOK)
      await wait(1000); 

      let restoredWallet = null;
      let storedPin = null;

      try {
        // 2. ストレージからデータを読み込む
        const settingsJson = await AsyncStorage.getItem(STORAGE_KEY);
        const contactsValue = await AsyncStorage.getItem(STORAGE_KEY_CONTACTS);
        const langValue = await AsyncStorage.getItem(STORAGE_KEY_LANG);
        const secureJson = await EncryptedStorage.getItem(SECURE_WALLET_KEY);

        if (contactsValue) setContacts(JSON.parse(contactsValue));
        if (langValue) setLang(langValue);

        if (secureJson) {
          const storedWallet = JSON.parse(secureJson);
          restoredWallet = {
            ...storedWallet,
            secretKey: new Uint8Array(Object.values(storedWallet.secretKey))
          };
          setWallet(restoredWallet);

          if (settingsJson) {
            const settings = JSON.parse(settingsJson);
            storedPin = settings.pin;
            setPin(storedPin);
            setBiometricsEnabled(settings.biometricsEnabled);
            setNetwork(settings.network || 'mainnet-beta');
          }
        }
      } catch (e) {
        console.log("Load error:", e);
      }

      // 3. ★ここが核心: 画面遷移する「前に」リストと画像を準備完了にする
      console.log("[APP] 🚀 初期化プロセス: 画像ロード待機中...");
      await warmupNetwork();
      await fetchTokens(); // これが終わるまで次の行には行かない！

      // 4. 準備が整ったら画面遷移
      if (restoredWallet) {
        if (storedPin) setCurrentScreen('unlock');
        else setCurrentScreen('main');
      } else {
        setCurrentScreen('welcome');
      }
    };

    initializeApp();
  }, [fetchTokens]); // fetchTokensが変わらない限り初回のみ実行

  // 保存系ロジック
  const saveWalletData = async (newWallet: any, newPin: any, bio: boolean, net: string) => {
    try {
      if (newWallet) await EncryptedStorage.setItem(SECURE_WALLET_KEY, JSON.stringify(newWallet));
      const settingsToSave = { pin: newPin, biometricsEnabled: bio, network: net };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
    } catch (e) { console.log("Save error:", e); }
  };

  const saveContacts = async (newContacts: any[]) => {
    setContacts(newContacts);
    try { await AsyncStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(newContacts)); } catch (e) { }
  };

  const changeLanguage = async (newLang: string) => {
    setLang(newLang);
    try { await AsyncStorage.setItem(STORAGE_KEY_LANG, newLang); } catch (e) { }
    setCurrentScreen('main');
  };

  const handleLogout = async () => {
    Alert.alert(t('logout_confirm_title'), t('logout_confirm_desc'), [
      { text: t('cancel'), style: "cancel" },
      {
        text: t('delete'), style: "destructive", onPress: async () => {
          try {
            await EncryptedStorage.removeItem(SECURE_WALLET_KEY);
            await AsyncStorage.removeItem(STORAGE_KEY);
            await AsyncStorage.removeItem(STORAGE_KEY_CONTACTS);
            setWallet(null); setPin(null); setBiometricsEnabled(false);
            setContacts([]); setAssets([]);
            setCurrentScreen('welcome');
          } catch (e) { console.log(e); }
        }
      }
    ]);
  };

  // 資産・価格更新ロジック
  const refreshAssets = useCallback(async () => {
    if (!wallet || !connection) return;

    // ガード: 万が一マップが空なら再ロード（基本的には初期化フローで入っているはず）
    let currentMap = tokenMap;
    if (currentMap.size === 0) {
      console.log("[REFRESH] TokenMapが空のため再確認...");
      // 初期化フローで入っているはずだが念のため
      try {
        const list = await fetchTokenList();
        if (list && list.length > 0) {
          const newMap = new Map();
          list.forEach((t: any) => {
            const key = t.address || t.mint;
            if (key) newMap.set(key, t);
          });
          currentMap = newMap;
          setTokenMap(newMap);
        }
      } catch (e) {}
    }

    console.log("-----------------------------------------");
    console.log("[REFRESH] 🔄 資産更新を開始");

    try {
      const pubKey = new PublicKey(wallet.address);
      const tempAssets: Asset[] = [];
      const mintsToFetchPrice: string[] = [];

      // 1. SOL
      const solBalance = await connection.getBalance(pubKey);
      const solInfo = currentMap.get(SOL_MINT);
      const solLogo = solInfo?.logoURI || ""; 

      console.log(`[REFRESH] SOL Balance: ${solBalance / LAMPORTS_PER_SOL}`);

      tempAssets.push({
        mint: SOL_MINT,
        symbol: "SOL",
        name: "Solana",
        amount: solBalance / LAMPORTS_PER_SOL,
        decimals: 9,
        price: 0,
        value: 0,
        logoURI: solLogo,
        status: 'verified'
      });
      mintsToFetchPrice.push(SOL_MINT);

      // 2. SPLトークン
      console.log(`[REFRESH] SPLトークンをスキャン...`);
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
        programId: TOKEN_PROGRAM_ID
      });

      for (const accountInfo of tokenAccounts.value) {
        const info = accountInfo.account.data.parsed.info;
        const mint = info.mint;
        const amount = info.tokenAmount.uiAmount;

        if (amount > 0) {
          const listedToken = currentMap.get(mint);

          let finalName = listedToken?.name || shortenAddress(mint);
          let finalSymbol = listedToken?.symbol || "UNKNOWN";
          let finalDecimals = info.tokenAmount.decimals;
          let finalLogo = listedToken?.logoURI || "";

          // Heliusへの問い合わせ（未知のトークンのみ）
          if (!finalLogo || finalSymbol === "UNKNOWN") {
            const onChain = await fetchOnChainMetadata(mint);
            if (onChain) {
              if (onChain.logoURI && !finalLogo) finalLogo = onChain.logoURI;
              if (finalSymbol === "UNKNOWN" && onChain.symbol) {
                finalSymbol = onChain.symbol;
                finalName = onChain.name;
              }
            }
          }

          const TRUSTED_MINTS = [
            'So11111111111111111111111111111111111111112', 
            'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 
            'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', 
            'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', 
            'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', 
            'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', 
          ];

          const isVerified = listedToken || TRUSTED_MINTS.includes(mint);

          tempAssets.push({
            mint: mint,
            symbol: finalSymbol,
            name: finalName,
            amount: amount,
            decimals: finalDecimals,
            logoURI: finalLogo,
            status: isVerified ? 'verified' : 'unknown',
            price: 0,
            value: 0
          });
          mintsToFetchPrice.push(mint);
        }
      }

      // 3. 価格取得
      if (mintsToFetchPrice.length > 0) {
        const ids = mintsToFetchPrice.slice(0, 50).join(',');
        const priceMap = await fetchPrices(ids);

        if (priceMap) {
          tempAssets.forEach(asset => {
            const info = priceMap[asset.mint];
            if (info?.price) {
              const p = Number(info.price);
              asset.price = p;
              asset.value = asset.amount * p;
            }
          });

          const total = tempAssets.reduce((sum, a) => sum + (a.value || 0), 0);
          console.log(`[REFRESH] 🏆 総資産: $${total}`);
          setTotalValue(total);
        }
      }

      tempAssets.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
      setAssets(tempAssets);

    } catch (e) {
      console.error("[REFRESH] エラー:", e);
    }
  }, [wallet, connection, network, tokenMap]);

  // 初期化 (connectionの確立)
  useEffect(() => {
    let rpcUrl = network === 'mainnet-beta' ? MAINNET_RPC_URL : clusterApiUrl('devnet');
    console.log(`[APP] Using RPC: ${rpcUrl}`);
    const conn = new Connection(rpcUrl, 'confirmed');
    setConnection(conn);
  }, [network]);

  // ウォレット接続時の自動更新
  useEffect(() => {
    if (wallet && connection) {
      refreshAssets();
    }
  }, [connection, wallet, refreshAssets]);

  const handlePinSet = (newPin: string) => {
    setPin(newPin);
    saveWalletData(wallet, newPin, biometricsEnabled, network);
    showNotification(t('pin_setup'));
    if (pendingBioEnable) {
      setBiometricsEnabled(true);
      setPendingBioEnable(false);
      saveWalletData(wallet, newPin, true, network);
      showNotification(t('biometrics') + " ON");
    }
    setCurrentScreen('settings_security');
  };

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
      setPin(null);
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
      showNotification(t('create_error'));
      setCurrentScreen('welcome');
    }
  };

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
      case 'create': return <CreateWalletScreen t={t} wallet={wallet} onConfirm={() => {
        saveWalletData(wallet, null, false, 'mainnet-beta');
        setCurrentScreen('main');
      }} />;
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
          onNavigate={setCurrentScreen}
          onLogout={handleLogout}
          contacts={contacts}
        />
      );
      case 'receive': return <ReceiveScreen t={t} wallet={wallet} onBack={() => setCurrentScreen('main')} notify={showNotification} />;
      case 'send': return <SendScreen t={t} wallet={wallet} connection={connection} contacts={contacts} onBack={() => setCurrentScreen('main')} notify={showNotification} />;
      case 'history': return <HistoryScreen t={t} connection={connection} address={wallet?.address} onBack={() => setCurrentScreen('main')} />;
      case 'stake': return <StakingScreen t={t} wallet={wallet} connection={connection} notify={showNotification} onBack={() => setCurrentScreen('main')} solBalance={assets.find(a => a.symbol === 'SOL')?.amount || 0} />;
      case 'settings_security': return <SecuritySettingsScreen t={t} wallet={wallet} biometrics={biometricsEnabled} setBiometrics={(en: boolean) => { setBiometricsEnabled(en); saveWalletData(wallet, pin, en, network); }} hasPin={!!pin} onSetupPin={() => { setPendingBioEnable(false); setCurrentScreen('pin_setup'); }} onBack={() => setCurrentScreen('main')} />;
      case 'address_book': return <AddressBookScreen t={t} contacts={contacts} onSave={saveContacts} notify={showNotification} onBack={() => setCurrentScreen('main')} />;
      case 'settings_help': return <HelpScreen t={t} onBack={() => setCurrentScreen('main')} />;
      case 'settings_about': return <AboutScreen t={t} onBack={() => setCurrentScreen('main')} />;
      case 'settings_lang': return <LanguageScreen onBack={() => setCurrentScreen('main')} onChange={changeLanguage} currentLang={lang} />;
      case 'pin_setup': return <PinSetupScreen t={t} onSuccess={handlePinSet} onCancel={() => { setPendingBioEnable(false); setCurrentScreen('settings_security'); }} />;
      case 'settings_network': return <NetworkSettingsScreen t={t} currentNetwork={network} setNetwork={(net: any) => { setNetwork(net); saveWalletData(wallet, pin, biometricsEnabled, net); }} currentRpc={rpcEndpoint} setRpc={setRpcEndpoint} onBack={() => setCurrentScreen('main')} />;
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

const MainScreen = ({ t, activeTab, setActiveTab, onNavigate, onLogout, onRetryFetchTokens, contacts, wallet, connection, assets, ...props }: any) => {
  
  const tokenBalances = useMemo(() => {
    const balanceMap: { [key: string]: number } = {};
    assets.forEach((a: any) => {
      balanceMap[a.mint] = a.amount;
    });
    return balanceMap;
  }, [assets]);

  const solBalance = assets.find((a: any) => a.symbol === 'SOL')?.amount || 0;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {activeTab === 'home' && (
          <DashboardScreen
            t={t}
            onNav={setActiveTab}
            onNavigate={onNavigate}
            wallet={wallet}
            assets={assets}
            {...props}
          />
        )}
        {activeTab === 'swap' && (
          <SwapScreen
            t={t}
            wallet={wallet}
            connection={connection}
            tokenList={props.tokenList}
            notify={props.notify}
            onRetryFetch={onRetryFetchTokens}
            solBalance={solBalance}
            tokenBalances={tokenBalances}
          />
        )}
        {activeTab === 'history' && (
          <HistoryScreen
            t={t}
            connection={connection}
            address={wallet?.address}
            onBack={() => setActiveTab('home')}
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