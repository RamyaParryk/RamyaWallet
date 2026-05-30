import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Image, Linking, StyleSheet, Platform, Modal, Alert } from 'react-native';
import { 
  Lock, Check, Github, Info, AlertCircle, Globe, Server, Download, ShieldCheck, ChevronRight, X,
  Key, TrendingUp, Percent, CreditCard, Smartphone, Landmark, Coins, Send, Image as ImageIcon, Flame, RefreshCw
} from 'lucide-react-native';
import ReactNativeBiometrics from 'react-native-biometrics';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { ADMOB_ANDROID_BANNER_ID as ADMOB_ANDROID_ENV } from '@env';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles as globalStyles } from '../styles/globalStyles';
import { HeaderRow } from '../components/HeaderRow';
import { GITHUB_URL } from '../constants/config';
import { secretKeyToString } from '../utils/solanaUtils';
import packageJson from '../../package.json';
import { ConfirmModal } from '../components/ActionModals';

const BANNER_ESTIMATED_HEIGHT = 60;

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

const FixedBannerAd = () => {
  const insets = useSafeAreaInsets();
  const adUnitId = useMemo(() => (Platform.OS === 'android' ? (ADMOB_ANDROID_ENV || '').trim() : ''), []);
  if (!adUnitId) return null;

  return (
    // Androidの場合は下の余白（insets.bottom）を無視してピッタリくっつける
    <View style={[globalStyles.bannerContainerFixed, { paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0 }]}>
      <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
};

// --- 1. Security Settings ---
export const SecuritySettingsScreen = ({ t, wallet, biometrics, setBiometrics, hasPin, onSetupPin, onBack }: any) => {
  const [showKey, setShowKey] = useState(false);
  const [keyConfirm, setKeyConfirm] = useState(false);
  const handleBiometricsToggle = async (newValue: boolean) => {
    if (newValue) {
      if (!hasPin) {
        onSetupPin(); 
        return;
      }
      
      try {
        const rnBiometrics = new ReactNativeBiometrics();
        const { available } = await rnBiometrics.isSensorAvailable();
        
        if (!available) {
          Alert.alert(t('error') || 'エラー', 'この端末では生体認証が利用できないか、登録されていません。');
          return;
        }

        const { success } = await rnBiometrics.simplePrompt({ promptMessage: t('use_biometrics') || '生体認証を有効にします' });
        if (success) {
          setBiometrics(true);
        }
      } catch (e) {
        console.log('Biometrics setup error:', e);
      }
    } else {
      setBiometrics(false);
    }
  };

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
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: BANNER_ESTIMATED_HEIGHT + 40 }}>
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
            rightElement={<Switch value={biometrics} onValueChange={handleBiometricsToggle} trackColor={{ true: '#a855f7', false: '#333' }} />} 
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
      <FixedBannerAd />
    </View>
  );
};

// --- 2. Network Settings ---
export const NetworkSettingsScreen = ({ t, currentNetwork, setNetwork, onBack }: any) => {
  return (
    <View style={globalStyles.container}>
      <HeaderRow title={t('network') || 'Network'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: BANNER_ESTIMATED_HEIGHT + 20 }}>
        <Text style={globalStyles.sectionTitle}>{t('environment') || 'Environment'}</Text>
        <View style={globalStyles.card}>
          <SettingItemRow icon={Globe} title="Mainnet Beta" desc="Production Network" onPress={() => setNetwork('mainnet-beta')} rightElement={currentNetwork === 'mainnet-beta' && <Check color="#22c55e" />} />
          <SettingItemRow icon={Server} title="Devnet" desc="Development Network" isLast onPress={() => setNetwork('devnet')} rightElement={currentNetwork === 'devnet' && <Check color="#22c55e" />} />
        </View>
      </ScrollView>
      <FixedBannerAd />
    </View>
  );
};

// --- 3. Help Screen ---
export const HelpScreen = ({ t, onBack }: any) => {
  const faqs = [
    { q: t('faq_restore') || 'ウォレットの復元方法は？', a: t('faq_restore_desc'), icon: Key, color: '#a855f7' },
    { q: t('faq_stake') || 'ステーキングとは？', a: t('faq_stake_desc'), icon: TrendingUp, color: '#3b82f6' },
    { q: t('faq_apy') || '利率（APY）はどれくらい？', a: t('faq_apy_desc'), icon: Percent, color: '#22c55e' },
    { q: t('faq_fee') || '手数料はかかりますか？', a: t('faq_fee_desc'), icon: CreditCard, color: '#f59e0b' },
    { q: t('faq_device') || '機種変更時の注意点は？', a: t('faq_device_desc'), icon: Smartphone, color: '#ec4899' },
    { q: t('faq_bank') || '銀行とは何が違うのですか？', a: t('faq_bank_desc'), icon: Landmark, color: '#0ea5e9' },
    { q: t('help_faq_staking_title') || 'Q. 一部のステーキングしたトークンが表示されません', a: t('help_faq_staking_answer'), icon: Coins, color: '#ef4444' },
    { q: t('faq_nft_send_title') || 'Q. NFTはどうやって送るの？', a: t('faq_nft_send_desc'), icon: Send, color: '#10b981' },
    { q: t('faq_nft_bg_title') || 'Q. NFTをアプリの背景にできますか？', a: t('faq_nft_bg_desc'), icon: ImageIcon, color: '#6366f1' },
    { q: t('faq_nft_burn_title') || 'Q. スパムNFTを消すことはできますか？', a: t('faq_nft_burn_desc'), icon: Flame, color: '#f43f5e' },
    
    { q: t('faq_nfc_compat') || 'Q. NFC決済は他のウォレットアプリとも通信できますか？', a: t('faq_nfc_compat_desc'), icon: Smartphone, color: '#3b82f6' },
    { q: t('faq_nfc_receive') || 'Q. 受け取る側の操作は？', a: t('faq_nfc_receive_desc'), icon: Download, color: '#22c55e' },
    { q: t('faq_nfc_amount') || 'Q. 金額を指定して受け取れますか？', a: t('faq_nfc_amount_desc'), icon: Coins, color: '#f59e0b' },
    { q: t('faq_nfc_send') || 'Q. 送る側の操作は？', a: t('faq_nfc_send_desc'), icon: Send, color: '#a855f7' },
    { q: t('faq_nfc_retry') || 'Q. タッチして失敗する場合は？', a: t('faq_nfc_retry_desc'), icon: RefreshCw, color: '#ec4899' },
    { q: t('faq_nfc_no_reaction') || 'Q. かざしても全く反応しません', a: t('faq_nfc_no_reaction_desc'), icon: AlertCircle, color: '#ef4444' },
    { q: t('faq_nfc_conflict') || 'Q. 他の決済アプリが起動してしまいます', a: t('faq_nfc_conflict_desc'), icon: ShieldCheck, color: '#6366f1' },
  ];

  return (
    <View style={globalStyles.container}>
      <HeaderRow title={t('help') || 'Help & FAQ'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: BANNER_ESTIMATED_HEIGHT + 40 }}>
        
        {/* 🌟 一般的な質問のタイトル */}
        <Text style={[globalStyles.sectionTitle, { color: '#a855f7' }]}>
          {t('general_faq') || '一般的な質問'}
        </Text>
        
        {faqs.map((faq, i) => {
          const IconComponent = faq.icon;
          // 🌟 インデックス10（NFCの最初の質問）の前にセクションタイトルを挿入
          const isNfcSectionStart = i === 10;

          return (
            <React.Fragment key={i}>
              {isNfcSectionStart && (
                <Text style={[globalStyles.sectionTitle, { marginTop: 24, color: '#3b82f6' }]}>
                  {t('nfc_faq_title') || 'NFCタッチ決済について'}
                </Text>
              )}
              <View style={globalStyles.helpItemContainer}>
                <View style={globalStyles.helpHeaderRow}>
                  <View style={[globalStyles.helpIconBadge, { backgroundColor: faq.color }]}>
                    <IconComponent size={16} color="#fff" />
                  </View>
                  <Text style={globalStyles.helpTitle}>{faq.q}</Text>
                </View>
                <Text style={globalStyles.helpDesc}>{faq.a}</Text>
              </View>
            </React.Fragment>
          );
        })}
      </ScrollView>
      <FixedBannerAd />
    </View>
  );
};

// --- 4. About Screen ---
export const AboutScreen = ({ t, onBack }: any) => {
  const [showTerms, setShowTerms] = useState(false);

  return (
    <View style={globalStyles.container}>
      <HeaderRow title={t('about') || 'About App'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingBottom: BANNER_ESTIMATED_HEIGHT + 40 }}>
        <View style={{ alignItems: 'center', marginTop: 30 }}>
          <View style={localStyles.logoContainer}>
            <Image source={require('../../assets/icon.png')} style={localStyles.appIcon} />
          </View>
          <Text style={localStyles.appName}>Ramya Wallet</Text>
          <Text style={localStyles.appVersion}>Version {packageJson.version}</Text>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 40 }}>
          <Text style={globalStyles.sectionTitle}>LINKS & INFO</Text>
          <View style={globalStyles.card}>
            <SettingItemRow 
              icon={Github} 
              title="Official GitHub" 
              desc="Open Source" 
              onPress={() => Linking.openURL(GITHUB_URL)} 
            />
            <SettingItemRow 
              icon={Info} 
              title={t('terms_title') || "利用規約"} 
              desc={t('terms_desc') || "タップして確認"} 
              isLast 
              onPress={() => setShowTerms(true)} 
            />
          </View>
          
          <Text style={{textAlign:'center', color:'#555', marginTop:40, fontSize: 12}}>
            Made with ❤️ for the Solana Community
          </Text>
        </View>
      </ScrollView>
      <FixedBannerAd />

      <Modal visible={showTerms} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowTerms(false)}>
        <View style={[globalStyles.modalOverlay, { flex: 1 }]}>
          <View style={[globalStyles.modalContent, { flex: 1, padding: 0, marginTop: 40 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333' }}>
              <Text style={globalStyles.modalTitle}>{t('terms_title') || "利用規約"}</Text>
              <TouchableOpacity onPress={() => setShowTerms(false)}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
              {[1, 2, 3, 4, 5, 6].map(num => {
                const title = t(`term_${num}_title`);
                const desc = t(`term_${num}_desc`);
                if (!title && !desc) return null;
                return (
                  <View key={num} style={{ marginBottom: 24 }}>
                    {title ? <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>{title}</Text> : null}
                    {desc ? <Text style={{ color: '#aaa', fontSize: 14, lineHeight: 22 }}>{desc}</Text> : null}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, marginTop: 16, paddingBottom: BANNER_ESTIMATED_HEIGHT + 40 }}>
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
      <FixedBannerAd />
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