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

import { styles as globalStyles } from '../styles/globalStyles';

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

// ★ モダンなカード型の設定項目コンポーネント
type SettingItemProps = {
  icon: any;
  title: string;
  desc?: string;
  onPress: () => void;
  danger?: boolean;
  isLast?: boolean; // カードの最後の要素は下線を消すため
};

function SettingItem({ icon: Icon, title, desc, onPress, danger, isLast = false }: SettingItemProps) {
  return (
    <TouchableOpacity
      style={[localStyles.settingItem, !isLast && localStyles.borderBottom]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[localStyles.iconWrapper, danger && { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
        <Icon size={22} color={danger ? '#ef4444' : '#a855f7'} />
      </View>
      <View style={localStyles.textContainer}>
        <Text style={[localStyles.title, danger && { color: '#ef4444' }]}>{title}</Text>
        {desc ? <Text style={localStyles.subtitle}>{desc}</Text> : null}
      </View>
      <ChevronRight size={20} color="#555" />
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
    <SafeAreaView style={localStyles.root} edges={['top']}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={localStyles.container}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            localStyles.scrollContent,
            {
              paddingBottom: showBanner ? BANNER_ESTIMATED_HEIGHT + 20 : 20,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={localStyles.screenTitle}>{t('settings')}</Text>

          {/* --- General Section --- */}
          <Text style={localStyles.sectionHeader}>{t('general')}</Text>
          <View style={localStyles.card}>
            <SettingItem icon={Users} title={t('address_book')} onPress={() => onNavigate('address_book')} />
            <SettingItem icon={Globe} title={t('language')} onPress={() => onNavigate('settings_lang')} isLast={true} />
          </View>

          {/* --- Security & Network Section --- */}
          <Text style={localStyles.sectionHeader}>{t('security_network')}</Text>
          <View style={localStyles.card}>
            <SettingItem icon={ShieldCheck} title={t('security')} onPress={() => onNavigate('settings_security')} />
            <SettingItem icon={Server} title={t('network')} onPress={() => onNavigate('settings_network')} isLast={true} />
          </View>

          {/* --- Support Section --- */}
          <Text style={localStyles.sectionHeader}>{t('support')}</Text>
          <View style={localStyles.card}>
            <SettingItem icon={CircleHelp} title={t('help')} onPress={() => onNavigate('settings_help')} />
            <SettingItem icon={Info} title={t('about')} onPress={() => onNavigate('settings_about')} isLast={true} />
          </View>

          {/* --- Danger Zone --- */}
          <Text style={[localStyles.sectionHeader, { color: '#ef4444', marginTop: 30 }]}>{t('danger_zone')}</Text>
          <View style={[localStyles.card, { borderColor: 'rgba(239, 68, 68, 0.3)', marginBottom: 20 }]}>
            <SettingItem 
              icon={LogOut} 
              title={t('logout')} 
              desc={t('logout_desc') || 'Erase all data from this device'}
              onPress={onLogout} 
              danger={true} 
              isLast={true} 
            />
          </View>

          <Text style={localStyles.versionText}>Version {packageJson.version}</Text>
        </ScrollView>

        {/* ✅ 画面下固定バナー（Androidのみ） */}
        {showBanner ? (
          <View style={localStyles.bannerContainer}>
            <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

// ★ モダンUI専用のスタイル
const localStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionHeader: {
    color: '#888',
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 12,
    marginTop: 24,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    color: '#aaa',
    fontSize: 12,
  },
  versionText: {
    color: '#555',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  bannerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 8,
    backgroundColor: 'rgba(0,0,0,0.8)', // バナーの背景を少し暗くして馴染ませる
  },
});