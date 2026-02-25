// SettingsScreen.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  Platform,
} from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BannerAd,
  BannerAdSize,
} from 'react-native-google-mobile-ads';

import { styles } from '../styles/globalStyles';

import {
  Users,
  ShieldCheck,
  Server,
  Globe,
  CircleHelp,
  Info,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';

// ✅ react-native-dotenv / @env
import { ADMOB_ANDROID_BANNER_ID as ADMOB_ANDROID_ENV } from '@env';
import packageJson from '../../package.json'; // バージョン読み込み

type Props = {
  t: (key: string) => string;
  onNavigate: (routeName: string) => void;
  onLogout: () => void;
};

const BANNER_ESTIMATED_HEIGHT = 60;

type SettingItemProps = {
  icon: any;
  title: string;
  desc?: string;
  onPress: () => void;
  danger?: boolean;
};

function SettingItem({ icon: Icon, title, desc, onPress, danger }: SettingItemProps) {
  return (
    <TouchableOpacity
      style={[styles.settingItem, danger ? s.dangerItem : null]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.settingIcon, danger ? s.dangerIcon : s.normalIcon]}>
        <Icon size={20} color={danger ? '#ef4444' : '#fff'} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.settingText, danger ? s.dangerText : null]}>{title}</Text>
        {desc ? <Text style={styles.descTextSmall}>{desc}</Text> : null}
      </View>

      {!danger ? <ChevronRight size={20} color="#444" /> : null}
    </TouchableOpacity>
  );
}

/**
 * ✅ App.tsx が `import { SettingsScreen } ...` なので named export に統一
 */
export function SettingsScreen({ t, onNavigate, onLogout }: Props) {
  const insets = useSafeAreaInsets();

  const adUnitId = useMemo(() => {
    // ✅ Androidのみ
    if (Platform.OS !== 'android') return '';
    return (ADMOB_ANDROID_ENV || '').trim();
  }, []);

  const showBanner = adUnitId.length > 0;

  return (
    // ✅ top を外して背景をステータスバー下まで（Edge-to-Edge）
    <SafeAreaView style={s.root} edges={['left', 'right', 'bottom']}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={s.container}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            s.scrollContent,
            {
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + (showBanner ? BANNER_ESTIMATED_HEIGHT + 24 : 24),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.screenTitle}>{t('settings')}</Text>

          <Text style={styles.sectionHeader}>{t('general')}</Text>

          <SettingItem icon={Users} title={t('address_book')} onPress={() => onNavigate('address_book')} />
          <SettingItem icon={ShieldCheck} title={t('security')} onPress={() => onNavigate('settings_security')} />
          <SettingItem icon={Server} title={t('network')} onPress={() => onNavigate('settings_network')} />
          <SettingItem icon={Globe} title={t('language')} onPress={() => onNavigate('settings_lang')} />

          <Text style={styles.sectionHeader}>{t('support')}</Text>

          <SettingItem icon={CircleHelp} title={t('help')} onPress={() => onNavigate('settings_help')} />
          <SettingItem icon={Info} title={t('about')} onPress={() => onNavigate('settings_about')} />

          {/* ログアウト */}
          <TouchableOpacity
            style={[styles.settingItem, { marginTop: 20 }]}
            onPress={onLogout}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIcon, s.dangerIcon]}>
              <LogOut size={20} color="#ef4444" />
            </View>
            <Text style={[styles.settingText, s.dangerText]}>{t('logout')}</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>Version {packageJson.version}</Text>
        </ScrollView>

        {/* ✅ 画面下固定バナー（Androidのみ） */}
        {showBanner ? (
          <View style={[s.bannerContainer, { paddingBottom: insets.bottom }]}>
            <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1 },

  scrollContent: {},

  bannerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 8,
  },

  normalIcon: { backgroundColor: '#222' },

  dangerItem: {},
  dangerIcon: { backgroundColor: '#3f0f0f' },
  dangerText: { color: '#ef4444' },
});