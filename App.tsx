import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
(global as any).Buffer = Buffer;

import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StatusBar, BackHandler, ActivityIndicator, ImageBackground, DeviceEventEmitter, StyleSheet, Alert, PermissionsAndroid, LayoutAnimation, UIManager, Platform } from 'react-native';
import { Wallet, RefreshCw, Settings, History } from 'lucide-react-native';

import { Keypair, PublicKey } from '@solana/web3.js';
import 'text-encoding-polyfill';

import { generateMnemonic, mnemonicToSeedSync } from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SeedVault } from '@solana-mobile/seed-vault-lib';
import AsyncStorage from '@react-native-async-storage/async-storage';
import mobileAds from 'react-native-google-mobile-ads';
import NfcManager from 'react-native-nfc-manager';
import { HCESession, NFCTagType4, NFCTagType4NDEFContentType } from 'react-native-hce';

import { useTranslation } from './src/constants/translations';
import { styles } from './src/styles/globalStyles';
import { SOL_MINT } from './src/constants/config';
import { HeaderRow } from './src/components/HeaderRow';

import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { SwapScreen } from './src/screens/SwapScreen';
import { ReceiveScreen, SendScreen } from './src/screens/TransferScreens';
import { StakingScreen } from './src/screens/StakingScreen';
import { AddressBookScreen } from './src/screens/AddressBookScreen';
import { AssetDetailScreen } from './src/screens/AssetDetailScreen';

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
import { WalletConnectModals } from './src/components/WalletConnectModals';

import { useUIStore } from './src/state/uiStore';
import { useSettingsStore } from './src/state/settingsStore';
import { useWalletStore, WalletData } from './src/state/walletStore';
import { useAssetStore } from './src/state/assetStore';
import { useContactsStore } from './src/state/contactsStore';
import { useConnectionStore } from './src/state/connectionStore';
import { useWalletConnectStore } from './src/state/walletConnectStore';

import { loadTokenListFast, refreshTokenListInBackground } from './src/services/tokenListCache';
import * as secureStorage from './src/storage/secureStorage';
import { refreshAssetsService } from './src/services/refreshAssets';
import { warmupNetwork } from './src/services/jupiterService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const getDeviceLanguage = () => {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const langCode = locale ? locale.substring(0, 2).toLowerCase() : 'en';
    const supportedLangs = ['ja', 'en', 'es', 'pt', 'it', 'de', 'fr', 'ru', 'hi', 'vi', 'th', 'ar', 'fa', 'tr', 'sw', 'zh', 'ko'];
    if (supportedLangs.includes(langCode)) {
      return langCode;
    }
  } catch (error) {
    console.log("Language detection error:", error);
  }
  return 'en';
};

const NavButton = ({ icon: Icon, label, active, onPress }: { icon: any; label: string; active: boolean; onPress: () => void; }) => (
  <TouchableOpacity onPress={onPress} style={styles.navBtn}>
    <Icon size={24} color={active ? '#a855f7' : '#666'} />
    <Text style={[styles.navText, active && { color: '#a855f7' }]}>{label}</Text>
  </TouchableOpacity>
);

const BootLoading = ({ title = 'Loading...' }: { title?: string }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
    <ActivityIndicator color="#a855f7" />
    <Text style={{ marginTop: 12, color: '#aaa' }}>{title}</Text>
  </View>
);

export default function App() {
  useEffect(() => {
    mobileAds().initialize().catch(() => {});
  }, []);

  const currentScreen = useUIStore((s) => s.currentScreen);
  const setScreen = useUIStore((s) => s.setScreen);
  const activeTab = useUIStore((s) => s.activeTab);
  const setTab = useUIStore((s) => s.setTab);
  const notification = useUIStore((s) => s.notification);
  const showNotification = useUIStore((s) => s.showNotification);
  const logoutConfirm = useUIStore((s) => s.logoutConfirm);
  const openLogoutConfirm = useUIStore((s) => s.openLogoutConfirm);
  const closeLogoutConfirm = useUIStore((s) => s.closeLogoutConfirm);

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

  const wallet = useWalletStore((s) => s.wallet);
  const setWallet = useWalletStore((s) => s.setWallet);
  const resetWallet = useWalletStore((s) => s.resetWallet);

  const assets = useAssetStore((s) => s.assets);
  const totalValue = useAssetStore((s) => s.totalValue);
  const setAssets = useAssetStore((s: any) => s.setAssets);
  const setTotalValue = useAssetStore((s: any) => s.setTotalValue);
  const setTokenMap = useAssetStore((s: any) => s.setTokenMap);
  const tokenList = useAssetStore((s) => s.tokenList);
  const setTokenList = useAssetStore((s: any) => s.setTokenList);
  const resetAssetAll = useAssetStore((s) => s.resetAll);

  const contacts = useContactsStore((s) => s.contacts);
  const setContacts = useContactsStore((s) => s.setContacts);
  const resetContacts = useContactsStore((s) => s.resetContacts);

  const connection = useConnectionStore((s) => s.connection);
  const initConnection = useConnectionStore((s: any) => s.initFromSettings ?? s.init);
  const rebuildConnection = useConnectionStore((s: any) => s.rebuild);

  const t = useTranslation(lang);
  const [bootSyncDone, setBootSyncDone] = useState(false);
  const bootSyncStartedRef = useRef(false);

  const [navigationParams, setNavigationParams] = useState<any>({});
  const [skinUri, setSkinUri] = useState<string | null>(null);

  useEffect(() => {
    const loadSkin = async () => {
      try {
        const savedSkin = await AsyncStorage.getItem('wallet_skin');
        if (savedSkin) setSkinUri(savedSkin);
      } catch (e) {}
    };
    loadSkin();

    const subscription = DeviceEventEmitter.addListener('skinChanged', (uri: string) => {
      setSkinUri(uri);
    });
    return () => subscription.remove();
  }, []);

  const animatedSetScreen = useCallback((screen: any) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setScreen(screen);
  }, [setScreen]);

  const handleNavigate = useCallback((screen: any, params?: any) => {
    setNavigationParams(params || {});
    animatedSetScreen(screen);
  }, [animatedSetScreen]);

  useEffect(() => {
    if (currentScreen === 'welcome' || currentScreen === 'import' || currentScreen === 'loading' || currentScreen === 'create') {
      setBootSyncDone(true);
      bootSyncStartedRef.current = false;
    }
  }, [currentScreen]);

  useEffect(() => {
    const backAction = () => {
      const subScreens = ['settings_security', 'settings_network', 'settings_help', 'settings_about', 'settings_lang', 'pin_setup', 'import', 'address_book', 'stake', 'receive', 'send', 'asset-detail', 'swap_standalone'];
      if ((currentScreen as string).startsWith('settings_') || subScreens.includes(currentScreen as any)) {
        if (currentScreen === 'import') animatedSetScreen('welcome');
        else if (currentScreen === 'swap_standalone') animatedSetScreen('asset-detail');
        else animatedSetScreen('main');
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentScreen, animatedSetScreen]);

  const fetchTokens = useCallback(async () => {
    try {
      const fast = await loadTokenListFast({ requireLogo: true });
      setTokenList(fast.tokens);
      const map = new Map<string, any>();
      fast.tokens.forEach((tok: any) => { if (tok.address || tok.mint) map.set(tok.address || tok.mint, tok); });
      setTokenMap(map);

      refreshTokenListInBackground({ requireLogo: true })
        .then((updated) => {
          if (updated?.tokens?.length) {
            setTokenList(updated.tokens);
            const map2 = new Map<string, any>();
            updated.tokens.forEach((tok: any) => { if (tok.address || tok.mint) map2.set(tok.address || tok.mint, tok); });
            setTokenMap(map2);
          }
        })
        .catch(e => console.log("[APP] バックグラウンド更新エラー", e));

    } catch (e) { 
      console.log('[APP] fetchTokens error:', e);
    }
  }, [setTokenList, setTokenMap]);

  useEffect(() => {
    const initializeApp = async () => {
      await wait(400);
      try {
            await NfcManager.start();
          } catch (e) {
            console.log('NfcManager start error:', e);
          }
      try {
        const session = await HCESession.getInstance();
        const dummyTag = new NFCTagType4({
          type: NFCTagType4NDEFContentType.URL, 
          content: 'https://init',
          writable: false,
        });
        await session.setApplication(dummyTag); 
        await session.setEnabled(false); 
      } catch (e) {
        console.log('HCE Init error:', e);
      }
      try {
        const { settings, contacts, language, wallet } = await secureStorage.loadAll();
        if (contacts) setContacts(contacts);
        
        const deviceLang = getDeviceLanguage();
        if (language) {
          setLang(language);
        } else {
          setLang(deviceLang);
          await secureStorage.saveLanguage(deviceLang);
        }

        if (wallet) setWallet(wallet);
        if (settings) {
          if (typeof settings.pin !== 'undefined') setPin(settings.pin ?? null);
          if (typeof settings.biometricsEnabled !== 'undefined') setBiometricsEnabled(!!settings.biometricsEnabled);
          if (settings.network) setNetwork(settings.network as any);
        }
      } catch (e) { }
      
      try { await warmupNetwork(); } catch {}
      await fetchTokens();
      try { initConnection?.(); } catch {}

      useWalletConnectStore.getState().initWalletConnect();

      const hasWallet = !!useWalletStore.getState().wallet;
      const storedPin = useSettingsStore.getState().pin;
      if (hasWallet) {
        setBootSyncDone(false);
        bootSyncStartedRef.current = false;
        if (storedPin) setScreen('unlock');
        else setScreen('main');
      } else {
        setBootSyncDone(true);
        setScreen('welcome');
      }
    };
    initializeApp();
  }, [fetchTokens, setScreen]);

  useEffect(() => { rebuildConnection?.({ network }); }, [network, rebuildConnection]);

  const persistSettings = useCallback(async (overrides?: Partial<{ pin: string | null; biometricsEnabled: boolean; network: any }>) => {
    const next = {
      pin: overrides?.pin ?? useSettingsStore.getState().pin,
      biometricsEnabled: typeof overrides?.biometricsEnabled === 'boolean' ? overrides!.biometricsEnabled : useSettingsStore.getState().biometricsEnabled,
      network: overrides?.network ?? useSettingsStore.getState().network,
    };
    try { await secureStorage.saveSettings(next as any); } catch (e) {}
  }, []);

  const persistWallet = useCallback(async (w: any) => { try { await secureStorage.saveWallet(w); } catch (e) {} }, []);
  const saveContacts = useCallback(async (newContacts: any[]) => { setContacts(newContacts); try { await secureStorage.saveContacts(newContacts); } catch {} }, [setContacts]);
  const changeLanguage = useCallback(async (newLang: string) => { setLang(newLang); try { await secureStorage.saveLanguage(newLang); } catch {} animatedSetScreen('main'); }, [setLang, animatedSetScreen]);
  const handleLogout = useCallback(() => { openLogoutConfirm(); }, [openLogoutConfirm]);

  const executeLogout = useCallback(async () => {
    try {
      await secureStorage.clearWalletAndSettings();
      resetWallet(); resetAuth(); resetContacts(); resetAssetAll();
      setBootSyncDone(true); bootSyncStartedRef.current = false;
      animatedSetScreen('welcome'); closeLogoutConfirm();
    } catch (e) {}
  }, [closeLogoutConfirm, resetAssetAll, resetAuth, resetContacts, resetWallet, animatedSetScreen]);

  const refreshAssets = useCallback(async (force?: boolean) => {
    try { await refreshAssetsService({ force: !!force }); } catch (e) {}
  }, []);

  useEffect(() => {
    if (currentScreen !== 'main') return;
    if (bootSyncDone) return;
    const tick = async () => {
      if (bootSyncStartedRef.current) return;
      const w = useWalletStore.getState().wallet;
      const c = useConnectionStore.getState().connection;
      if (!w || !c) return;
      bootSyncStartedRef.current = true;
      try {
        await refreshAssets(true);
        setBootSyncDone(true);
      } catch (e) { bootSyncStartedRef.current = false; }
    };
    const id = setInterval(tick, 350);
    tick();
    return () => clearInterval(id);
  }, [currentScreen, bootSyncDone, refreshAssets]);

  const handlePinSet = useCallback(async (newPin: string) => {
    setPin(newPin); await persistSettings({ pin: newPin }); showNotification(t('pin_setup'));
    if (pendingBioEnable) { setBiometricsEnabled(true); setPendingBioEnable(false); await persistSettings({ pin: newPin, biometricsEnabled: true }); showNotification(t('biometrics') + ' ON'); }
    animatedSetScreen('settings_security');
  }, [pendingBioEnable, persistSettings, setBiometricsEnabled, setPendingBioEnable, setPin, animatedSetScreen, showNotification, t]);

  const generateWalletFromMnemonic = useCallback(async (mnemonicInput: string) => {
    try {
      const seed = mnemonicToSeedSync(mnemonicInput);
      const path = "m/44'/501'/0'/0'";
      const derivedSeed = derivePath(path, seed.toString('hex')).key;
      const keypair = Keypair.fromSeed(derivedSeed);
      const newWallet: WalletData = { 
        address: keypair.publicKey.toBase58(), 
        secretKey: keypair.secretKey, 
        mnemonic: mnemonicInput,
        walletType: 'local'
      };
      setWallet(newWallet); setPin(null); setBiometricsEnabled(false); setPendingBioEnable(false);
      await persistWallet(newWallet); await persistSettings({ pin: null, biometricsEnabled: false, network: 'mainnet-beta' });
      setBootSyncDone(false); bootSyncStartedRef.current = false;
      animatedSetScreen('main'); showNotification(t('wallet_restored')); return true;
    } catch (e) { showNotification(t('error') || 'Error'); return false; }
  }, [persistSettings, persistWallet, setBiometricsEnabled, setPendingBioEnable, setPin, animatedSetScreen, setWallet, showNotification, t]);

  const createWallet = useCallback(async () => {
    await wait(300);
    try {
      const mnemonic = generateMnemonic(128);
      const seed = mnemonicToSeedSync(mnemonic);
      const path = "m/44'/501'/0'/0'";
      const derivedSeed = derivePath(path, seed.toString('hex')).key;
      const keypair = Keypair.fromSeed(derivedSeed);
      const newWallet: WalletData = { 
        address: keypair.publicKey.toBase58(), 
        secretKey: keypair.secretKey, 
        mnemonic,
        walletType: 'local'
      };
      setWallet(newWallet); animatedSetScreen('create');
    } catch (e) { showNotification(t('create_error') || 'Error'); animatedSetScreen('welcome'); }
  }, [animatedSetScreen, setWallet, showNotification, t]);

const createWalletWithSeedVault = useCallback(async () => {
    const SV: any = SeedVault;
    const toBase58PublicKey = (value: any): string => {
      if (!value) return '';
      const raw = value.publicKeyEncoded ?? value.publicKey ?? value.address ?? value;
      if (typeof raw === 'string') {
        try { return new PublicKey(raw).toBase58(); } catch { return new PublicKey(Buffer.from(raw, 'base64')).toBase58(); }
      }
      if (raw instanceof Uint8Array) return new PublicKey(raw).toBase58();
      if (raw instanceof ArrayBuffer) return new PublicKey(new Uint8Array(raw)).toBase58();
      if (Array.isArray(raw)) return new PublicKey(Uint8Array.from(raw)).toBase58();
      if (typeof raw === 'object') {
        console.error('[SeedVault] Unsupported public key format:', JSON.stringify(raw));
        throw new Error('Unsupported Seed Vault public key format');
      }
      return '';
    };
    const getAuthToken = (seed: any): number | string | null => {
      const token = seed?.authToken ?? seed?.auth_token ?? seed?.authorizationToken ?? seed;
      if (typeof token === 'number' || typeof token === 'string') return token;
      return null;
    };
    try {
      const available = await SeedVault.isSeedVaultAvailable(false);
      if (!available) throw new Error('Seed Vault is not available on this device.');
      const granted = await PermissionsAndroid.request('com.solanamobile.seedvault.ACCESS_SEED_VAULT' as any);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert(t('error') || 'Error', t('seed_vault_permission_denied') || 'Seed Vault permission denied.');
        return;
      }
      let authResponse: any = null;
      if (typeof SV.getAuthorizedSeeds === 'function') {
        const seeds = await SV.getAuthorizedSeeds();
        if (seeds && seeds.length > 0) authResponse = seeds[0];
      }
      if (!authResponse) {
        if (typeof SV.authorizeNewSeed === 'function') authResponse = await SV.authorizeNewSeed();
        else if (typeof SV.authorizeSeed === 'function') authResponse = await SV.authorizeSeed();
        else throw new Error('No method available to trigger Seed Vault authorization UI.');
      }
      const authToken = getAuthToken(authResponse);
      if (authToken === null) throw new Error('Seed Vault auth token not found.');
      await wait(500); 
      let accounts: any[] = [];
      if (authResponse?.accounts && authResponse.accounts.length > 0) {
        accounts = authResponse.accounts;
      }
      if (!accounts || accounts.length === 0) {
        if (typeof SV.getUserWallets === 'function') {
          try { accounts = await SV.getUserWallets(authToken.toString()); } catch(e){}
        }
      }
      if (!accounts || accounts.length === 0) {
        if (typeof SV.getAccounts === 'function') {
          try { accounts = await SV.getAccounts(authToken.toString(), '', ''); } catch(e){}
        }
      }
      if (!accounts || accounts.length === 0) {
        throw new Error('No Seed Vault wallet accounts found. Could not retrieve account list.');
      }
      const account = accounts[0];
      console.log('[SeedVault] Raw account from Seed Vault:', JSON.stringify(account));
  
      const publicKeyStr = toBase58PublicKey(account);
      if (!publicKeyStr) throw new Error('Could not parse Seed Vault public key from account.');

      let dPath = account.derivation_path ?? account.derivationPath ?? account.resolvedDerivationPath;

      if (!dPath) {
        const purpose = account.purpose ?? 44;
        const coinType = account.coin_type ?? account.coinType ?? 501;
        const accIndex = account.account ?? 0;
        const role = account.role;
        if (role !== undefined) {
           dPath = `bip32:/m/${purpose}'/${coinType}'/${accIndex}'/${role}'`;
        } else {
           dPath = `bip32:/m/${purpose}'/${coinType}'/${accIndex}'`;
        }
      } else {
        if (dPath.startsWith("m/")) dPath = `bip32:/${dPath}`;
        else if (dPath.startsWith("bip44:")) dPath = dPath.replace("bip44:", "bip32:/m/44'/");
      }
      console.log(`[SeedVault] Created Wallet: ${publicKeyStr} with Exact Path: ${dPath}`);
      const newWallet: WalletData = {
        address: publicKeyStr,
        walletType: 'seed-vault',
        authToken: authToken.toString(),
        derivationPath: dPath, 
      };
      setWallet(newWallet as any);
      await persistWallet(newWallet);
      await persistSettings({ pin: null, biometricsEnabled: true, network: 'mainnet-beta' });
      setBootSyncDone(false);
      bootSyncStartedRef.current = false;
      animatedSetScreen('main');
      showNotification(t('seed_vault_connected') || 'Seed Vault connected 🛡️');
    } catch (e: any) {
      console.log('Seed Vault Error:', e);
      Alert.alert(t('error') || 'Error', e?.message || String(e));
    }
  }, [animatedSetScreen, setWallet, persistWallet, persistSettings, showNotification, t]);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash': return <SplashScreen />;
      case 'welcome': 
        return <WelcomeScreen t={t} onStart={() => animatedSetScreen('loading')} onImport={() => animatedSetScreen('import')} onStartSeedVault={createWalletWithSeedVault} />;
      case 'loading': return <LoadingScreen t={t} onFinish={createWallet} />;
      case 'create': return <CreateWalletScreen t={t} wallet={wallet} onConfirm={async () => { if (wallet) await persistWallet(wallet); await persistSettings({ pin: null, biometricsEnabled: false, network: 'mainnet-beta' }); setBootSyncDone(false); bootSyncStartedRef.current = false; animatedSetScreen('main'); }} />;
      case 'import': return <ImportWalletScreen t={t} onBack={() => animatedSetScreen('welcome')} onImport={generateWalletFromMnemonic} />;
      case 'unlock': return <UnlockScreen t={t} correctPin={pin} biometricsEnabled={biometricsEnabled} onUnlock={() => { setBootSyncDone(false); bootSyncStartedRef.current = false; animatedSetScreen('main'); }} onLogout={handleLogout} />;
      case 'main':
        if (!bootSyncDone) return <BootLoading title={t('processing')} />;
        return <MainScreen t={t} activeTab={activeTab} setActiveTab={setTab} wallet={wallet} assets={assets} totalValue={totalValue} onRefresh={() => refreshAssets(true)} tokenList={tokenList} network={network} connection={connection} onRetryFetchTokens={fetchTokens} notify={showNotification} onNavigate={handleNavigate} onLogout={handleLogout} contacts={contacts} />;
      case 'receive': return <ReceiveScreen t={t} wallet={wallet} onBack={() => animatedSetScreen('main')} notify={showNotification} />;
      
      case 'send': 
        return <SendScreen 
          t={t} 
          wallet={wallet} 
          connection={connection} 
          contacts={contacts} 
          onBack={() => {
            if (navigationParams?.asset || navigationParams?.preSelectedAsset) {
              animatedSetScreen('asset-detail');
            } else {
              animatedSetScreen('main');
            }
          }} 
          notify={showNotification} 
          preSelectedAsset={navigationParams?.preSelectedAsset || navigationParams?.asset}
          preSelectedAddress={navigationParams?.preSelectedAddress}
          preSelectedAmount={navigationParams?.preSelectedAmount}
        />;
      
        case 'swap_standalone': {
        const solBal = assets.find((a: any) => a.mint === SOL_MINT)?.amount || 0;
        const tBals: any = {};
        assets.forEach((a: any) => { tBals[a.mint] = a.amount; });
        return (
          <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <HeaderRow title="" onBack={() => animatedSetScreen('asset-detail')} />
            <View style={{ flex: 1, marginTop: -20 }}>
              <SwapScreen t={t} wallet={wallet} connection={connection} tokenList={tokenList} notify={showNotification} onRetryFetch={fetchTokens} solBalance={solBal} tokenBalances={tBals} preSelectedAsset={navigationParams?.asset} />
            </View>
          </View>
        );
      }

      case 'history': return <HistoryScreen t={t} connection={connection} address={wallet?.address} onBack={() => animatedSetScreen('main')} />;
      case 'stake': return <StakingScreen t={t} wallet={wallet} connection={connection} notify={showNotification} onBack={() => animatedSetScreen('main')} solBalance={assets.find((a: any) => a.mint === SOL_MINT)?.amount || 0} />;
      case 'settings_security': return <SecuritySettingsScreen t={t} wallet={wallet} biometrics={biometricsEnabled} setBiometrics={async (en: boolean) => { setBiometricsEnabled(en); await persistSettings({ biometricsEnabled: en }); }} hasPin={!!pin} onSetupPin={() => { setPendingBioEnable(false); animatedSetScreen('pin_setup'); }} onBack={() => animatedSetScreen('main')} />;
      case 'address_book': return <AddressBookScreen t={t} contacts={contacts} onSave={saveContacts} notify={showNotification} onBack={() => animatedSetScreen('main')} />;
      case 'settings_help': return <HelpScreen t={t} onBack={() => animatedSetScreen('main')} />;
      case 'settings_about': return <AboutScreen t={t} onBack={() => animatedSetScreen('main')} />;
      case 'settings_lang': return <LanguageScreen t={t} onBack={() => animatedSetScreen('main')} onChange={changeLanguage} currentLang={lang} />;
      case 'pin_setup': return <PinSetupScreen t={t} onSuccess={handlePinSet} onCancel={() => { setPendingBioEnable(false); animatedSetScreen('settings_security'); }} />;
      case 'settings_network': return <NetworkSettingsScreen t={t} currentNetwork={network} setNetwork={async (net: any) => { setNetwork(net); await persistSettings({ network: net }); }} currentRpc={rpcEndpoint} setRpc={setRpcEndpoint} onBack={() => animatedSetScreen('main')} />;
      
      case 'asset-detail': 
        return <AssetDetailScreen
          t={t}
          asset={navigationParams?.asset || navigationParams?.preSelectedAsset} 
          onBack={() => animatedSetScreen('main')} 
          onNavigate={handleNavigate} 
        />;

      default: return null;
    }
  };

  return (
    <SafeAreaProvider>
      <ImageBackground 
        source={skinUri ? { uri: skinUri } : undefined} 
        style={{ flex: 1, backgroundColor: '#000' }}
        resizeMode="cover"
      >
        {skinUri && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.75)' }]} />}
        
        <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
          <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
          {notification && <View style={styles.notification}><Text style={styles.notificationText}>{notification}</Text></View>}
          {renderScreen()}
          <ConfirmModal visible={logoutConfirm} title={t('logout_confirm_title')} message={t('logout_confirm_desc')} cancelText={t('cancel')} confirmText={t('delete')} onCancel={closeLogoutConfirm} onConfirm={executeLogout} />
          
          <WalletConnectModals />

        </SafeAreaView>
      </ImageBackground>
    </SafeAreaProvider>
  );
}

const MainScreen = ({ t, activeTab, setActiveTab, onNavigate, onLogout, onRetryFetchTokens, wallet, connection, assets, ...props }: any) => {
  const tokenBalances = useMemo(() => {
    const balanceMap: { [key: string]: number } = {};
    assets.forEach((a: any) => { balanceMap[a.mint] = a.amount; });
    return balanceMap;
  }, [assets]);

  const solBalance = assets.find((a: any) => a.mint === SOL_MINT)?.amount || 0;

  const animatedSetTab = useCallback((tab: string) => {
    if (activeTab !== tab) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActiveTab(tab);
    }
  }, [activeTab, setActiveTab]);

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={{ flex: 1 }}>
        {activeTab === 'home' && <DashboardScreen t={t} onNav={animatedSetTab} onNavigate={onNavigate} wallet={wallet} assets={assets} {...props} />}
        {activeTab === 'swap' && <SwapScreen t={t} wallet={wallet} connection={connection} tokenList={props.tokenList} notify={props.notify} onRetryFetch={onRetryFetchTokens} solBalance={solBalance} tokenBalances={tokenBalances} />}
        {activeTab === 'history' && <HistoryScreen t={t} connection={connection} address={wallet?.address} onBack={() => animatedSetTab('home')} />}
        {activeTab === 'settings' && <SettingsScreen t={t} onNavigate={onNavigate} onLogout={onLogout} />}
      </View>
      <View style={styles.bottomNav}>
        <NavButton icon={Wallet} label={t('home')} active={activeTab === 'home'} onPress={() => animatedSetTab('home')} />
        <NavButton icon={RefreshCw} label={t('swap')} active={activeTab === 'swap'} onPress={() => animatedSetTab('swap')} />
        <NavButton icon={History} label={t('history')} active={activeTab === 'history'} onPress={() => animatedSetTab('history')} />
        <NavButton icon={Settings} label={t('settings')} active={activeTab === 'settings'} onPress={() => animatedSetTab('settings')} />
      </View>
    </View>
  );
};