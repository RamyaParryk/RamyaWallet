import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Image, Linking, StyleSheet, Platform } from 'react-native';
import { Lock, Check, Github, Info, AlertCircle, Globe, Server, ArrowUpRight, ShieldCheck, ChevronRight, FileText, Youtube } from 'lucide-react-native';
import ReactNativeBiometrics from 'react-native-biometrics';

import { styles as globalStyles } from '../styles/globalStyles';
import { HeaderRow } from '../components/HeaderRow';
import { GITHUB_URL } from '../constants/config';
import { secretKeyToString } from '../utils/solanaUtils';
import packageJson from '../../package.json';
import { ConfirmModal } from '../components/ActionModals';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SettingItemRow = ({ icon: Icon, title, desc, onPress, rightElement, isLast, color="rgba(168, 85, 247, 0.1)", iconColor="#a855f7" }: any) => (
  <TouchableOpacity style={[localStyles.settingItem, !isLast && localStyles.borderBottom]} onPress={onPress} disabled={!onPress}>
    <View style={[localStyles.iconWrapper, { backgroundColor: color }]}>
      <Icon size={20} color={iconColor} />
    </View>
    <View style={localStyles.textContainer}>
      <Text style={localStyles.itemTitle}>{title}</Text>
      {desc && <Text style={localStyles.itemDesc}>{desc}</Text>}
    </View>
    {rightElement || (onPress && <ChevronRight size={20} color="#444" />)}
  </TouchableOpacity>
);

// --- 1. Security Settings ---
export const SecuritySettingsScreen = ({ t, wallet, biometrics, setBiometrics, hasPin, onSetupPin, onBack }: any) => {
  const [showKey, setShowKey] = useState(false);
  const [keyConfirm, setKeyConfirm] = useState(false);
  const insets = useSafeAreaInsets();

  const handleReveal = async () => {
    if (biometrics) {
      const rnBiometrics = new ReactNativeBiometrics();
      const { success } = await rnBiometrics.simplePrompt({ promptMessage: t('use_biometrics') || 'Use Biometrics' });
      if (success) setShowKey(true);
    } else {
      setShowKey(true);
    }
  };

  return (
    <View style={globalStyles.container}>
      <HeaderRow title={t('security') || 'Security'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        
        <Text style={globalStyles.sectionTitle}>{t('security') || 'Security'}</Text>
        <View style={globalStyles.card}>
          <SettingItemRow 
            icon={Lock} title={t('pin_setup') || "PIN Setup"} desc={hasPin ? "ON" : "OFF"} 
            rightElement={
              <TouchableOpacity style={localStyles.actionBtn} onPress={onSetupPin}>
                <Text style={localStyles.actionBtnText}>{hasPin ? (t('save') || 'Change') : (t('add_new') || 'Setup')}</Text>
              </TouchableOpacity>
            } 
          />
          <SettingItemRow 
            icon={ShieldCheck} title={t('biometrics') || 'Biometrics'} desc={t('use_biometrics') || 'Use Biometrics'} isLast
            rightElement={<Switch value={biometrics} onValueChange={setBiometrics} trackColor={{ true: '#a855f7', false: '#333' }} />} 
          />
        </View>

        {wallet?.walletType !== 'seed-vault' && (
          <>
            <Text style={globalStyles.sectionTitle}>{t('recovery_phrase') || 'Recovery Phrase'}</Text>
            <View style={globalStyles.card}>
              <View style={localStyles.secretHeader}>
                <Text style={localStyles.secretTitle}>{t('private_key') || 'Private Key'}</Text>
                {!showKey ? (
                  <TouchableOpacity style={localStyles.actionBtn} onPress={() => setKeyConfirm(true)}>
                    <Text style={localStyles.actionBtnText}>{t('show') || 'Show'}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={localStyles.actionBtn} onPress={() => setShowKey(false)}>
                    <Text style={localStyles.actionBtnText}>{t('hide') || 'Hide'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {showKey && <Text style={localStyles.secretData}>{secretKeyToString(wallet?.secretKey)}</Text>}
            </View>
            <View style={globalStyles.warningBox}>
              <AlertCircle size={24} color="#ef4444" />
              <Text style={globalStyles.warningText}>{t('warning_share') || 'Never share this with anyone.'}</Text>
            </View>
          </>
        )}
      </ScrollView>
      <ConfirmModal visible={keyConfirm} title={t('danger_zone') || 'Danger Zone'} message={t('secret_phrase_desc') || 'Are you sure?'} confirmText={t('show') || 'Show'} cancelText={t('cancel') || 'Cancel'} onConfirm={() => { setKeyConfirm(false); handleReveal(); }} onCancel={() => setKeyConfirm(false)} />
    </View>
  );
};

// --- 2. Network Settings ---
export const NetworkSettingsScreen = ({ t, currentNetwork, setNetwork, onBack }: any) => {
  return (
    <View style={globalStyles.container}>
      <HeaderRow title={t('network') || 'Network'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16 }}>
        <Text style={globalStyles.sectionTitle}>{t('environment') || 'Environment'}</Text>
        <View style={globalStyles.card}>
          <SettingItemRow icon={Globe} title="Mainnet Beta" desc="Production Network" onPress={() => setNetwork('mainnet-beta')} rightElement={currentNetwork === 'mainnet-beta' && <Check color="#22c55e" />} />
          <SettingItemRow icon={Server} title="Devnet" desc="Development Network" isLast onPress={() => setNetwork('devnet')} rightElement={currentNetwork === 'devnet' && <Check color="#22c55e" />} />
        </View>
      </ScrollView>
    </View>
  );
};

// --- 3. Help Screen ---
export const HelpScreen = ({ t, onBack }: any) => {
  const faqs = [
    { q: t('faq_restore') || 'How to restore?', a: t('faq_restore_desc') },
    { q: t('faq_stake') || 'What is Staking?', a: t('faq_stake_desc') },
    { q: t('faq_apy') || 'What is the APY?', a: t('faq_apy_desc') },
    { q: t('faq_fee') || 'Any fees?', a: t('faq_fee_desc') },
    { q: t('faq_device') || 'Changing device?', a: t('faq_device_desc') },
    { q: t('faq_bank') || 'Difference from bank?', a: t('faq_bank_desc') },
  ];
  return (
    <View style={globalStyles.container}>
      <HeaderRow title={t('help') || 'Help & FAQ'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <Text style={globalStyles.sectionTitle}>FAQ</Text>
        {faqs.map((faq, i) => (
          <View key={i} style={globalStyles.helpItemContainer}>
            <View style={globalStyles.helpHeaderRow}>
              <View style={globalStyles.helpIconBadge}><Info size={16} color="#fff" /></View>
              <Text style={globalStyles.helpTitle}>{faq.q}</Text>
            </View>
            <Text style={globalStyles.helpDesc}>{faq.a}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

// --- 4. About Screen ---
export const AboutScreen = ({ t, onBack }: any) => {
  return (
    <View style={globalStyles.container}>
      <HeaderRow title={t('about') || 'About App'} onBack={onBack} />
      
      <View style={{ alignItems: 'center', marginTop: 30 }}>
        <View style={localStyles.logoContainer}>
          <Image source={require('../../assets/icon.png')} style={localStyles.appIcon} />
        </View>
        <Text style={localStyles.appName}>Ramya Wallet</Text>
        <Text style={localStyles.appVersion}>Version {packageJson.version}</Text>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 30 }}>
        <Text style={globalStyles.sectionTitle}>{t('support') || "Support"}</Text>
        <View style={globalStyles.card}>
          <SettingItemRow icon={Github} title="GitHub" desc="Source code" onPress={() => Linking.openURL(GITHUB_URL)} rightElement={<ArrowUpRight size={20} color="#888" />} />
          <SettingItemRow icon={Youtube} title={t('official_youtube') || "Official YouTube"} desc="Ramya Wallet Channel" onPress={() => Linking.openURL('https://youtube.com/')} rightElement={<ArrowUpRight size={20} color="#888" />} />
          <SettingItemRow icon={FileText} title={t('terms_title') || "Terms & Privacy Policy"} desc={t('terms_desc') || "Tap to view"} isLast onPress={() => Linking.openURL('https://ramyawallet.com/privacy')} rightElement={<ArrowUpRight size={20} color="#888" />} />
        </View>

        <Text style={{textAlign:'center', color:'#555', marginTop:40, fontSize: 12}}>
          Made with ❤️ for the Solana Community
        </Text>
      </View>
    </View>
  );
};

// --- 5. Language Screen ---
export const LanguageScreen = ({ t, onBack, onChange, currentLang }: any) => { 
  const langs = [
    { code: 'ja', label: '日本語' },
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'pt', label: 'Português' },
    { code: 'it', label: 'Italiano' },
    { code: 'de', label: 'Deutsch' },
    { code: 'fr', label: 'Français' },
    { code: 'ru', label: 'Русский' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'vi', label: 'Tiếng Việt' },
    { code: 'th', label: 'ไทย' },
    { code: 'ar', label: 'العربية' },
    { code: 'fa', label: 'فارسی' },
    { code: 'tr', label: 'Türkçe' },
    { code: 'sw', label: 'Kiswahili' },
    { code: 'zh', label: '中文' },
    { code: 'ko', label: '한국어' },
  ];

  return (
    <View style={globalStyles.container}>
      <HeaderRow title={t('language') || "Language"} onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, marginTop: 16, paddingBottom: 40 }}>
        <View style={globalStyles.card}>
          {langs.map((l, i) => (
            <SettingItemRow 
              key={l.code} icon={Globe} title={l.label} 
              isLast={i === langs.length - 1} onPress={() => onChange(l.code)} 
              rightElement={currentLang === l.code && <Check color="#22c55e" />} 
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const localStyles = StyleSheet.create({
  settingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#333' },
  iconWrapper: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(168, 85, 247, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  textContainer: { flex: 1 },
  itemTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  itemDesc: { color: '#888', fontSize: 13, marginTop: 2 },
  actionBtn: { backgroundColor: '#2a2a2a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  actionBtnText: { color: '#a855f7', fontSize: 12, fontWeight: 'bold' },
  secretHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  secretTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secretData: { color: '#ef4444', fontFamily: 'monospace', fontSize: 14, lineHeight: 22, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  logoContainer: { width: 100, height: 100, borderRadius: 24, backgroundColor: '#a855f7', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#a855f7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  appIcon: { width: 75, height: 75, resizeMode: 'contain' },
  appName: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  appVersion: { color: '#888', fontSize: 16, marginTop: 4 },
});