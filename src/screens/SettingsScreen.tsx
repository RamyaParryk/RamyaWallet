import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { Users, ShieldCheck, Server, Globe, CircleHelp, Info, LogOut, ChevronRight } from 'lucide-react-native';

import { styles as globalStyles } from '../styles/globalStyles';
import { ADMOB_ANDROID_BANNER_ID as ADMOB_ANDROID_ENV } from '@env';
import packageJson from '../../package.json'; 

type Props = { t: (key: string) => string; onNavigate: (routeName: string) => void; onLogout: () => void; };
const BANNER_ESTIMATED_HEIGHT = 60;

type SettingItemProps = { icon: any; title: string; desc?: string; onPress: () => void; color?: string; iconColor?: string; isDanger?: boolean; isLast?: boolean; };

const SettingItem = ({ icon: Icon, title, desc, onPress, color = "rgba(168, 85, 247, 0.1)", iconColor = "#a855f7", isDanger, isLast }: SettingItemProps) => (
  <TouchableOpacity style={[localStyles.settingItem, !isLast && localStyles.borderBottom]} onPress={onPress} activeOpacity={0.7}>
    <View style={[localStyles.iconWrapper, { backgroundColor: isDanger ? 'rgba(239, 68, 68, 0.1)' : color }]}>
      <Icon size={20} color={isDanger ? '#ef4444' : iconColor} />
    </View>
    <View style={localStyles.textContainer}>
      <Text style={[localStyles.itemTitle, isDanger && { color: '#ef4444' }]}>{title}</Text>
      {desc && <Text style={localStyles.itemDesc}>{desc}</Text>}
    </View>
    <ChevronRight size={20} color="#444" />
  </TouchableOpacity>
);

export const SettingsScreen: React.FC<Props> = ({ t, onNavigate, onLogout }) => {
  const insets = useSafeAreaInsets();
  const adUnitId = useMemo(() => (Platform.OS === 'android' ? (ADMOB_ANDROID_ENV || '').trim() : ''), []);
  const showBanner = adUnitId.length > 0;

return (
    <View style={globalStyles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <Text style={localStyles.screenTitle}>{t('settings') || 'Settings'}</Text>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: showBanner ? BANNER_ESTIMATED_HEIGHT + 40 : 60 }}>
        
        <Text style={globalStyles.sectionTitle}>{t('general') || 'General'}</Text>
        <View style={globalStyles.card}>
          <SettingItem icon={Users} title={t('address_book') || 'Address Book'} desc="Manage saved addresses" onPress={() => onNavigate('address_book')} color="rgba(59, 130, 246, 0.1)" iconColor="#3b82f6" />
          <SettingItem icon={ShieldCheck} title={t('security') || 'Security & Privacy'} desc="PIN & Biometrics" onPress={() => onNavigate('settings_security')} color="rgba(34, 197, 94, 0.1)" iconColor="#22c55e" />
          <SettingItem icon={Server} title={t('network') || 'Network Settings'} desc="Mainnet / Devnet, RPC" onPress={() => onNavigate('settings_network')} color="rgba(245, 158, 11, 0.1)" iconColor="#f59e0b" />
          <SettingItem icon={Globe} title={t('language') || 'Language'} desc="Change app language" onPress={() => onNavigate('settings_lang')} color="rgba(236, 72, 153, 0.1)" iconColor="#ec4899" isLast />
        </View>

        <Text style={globalStyles.sectionTitle}>{t('support') || 'Support & About'}</Text>
        <View style={globalStyles.card}>
          <SettingItem icon={CircleHelp} title={t('help') || 'Help Center'} desc="FAQ & Guides" onPress={() => onNavigate('settings_help')} color="rgba(14, 165, 233, 0.1)" iconColor="#0ea5e9" />
          <SettingItem icon={Info} title={t('about') || 'About App'} desc={`Version ${packageJson.version}`} onPress={() => onNavigate('settings_about')} color="rgba(168, 85, 247, 0.1)" iconColor="#a855f7" isLast />
        </View>

        <Text style={globalStyles.sectionTitle}>{t('danger_zone') || 'Danger Zone'}</Text>
        <View style={globalStyles.card}>
          <SettingItem icon={LogOut} title={t('logout') || 'Log Out'} desc={t('logout_desc') || 'Remove wallet from this device'} onPress={onLogout} isDanger isLast />
        </View>

      </ScrollView>
      {showBanner && (
        <View style={[globalStyles.bannerContainerFixed, { paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0 }]}>
          <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
        </View>
      )}
    </View>
  );
};

const localStyles = StyleSheet.create({
  screenTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'left', paddingHorizontal: 16, marginBottom: 20 },
  settingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, backgroundColor: '#1a1a1a' },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#333' },
  iconWrapper: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  textContainer: { flex: 1, justifyContent: 'center' },
  itemTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  itemDesc: { color: '#888', fontSize: 13 },
});