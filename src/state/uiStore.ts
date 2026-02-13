import { create } from 'zustand';

export type Screen =
  | 'splash' | 'welcome' | 'loading' | 'create' | 'import' | 'unlock' | 'main'
  | 'receive' | 'send' | 'history' | 'stake' | 'address_book'
  | 'settings_security' | 'settings_network' | 'settings_help' | 'settings_about'
  | 'settings_lang' | 'pin_setup';

export type Tab = 'home' | 'swap' | 'history' | 'settings';

interface UIState {
  currentScreen: Screen;
  activeTab: Tab;

  notification: string | null;

  logoutConfirm: boolean;

  setScreen: (s: Screen) => void;
  setTab: (t: Tab) => void;

  showNotification: (msg: string, ms?: number) => void;
  clearNotification: () => void;

  openLogoutConfirm: () => void;
  closeLogoutConfirm: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  currentScreen: 'splash',
  activeTab: 'home',
  notification: null,
  logoutConfirm: false,

  setScreen: (s) => set({ currentScreen: s }),
  setTab: (t) => set({ activeTab: t }),

  showNotification: (msg, ms = 3000) => {
    set({ notification: msg });
    setTimeout(() => {
      if (get().notification === msg) set({ notification: null });
    }, ms);
  },
  clearNotification: () => set({ notification: null }),

  openLogoutConfirm: () => set({ logoutConfirm: true }),
  closeLogoutConfirm: () => set({ logoutConfirm: false }),
}));
