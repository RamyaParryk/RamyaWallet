import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import type { WalletData } from '../state/walletStore';
import type { Network } from '../state/settingsStore';

const STORAGE_KEY = 'my_solana_wallet_settings_v1';
const STORAGE_KEY_CONTACTS = 'my_solana_contacts_v1';
const STORAGE_KEY_LANG = 'my_solana_language_v1';
const SECURE_WALLET_KEY = 'secure_wallet_data_v1';

export const storageKeys = {
  STORAGE_KEY,
  STORAGE_KEY_CONTACTS,
  STORAGE_KEY_LANG,
  SECURE_WALLET_KEY,
};

export type SavedSettings = {
  pin: string | null;
  biometricsEnabled: boolean;
  network: Network;
};

export async function loadAll() {
  const [settingsJson, contactsJson, lang, secureJson] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEY),
    AsyncStorage.getItem(STORAGE_KEY_CONTACTS),
    AsyncStorage.getItem(STORAGE_KEY_LANG),
    EncryptedStorage.getItem(SECURE_WALLET_KEY),
  ]);

  const settings: Partial<SavedSettings> = settingsJson ? JSON.parse(settingsJson) : {};
  const contacts = contactsJson ? JSON.parse(contactsJson) : [];
  const language = lang ?? null;

  let wallet: WalletData | null = null;
  if (secureJson) {
    const storedWallet = JSON.parse(secureJson);
    
    // 一度確実に null ではない変数に格納する
    const parsedWallet: WalletData = { ...storedWallet };
    
    // 既存ユーザーの互換性のため、walletTypeが無い場合は 'local' をセット
    if (!parsedWallet.walletType) {
      parsedWallet.walletType = 'local';
    }

    // localウォレット（secretKeyが存在する場合）のみ Uint8Array に復元する
    if (storedWallet.secretKey) {
      parsedWallet.secretKey = new Uint8Array(Object.values(storedWallet.secretKey));
    }
    
    // 最後に wallet に代入
    wallet = parsedWallet;
  }

  return { settings, contacts, language, wallet };
}

export async function saveWallet(wallet: WalletData | null) {
  if (!wallet) return;
  await EncryptedStorage.setItem(SECURE_WALLET_KEY, JSON.stringify(wallet));
}

export async function clearWalletAndSettings() {
  await Promise.all([
    EncryptedStorage.removeItem(SECURE_WALLET_KEY),
    AsyncStorage.removeItem(STORAGE_KEY),
    AsyncStorage.removeItem(STORAGE_KEY_CONTACTS),
  ]);
}

export async function saveSettings(settings: SavedSettings) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export async function saveContacts(contacts: any[]) {
  await AsyncStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(contacts));
}

export async function saveLanguage(lang: string) {
  await AsyncStorage.setItem(STORAGE_KEY_LANG, lang);
}