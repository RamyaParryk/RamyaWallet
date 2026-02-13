import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
(global as any).Buffer = Buffer;

import React, { useEffect, useCallback, useMemo } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StatusBar, BackHandler } from 'react-native';
import { Wallet, RefreshCw, Settings, History } from 'lucide-react-native';

import { Keypair } from '@solana/web3.js';
import 'text-encoding-polyfill';

import { generateMnemonic, mnemonicToSeedSync } from 'bip39';
import { derivePath } from 'ed25519-hd-key';

import { useTranslation } from './src/constants/translations';
import { styles } from './src/styles/globalStyles';

import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { SwapScreen } from './src/screens/SwapScreen';
import { ReceiveScreen, SendScreen } from './src/screens/TransferScreens';
import { StakingScreen } from './src/screens/StakingScreen';
import { AddressBookScreen } from './src/screens/AddressBookScreen';

import { wait } from './src/utils/solanaUtils';
import {
  SplashScreen,
  WelcomeScreen,
  ImportWalletScreen,
  LoadingScreen,
  CreateWalletScreen,
} from './src/screens/OnboardingScreens';
import { UnlockScreen, PinSetupScreen } from './src/screens/AuthScreens';
import {
  SecuritySettingsScreen,
  NetworkSettingsScreen,
  HelpScreen,
  AboutScreen,
  LanguageScreen,
} from './src/screens/SettingsDetailScreens';

import { ConfirmModal } from './src/components/ActionModals';

// ✅ Zustand Stores
import { useUIStore } from './src/state/uiStore';
import { useSettingsStore } from './src/state/settingsStore';
import { useWalletStore } from './src/state/walletStore';
import { useAssetStore } from './src/state/assetStore';
import { useContactsStore } from './src/state/contactsStore';
import { useConnectionStore } from './src/state/connectionStore';

// ✅ Storage facade
import * as secureStorage from './src/storage/secureStorage';

// ✅ Services
import { refreshAssetsService } from './src/services/refreshAssets';

// Token list / metadata
import { fetchTokenList, warmupNetwork, fetchOnChainMetadata } from './src/services/jupiterService';

const NavButton = ({
  icon: Icon,
  label,
  active,
  onPress,
}: {
  icon: any;
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity onPress={onPress} style={styles.navBtn}>
    <Icon size={24} color={active ? '#a855f7' : '#666'} />
    <Text style={[styles.navText, active && { color: '#a855f7' }]}>{label}</Text>
  </TouchableOpacity>
);

export default function App() {
  // -------------------------
  // UI store
  // -------------------------
  const currentScreen = useUIStore((s) => s.currentScreen);
  const setScreen = useUIStore((s) => s.setScreen);

  const activeTab = useUIStore((s) => s.activeTab);
  const setTab = useUIStore((s) => s.setTab);

  const notification = useUIStore((s) => s.notification);
  const showNotification = useUIStore((s) => s.showNotification);

  const logoutConfirm = useUIStore((s) => s.logoutConfirm);
  const openLogoutConfirm = useUIStore((s) => s.openLogoutConfirm);
  const closeLogoutConfirm = useUIStore((s) => s.closeLogoutConfirm);

  // -------------------------
  // Settings store
  // -------------------------
  const network = useSettingsStore((s) => s.network);
  const setNetwork = useSettingsStore((s) => s.setNetwork);

  const rpcEndpoint = useSettingsStore((s) => s.rpcEndpoint);
  const setRpcEndpoint = useSettingsStore((s) => s.setRpcEndpoint);

  const biometricsEnabled = useSettingsStore((s) => s.biometricsEnabled);
  const setBiometricsEnabled = useSettingsStore((s) => s.setBiometricsEnabled);

  const pin = useSettingsStore((s) => s.pin);
  const setPin = useSettingsStore((s) => s.setPin);

  const pendingBioEnable = useSettingsStore((s) => s.pendingBioEnable);
  const setPendingBioEnable = useSettingsStore((s) => s.setPendingBioEnable);

  const lang = useSettingsStore((s) => s.lang);
  const setLang = useSettingsStore((s) => s.setLang);

  const resetAuth = useSettingsStore((s) => s.resetAuth);

  // -------------------------
  // Wallet store
  // -------------------------
  const wallet = useWalletStore((s) => s.wallet);
  const setWallet = useWalletStore((s) => s.setWallet);
  const resetWallet = useWalletStore((s) => s.resetWallet);

  // -------------------------
  // Asset store
  // -------------------------
  const assets = useAssetStore((s) => s.assets);
  const setAssets = useAssetStore((s) => s.setAssets);

  const totalValue = useAssetStore((s) => s.totalValue);
  const setTotalValue = useAssetStore((s) => s.setTotalValue);

  const tokenMap = useAssetStore((s) => s.tokenMap);
  const setTokenMap = useAssetStore((s) => s.setTokenMap);

  const tokenList = useAssetStore((s) => s.tokenList);
  const setTokenList = useAssetStore((s) => s.setTokenList);

  const resetAssetAll = useAssetStore((s) => s.resetAll);

  // -------------------------
  // Contacts store
  // -------------------------
  const contacts = useContactsStore((s) => s.contacts);
  const setContacts = useContactsStore((s) => s.setContacts);
  const resetContacts = useContactsStore((s) => s.resetContacts);

  // -------------------------
  // Connection store
  // -------------------------
  const connection = useConnectionStore((s) => s.connection);
  // あなたの connectionStore の関数名に合わせてる（initFromSettings）
  const initConnection = useConnectionStore((s: any) => s.initFromSettings ?? s.init);
  const rebuildConnection = useConnectionStore((s) => s.rebuild);

  const t = useTranslation(lang);

  // -------------------------
  // Android Back handling
  // -------------------------
  useEffect(() => {
    const backAction = () => {
      const subScreens = [
        'settings_security',
        'settings_network',
        'settings_help',
        'settings_about',
        'settings_lang',
        'pin_setup',
        'import',
        'address_book',
        'stake',
        'receive',
        'send',
      ];

      if ((currentScreen as string).startsWith('settings_') || subScreens.includes(currentScreen as any)) {
        if (currentScreen === 'import') setScreen('welcome');
        else setScreen('main');
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentScreen, setScreen]);

  // -------------------------
  // Token list fetch
  // -------------------------
  const fetchTokens = useCallback(async () => {
    console.log('[APP] 内包リストのロードを開始します...');
    try {
      const tokens = await fetchTokenList();
      if (tokens && tokens.length > 0) {
        const seen = new Set<string>();
        const uniqueTokens = tokens.filter((tok: any) => {
          const addr = tok.address || tok.mint;
          if (!addr || seen.has(addr)) return false;
          seen.add(addr);
          return true;
        });

        console.log(`[APP] ✅ リスト取得完了: ${uniqueTokens.length} tokens`);

        const updatedTokens = await Promise.all(
          uniqueTokens.map(async (tok: any) => {
            if (!tok.logoURI || tok.logoURI === '') {
              try {
                const meta = await fetchOnChainMetadata(tok.address || tok.mint);
                if (meta?.logoURI) return { ...tok, logoURI: meta.logoURI };
              } catch {}
            }
            return tok;
          })
        );

        setTokenList(updatedTokens);

        const map = new Map<string, any>();
        updatedTokens.forEach((tok: any) => {
          const key = tok.address || tok.mint;
          if (key) map.set(key, tok);
        });
        setTokenMap(map);

        console.log(`[APP] ✨ TokenMap作成完了 (Size: ${map.size})`);
      } else {
        console.log('[APP] ⚠️ トークンリストが空です');
      }
    } catch (e) {
      console.log('[APP] fetchTokens error:', e);
    }
  }, [setTokenList, setTokenMap]);

  // -------------------------
  // Initialize
  // -------------------------
  useEffect(() => {
    const initializeApp = async () => {
      await wait(1000);

      try {
        const { settings, contacts, language, wallet } = await secureStorage.loadAll();

        if (contacts) setContacts(contacts);
        if (language) setLang(language);

        if (wallet) setWallet(wallet);

        if (settings) {
          if (typeof settings.pin !== 'undefined') setPin(settings.pin ?? null);
          if (typeof settings.biometricsEnabled !== 'undefined') setBiometricsEnabled(!!settings.biometricsEnabled);
          if (settings.network) setNetwork(settings.network as any);
        }
      } catch (e) {
        console.log('Load error:', e);
      }

      console.log('[APP] 🚀 初期化プロセス: warmup...');
      try {
        await warmupNetwork();
      } catch {}

      await fetchTokens();

      const hasWallet = !!useWalletStore.getState().wallet;
      const storedPin = useSettingsStore.getState().pin;

      if (hasWallet) {
        if (storedPin) setScreen('unlock');
        else setScreen('main');
      } else {
        setScreen('welcome');
      }

      // Connection初期化（settings反映後）
      try {
        initConnection?.();
      } catch {}
    };

    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTokens]);

  // -------------------------
  // Connection rebuild on network change
  // -------------------------
  useEffect(() => {
    rebuildConnection({ network });
  }, [network, rebuildConnection]);

  // -------------------------
  // Save helpers
  // -------------------------
  const persistSettings = useCallback(
    async (overrides?: Partial<{ pin: string | null; biometricsEnabled: boolean; network: any }>) => {
      const next = {
        pin: overrides?.pin ?? useSettingsStore.getState().pin,
        biometricsEnabled:
          typeof overrides?.biometricsEnabled === 'boolean'
            ? overrides!.biometricsEnabled
            : useSettingsStore.getState().biometricsEnabled,
        network: overrides?.network ?? useSettingsStore.getState().network,
      };
      try {
        await secureStorage.saveSettings(next as any);
      } catch (e) {
        console.log('Save settings error:', e);
      }
    },
    []
  );

  const persistWallet = useCallback(async (w: any) => {
    try {
      await secureStorage.saveWallet(w);
    } catch (e) {
      console.log('Save wallet error:', e);
    }
  }, []);

  const saveContacts = useCallback(
    async (newContacts: any[]) => {
      setContacts(newContacts);
      try {
        await secureStorage.saveContacts(newContacts);
      } catch {}
    },
    [setContacts]
  );

  const changeLanguage = useCallback(
    async (newLang: string) => {
      setLang(newLang);
      try {
        await secureStorage.saveLanguage(newLang);
      } catch {}
      setScreen('main');
    },
    [setLang, setScreen]
  );

  // -------------------------
  // Logout
  // -------------------------
  const handleLogout = useCallback(() => {
    openLogoutConfirm();
  }, [openLogoutConfirm]);

  const executeLogout = useCallback(async () => {
    try {
      await secureStorage.clearWalletAndSettings();

      resetWallet();
      resetAuth();
      resetContacts();
      resetAssetAll();

      setScreen('welcome');
      closeLogoutConfirm();
    } catch (e) {
      console.log(e);
    }
  }, [closeLogoutConfirm, resetAssetAll, resetAuth, resetContacts, resetWallet, setScreen]);

  // -------------------------
  // Refresh assets (service)
  // -------------------------
  const refreshAssets = useCallback(async () => {
    const w = useWalletStore.getState().wallet;
    if (!w || !connection) return;

    try {
      const { assets: nextAssets, totalValue: nextTotal } = await refreshAssetsService({
        connection,
        walletAddress: w.address,
        tokenMap: useAssetStore.getState().tokenMap,
        onTokenMapUpdate: (m: Map<string, any>) => setTokenMap(m),
      });

      setAssets(nextAssets);
      setTotalValue(nextTotal);
    } catch (e) {
      console.error('[REFRESH] エラー:', e);
    }
  }, [connection, setAssets, setTokenMap, setTotalValue]);

  useEffect(() => {
    if (wallet && connection) refreshAssets();
  }, [wallet, connection, refreshAssets]);

  // -------------------------
  // PIN set
  // -------------------------
  const handlePinSet = useCallback(
    async (newPin: string) => {
      setPin(newPin);
      await persistSettings({ pin: newPin });
      showNotification(t('pin_setup'));

      if (pendingBioEnable) {
        setBiometricsEnabled(true);
        setPendingBioEnable(false);
        await persistSettings({ pin: newPin, biometricsEnabled: true });
        showNotification(t('biometrics') + ' ON');
      }

      setScreen('settings_security');
    },
    [
      pendingBioEnable,
      persistSettings,
      setBiometricsEnabled,
      setPendingBioEnable,
      setPin,
      setScreen,
      showNotification,
      t,
    ]
  );

  // -------------------------
  // Wallet import/create
  // -------------------------
  const generateWalletFromMnemonic = useCallback(
    async (mnemonicInput: string) => {
      try {
        const seed = mnemonicToSeedSync(mnemonicInput);
        const path = "m/44'/501'/0'/0'";
        const derivedSeed = derivePath(path, seed.toString('hex')).key;
        const keypair = Keypair.fromSeed(derivedSeed);

        const newWallet = {
          address: keypair.publicKey.toBase58(),
          secretKey: keypair.secretKey,
          mnemonic: mnemonicInput,
        };

        setWallet(newWallet as any);
        setPin(null);
        setBiometricsEnabled(false);
        setPendingBioEnable(false);

        await persistWallet(newWallet);
        await persistSettings({ pin: null, biometricsEnabled: false, network: 'mainnet-beta' });

        setScreen('main');
        showNotification(t('wallet_restored'));
        return true;
      } catch (e) {
        console.error(e);
        showNotification(t('error'));
        return false;
      }
    },
    [
      persistSettings,
      persistWallet,
      setBiometricsEnabled,
      setPendingBioEnable,
      setPin,
      setScreen,
      setWallet,
      showNotification,
      t,
    ]
  );

  const createWallet = useCallback(async () => {
    await wait(500);

    try {
      const mnemonic = generateMnemonic(128);
      const seed = mnemonicToSeedSync(mnemonic);
      const path = "m/44'/501'/0'/0'";
      const derivedSeed = derivePath(path, seed.toString('hex')).key;
      const keypair = Keypair.fromSeed(derivedSeed);

      const newWallet = {
        address: keypair.publicKey.toBase58(),
        secretKey: keypair.secretKey,
        mnemonic,
      };

      setWallet(newWallet as any);
      setScreen('create');
    } catch (e) {
      showNotification(t('create_error'));
      setScreen('welcome');
    }
  }, [setScreen, setWallet, showNotification, t]);

  // -------------------------
  // Render
  // -------------------------
  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen />;

      case 'welcome':
        return <WelcomeScreen t={t} onStart={() => setScreen('loading')} onImport={() => setScreen('import')} />;

      case 'loading':
        return <LoadingScreen t={t} onFinish={createWallet} />;

      case 'create':
        return (
          <CreateWalletScreen
            t={t}
            wallet={wallet}
            onConfirm={async () => {
              if (wallet) await persistWallet(wallet);
              await persistSettings({ pin: null, biometricsEnabled: false, network: 'mainnet-beta' });
              setScreen('main');
            }}
          />
        );

      case 'import':
        return <ImportWalletScreen t={t} onBack={() => setScreen('welcome')} onImport={generateWalletFromMnemonic} />;

      case 'unlock':
        return (
          <UnlockScreen
            t={t}
            correctPin={pin}
            biometricsEnabled={biometricsEnabled}
            onUnlock={() => setScreen('main')}
            onLogout={handleLogout}
          />
        );

      case 'main':
        return (
          <MainScreen
            t={t}
            activeTab={activeTab}
            setActiveTab={setTab}
            wallet={wallet}
            assets={assets}
            totalValue={totalValue}
            onRefresh={refreshAssets}
            tokenList={tokenList}
            network={network}
            connection={connection}
            onRetryFetchTokens={fetchTokens}
            notify={showNotification}
            onNavigate={setScreen}
            onLogout={handleLogout}
            contacts={contacts}
          />
        );

      case 'receive':
        return <ReceiveScreen t={t} wallet={wallet} onBack={() => setScreen('main')} notify={showNotification} />;

      case 'send':
        return (
          <SendScreen
            t={t}
            wallet={wallet}
            connection={connection}
            contacts={contacts}
            onBack={() => setScreen('main')}
            notify={showNotification}
          />
        );

      case 'history':
        return <HistoryScreen t={t} connection={connection} address={wallet?.address} onBack={() => setScreen('main')} />;

      case 'stake':
        return (
          <StakingScreen
            t={t}
            wallet={wallet}
            connection={connection}
            notify={showNotification}
            onBack={() => setScreen('main')}
            solBalance={assets.find((a: any) => a.symbol === 'SOL')?.amount || 0}
          />
        );

      case 'settings_security':
        return (
          <SecuritySettingsScreen
            t={t}
            wallet={wallet}
            biometrics={biometricsEnabled}
            setBiometrics={async (en: boolean) => {
              setBiometricsEnabled(en);
              await persistSettings({ biometricsEnabled: en });
            }}
            hasPin={!!pin}
            onSetupPin={() => {
              setPendingBioEnable(false);
              setScreen('pin_setup');
            }}
            onBack={() => setScreen('main')}
          />
        );

      case 'address_book':
        return (
          <AddressBookScreen
            t={t}
            contacts={contacts}
            onSave={saveContacts}
            notify={showNotification}
            onBack={() => setScreen('main')}
          />
        );

      case 'settings_help':
        return <HelpScreen t={t} onBack={() => setScreen('main')} />;

      case 'settings_about':
        return <AboutScreen t={t} onBack={() => setScreen('main')} />;

      case 'settings_lang':
        return <LanguageScreen onBack={() => setScreen('main')} onChange={changeLanguage} currentLang={lang} />;

      case 'pin_setup':
        return (
          <PinSetupScreen
            t={t}
            onSuccess={handlePinSet}
            onCancel={() => {
              setPendingBioEnable(false);
              setScreen('settings_security');
            }}
          />
        );

      case 'settings_network':
        return (
          <NetworkSettingsScreen
            t={t}
            currentNetwork={network}
            setNetwork={async (net: any) => {
              setNetwork(net);
              await persistSettings({ network: net });
            }}
            currentRpc={rpcEndpoint}
            setRpc={setRpcEndpoint}
            onBack={() => setScreen('main')}
          />
        );

      default:
        return null;
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

      <ConfirmModal
        visible={logoutConfirm}
        title={t('logout_confirm_title')}
        message={t('logout_confirm_desc')}
        cancelText={t('cancel')}
        confirmText={t('delete')}
        onCancel={closeLogoutConfirm}
        onConfirm={executeLogout}
      />
    </SafeAreaView>
  );
}

const MainScreen = ({
  t,
  activeTab,
  setActiveTab,
  onNavigate,
  onLogout,
  onRetryFetchTokens,
  wallet,
  connection,
  assets,
  ...props
}: any) => {
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
          <DashboardScreen t={t} onNav={setActiveTab} onNavigate={onNavigate} wallet={wallet} assets={assets} {...props} />
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
          <HistoryScreen t={t} connection={connection} address={wallet?.address} onBack={() => setActiveTab('home')} />
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
