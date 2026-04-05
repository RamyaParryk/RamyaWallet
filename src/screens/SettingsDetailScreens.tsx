import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Image, Linking, Modal, StyleSheet, Platform } from 'react-native';
// Youtubeのアイコンインポートを削除
import { Lock, Check, Github, Info, RefreshCw, TrendingUp, Percent, Zap, ShieldCheck, Wallet, ChevronRight, X, AlertCircle, Globe, Server, Image as ImageIcon } from 'lucide-react-native';
import ReactNativeBiometrics from 'react-native-biometrics';

import { styles as globalStyles } from '../styles/globalStyles';
import { HeaderRow } from '../components/HeaderRow';
// YOUTUBE_URLのインポートを削除
import { GITHUB_URL } from '../constants/config';
import { secretKeyToString } from '../utils/solanaUtils';
import packageJson from '../../package.json';
import { SimpleAlertModal, ConfirmModal } from '../components/ActionModals';

// 広告と安全領域用のインポート
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { ADMOB_ANDROID_BANNER_ID as ADMOB_ANDROID_ENV } from '@env';

const BANNER_ESTIMATED_HEIGHT = 60;

// モダンUI共通のカード型 SettingItem
const SettingItem = ({ icon: Icon, title, desc, onPress, color = "rgba(168, 85, 247, 0.1)", iconColor = "#a855f7", isLast = false, rightElement }: any) => (
  <TouchableOpacity 
    style={[localStyles.settingItem, !isLast && localStyles.borderBottom]} 
    onPress={onPress} 
    activeOpacity={0.7}
    disabled={!onPress}
  >
    <View style={[localStyles.iconWrapper, { backgroundColor: color }]}>
      <Icon size={22} color={iconColor} />
    </View>
    <View style={localStyles.textContainer}>
      <Text style={localStyles.title}>{title}</Text>
      {desc && <Text style={localStyles.subtitle}>{desc}</Text>}
    </View>
    {rightElement ? rightElement : (onPress ? <ChevronRight size={20} color="#555" /> : null)}
  </TouchableOpacity>
);

// --- セキュリティ設定画面 ---
export const SecuritySettingsScreen = ({ t, wallet, biometrics, setBiometrics, hasPin, onSetupPin, onBack }: any) => {
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const rnBiometrics = new ReactNativeBiometrics();
  const insets = useSafeAreaInsets();
  
  const [alert, setAlert] = useState({ visible: false, title: '', message: '' });
  const [confirm, setConfirm] = useState<any>({ visible: false });

  const wordCount = wallet?.mnemonic ? wallet.mnemonic.trim().split(/\s+/).length : 0;

  const adUnitId = useMemo(() => {
    if (Platform.OS !== 'android') return '';
    return (ADMOB_ANDROID_ENV || '').trim();
  }, []);
  const showBanner = adUnitId.length > 0;

  if (!wallet) return <View style={globalStyles.content} />;
  
  const handleBiometrics = async (enabled: boolean) => {
    if (enabled) {
      if (!hasPin) {
         setConfirm({
           visible: true,
           title: t('pin_required'),
           message: "",
           confirmText: t('pin_setup'),
           onConfirm: () => { setConfirm({ ...confirm, visible: false }); onSetupPin(); }
         });
         return;
      }
      try {
        const { available } = await rnBiometrics.isSensorAvailable();
        if (!available) {
          setAlert({ visible: true, title: t('error'), message: t('biometrics_error') });
          return;
        }
        const { success } = await rnBiometrics.simplePrompt({ promptMessage: t('biometrics') });
        if (success) setBiometrics(true);
      } catch(e) { 
        setAlert({ visible: true, title: t('auth_cancelled'), message: "" });
      }
    } else {
      setBiometrics(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <HeaderRow title={t('security')} onBack={onBack} />
      <ScrollView contentContainerStyle={[localStyles.scrollContent, { paddingBottom: showBanner ? BANNER_ESTIMATED_HEIGHT + 20 : 40 }]}>
        
        <Text style={localStyles.sectionHeader}>Authentication</Text>
        <View style={localStyles.card}>
          <SettingItem 
            icon={Lock} 
            title={t('pin_setup')} 
            desc={hasPin ? "PIN is active" : "Not set"} 
            onPress={onSetupPin} 
          />
          <SettingItem 
            icon={ShieldCheck} 
            title={t('biometrics')} 
            desc="Fingerprint / FaceID"
            isLast={true}
            rightElement={
              <Switch value={biometrics} onValueChange={handleBiometrics} trackColor={{false: "#333", true: "#a855f7"}} />
            }
          />
        </View>

        <Text style={localStyles.sectionHeader}>{t('recovery_phrase')}</Text>
        <View style={localStyles.card}>
          <View style={localStyles.secretCardHeader}>
            <Text style={localStyles.secretCardTitle}>{wordCount > 0 ? `${wordCount} Words` : "Secret Phrase"}</Text>
            <TouchableOpacity onPress={() => setShowMnemonic(!showMnemonic)} style={localStyles.toggleBtn}>
              <Text style={localStyles.toggleBtnText}>{showMnemonic ? t('hide') : t('show')}</Text>
            </TouchableOpacity>
          </View>
          {showMnemonic && (
            <View style={localStyles.secretContent}>
              <Text style={localStyles.secretText}>{wallet?.mnemonic || "Unavailable"}</Text>
            </View>
          )}
        </View>

        <Text style={localStyles.sectionHeader}>{t('private_key')}</Text>
        <View style={localStyles.card}>
          <View style={localStyles.secretCardHeader}>
            <Text style={localStyles.secretCardTitle}>{t('raw_key')}</Text>
            <TouchableOpacity onPress={() => setShowKey(!showKey)} style={localStyles.toggleBtn}>
              <Text style={localStyles.toggleBtnText}>{showKey ? t('hide') : t('show')}</Text>
            </TouchableOpacity>
          </View>
          {showKey && wallet?.secretKey && (
            <View style={localStyles.secretContent}>
              <Text style={localStyles.secretText}>{secretKeyToString(wallet.secretKey)}</Text>
            </View>
          )}
        </View>

        <SimpleAlertModal visible={alert.visible} title={alert.title} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
        <ConfirmModal visible={confirm.visible} title={confirm.title} message={confirm.message} confirmText={confirm.confirmText} cancelText={t('cancel')} onCancel={() => setConfirm({ ...confirm, visible: false })} onConfirm={confirm.onConfirm} />
      </ScrollView>

      {showBanner ? (
        <View style={[localStyles.bannerContainer, { paddingBottom: insets.bottom }]}>
          <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
        </View>
      ) : null}
    </View>
  );
};

// --- ネットワーク設定画面 ---
export const NetworkSettingsScreen = ({ t, currentNetwork, setNetwork, currentRpc, setRpc, onBack }: any) => {
  const insets = useSafeAreaInsets();
  const adUnitId = useMemo(() => {
    if (Platform.OS !== 'android') return '';
    return (ADMOB_ANDROID_ENV || '').trim();
  }, []);
  const showBanner = adUnitId.length > 0;

  const networks = [{ id: 'mainnet-beta', name: 'Mainnet Beta', desc: 'Real Money' }, { id: 'devnet', name: 'Devnet', desc: 'Test Env' }];
  const rpcs = [{ id: 'Public', name: 'Public Node' }, { id: 'Helius', name: 'Helius RPC' }, { id: 'QuickNode', name: 'QuickNode RPC' }];
  
  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <HeaderRow title={t('network')} onBack={onBack} />
      <ScrollView contentContainerStyle={[localStyles.scrollContent, { paddingBottom: showBanner ? BANNER_ESTIMATED_HEIGHT + 20 : 40 }]}>
        
        <Text style={localStyles.sectionHeader}>{t('environment')}</Text>
        <View style={localStyles.card}>
          {networks.map((net: any, idx) => (
            <TouchableOpacity 
              key={net.id} 
              style={[localStyles.settingItem, idx !== networks.length - 1 && localStyles.borderBottom]} 
              onPress={() => setNetwork(net.id)}
            >
              <View style={[localStyles.iconWrapper, currentNetwork === net.id ? { backgroundColor: 'rgba(168, 85, 247, 0.1)' } : { backgroundColor: '#222' }]}>
                <Globe size={22} color={currentNetwork === net.id ? '#a855f7' : '#888'} />
              </View>
              <View style={localStyles.textContainer}>
                <Text style={[localStyles.title, currentNetwork === net.id && { color: '#a855f7' }]}>{net.name}</Text>
                <Text style={localStyles.subtitle}>{net.desc}</Text>
              </View>
              {currentNetwork === net.id && <Check size={20} color="#a855f7" />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={localStyles.sectionHeader}>{t('rpc_endpoint')}</Text>
        <View style={localStyles.card}>
          {rpcs.map((rpc: any, idx) => (
            <TouchableOpacity 
              key={rpc.id} 
              style={[localStyles.settingItem, idx !== rpcs.length - 1 && localStyles.borderBottom]} 
              onPress={() => setRpc(rpc.id)}
            >
              <View style={[localStyles.iconWrapper, currentRpc === rpc.id ? { backgroundColor: 'rgba(34, 197, 94, 0.1)' } : { backgroundColor: '#222' }]}>
                <Server size={22} color={currentRpc === rpc.id ? '#22c55e' : '#888'} />
              </View>
              <View style={localStyles.textContainer}>
                <Text style={[localStyles.title, currentRpc === rpc.id && { color: '#22c55e' }]}>{rpc.name}</Text>
              </View>
              {currentRpc === rpc.id && <Check size={20} color="#22c55e" />}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {showBanner ? (
        <View style={[localStyles.bannerContainer, { paddingBottom: insets.bottom }]}>
          <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
        </View>
      ) : null}
    </View>
  );
};

// --- 言語設定画面 ---
export const LanguageScreen = ({ onBack, onChange, currentLang }: any) => {
  const insets = useSafeAreaInsets();
  const adUnitId = useMemo(() => {
    if (Platform.OS !== 'android') return '';
    return (ADMOB_ANDROID_ENV || '').trim();
  }, []);
  const showBanner = adUnitId.length > 0;

  const langs = [
    { code: 'ja', label: '日本語' }, { code: 'en', label: 'English' }, { code: 'es', label: 'Español' },{ code: 'fr', label: 'Français' },
    { code: 'ru', label: 'Русский' }, { code: 'de', label: 'Deutsch' }, { code: 'zh', label: '中文' }, { code: 'ko', label: '한국어' },
    { code: 'hi', label: 'हिन्दी' },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <HeaderRow title="Language" onBack={onBack} />
      <ScrollView contentContainerStyle={[localStyles.scrollContent, { paddingBottom: showBanner ? BANNER_ESTIMATED_HEIGHT + 20 : 40 }]}>
        <View style={[localStyles.card, { marginTop: 20 }]}>
          {langs.map((l, idx) => (
            <TouchableOpacity 
              key={l.code} 
              style={[localStyles.settingItem, idx !== langs.length - 1 && localStyles.borderBottom]} 
              onPress={() => onChange(l.code)}
            >
              <Text style={[localStyles.title, currentLang === l.code && { color: '#a855f7' }]}>{l.label}</Text>
              {currentLang === l.code && <Check size={20} color="#a855f7" />}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {showBanner ? (
        <View style={[localStyles.bannerContainer, { paddingBottom: insets.bottom }]}>
          <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
        </View>
      ) : null}
    </View>
  );
};

// --- ヘルプ画面 ---
export const HelpScreen = ({ t, onBack }: any) => {
  const insets = useSafeAreaInsets();
  const adUnitId = useMemo(() => {
    if (Platform.OS !== 'android') return '';
    return (ADMOB_ANDROID_ENV || '').trim();
  }, []);
  const showBanner = adUnitId.length > 0;

  // ★ ここでFAQの並び順を整理
  const items = [
    {icon:RefreshCw, color:'#a855f7', bg:'rgba(168, 85, 247, 0.1)', t:'faq_restore'}, 
    {icon:TrendingUp, color:'#22c55e', bg:'rgba(34, 197, 94, 0.1)', t:'faq_stake'},
    {icon:Percent, color:'#22c55e', bg:'rgba(34, 197, 94, 0.1)', t:'faq_apy'}, 
    {icon: Info, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)', titleKey: 'help_faq_staking_title', descKey: 'help_faq_staking_answer'},
    {icon: ImageIcon, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', titleKey: 'faq_nft_send_title', descKey: 'faq_nft_send_desc'},
    {icon:Zap, color:'#eab308', bg:'rgba(234, 179, 8, 0.1)', t:'faq_fee'},
    {icon:ShieldCheck, color:'#ef4444', bg:'rgba(239, 68, 68, 0.1)', t:'faq_device'}, 
    {icon:Wallet, color:'#3b82f6', bg:'rgba(59, 130, 246, 0.1)', t:'faq_bank'},
    {icon:AlertCircle, color:'#6366f1', bg:'rgba(99, 102, 241, 0.1)', t:'faq_trouble_swap'},
    {icon:AlertCircle, color:'#f59e0b', bg:'rgba(245, 158, 11, 0.1)', t:'faq_trouble_price'},
    {icon:AlertCircle, color:'#10b981', bg:'rgba(16, 185, 129, 0.1)', t:'faq_trouble_balance'}
  ];

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <HeaderRow title={t('help')} onBack={onBack} />
      <ScrollView contentContainerStyle={[localStyles.scrollContent, { paddingBottom: showBanner ? BANNER_ESTIMATED_HEIGHT + 20 : 40 }]}>
        <Text style={localStyles.sectionHeader}>FAQ & Support</Text>
        <View style={localStyles.card}>
          {items.map((it, i) => (
            <View key={i} style={[localStyles.helpItem, i !== items.length - 1 && localStyles.borderBottom]}>
               <View style={localStyles.helpHeaderRow}>
                  <View style={[localStyles.iconWrapper, {backgroundColor: it.bg, width: 32, height: 32, borderRadius: 8}]}>
                    <it.icon size={16} color={it.color} />
                  </View>
                  <Text style={localStyles.helpTitle}>{t(it.titleKey || it.t)}</Text>
               </View>
               <Text style={localStyles.helpDesc}>{t(it.descKey || (it.t ? it.t + '_desc' : ''))}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {showBanner ? (
        <View style={[localStyles.bannerContainer, { paddingBottom: insets.bottom }]}>
          <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
        </View>
      ) : null}
    </View>
  );
};

// --- アバウト画面 ---
export const AboutScreen = ({ t, onBack }: any) => {
  const insets = useSafeAreaInsets();
  const adUnitId = useMemo(() => {
    if (Platform.OS !== 'android') return '';
    return (ADMOB_ANDROID_ENV || '').trim();
  }, []);
  const showBanner = adUnitId.length > 0;

  const [modalVisible, setModalVisible] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <HeaderRow title={t('about')} onBack={onBack} />
      <ScrollView contentContainerStyle={[localStyles.scrollContent, { paddingBottom: showBanner ? BANNER_ESTIMATED_HEIGHT + 20 : 40 }]}>
        <View style={{alignItems:'center', marginVertical: 40}}>
          <View style={{width:100, height:100, borderRadius:24, backgroundColor:'#ff98e0', justifyContent:'center', alignItems:'center', borderWidth:1, borderColor:'#333'}}>
             <Image source={require('../../assets/splash.png')} style={{width: 64, height: 64, borderRadius: 16}}/>
          </View>
          <Text style={{fontSize:24, fontWeight:'bold', color:'#fff', marginTop:16}}>{t('welcome_title')}</Text>
          <Text style={{color:'#888', marginTop: 4}}>Version {packageJson.version}</Text>
        </View>

        <Text style={localStyles.sectionHeader}>Links & Info</Text>
        <View style={localStyles.card}>
           {/* YouTubeのSettingItemを削除し、GitHubのみにしました */}
           <SettingItem icon={Github} title="Official GitHub" desc="Open Source" onPress={() => Linking.openURL(GITHUB_URL)} color="rgba(255, 255, 255, 0.1)" iconColor="#fff" />
           <SettingItem icon={Info} title={t('terms')} desc={t('terms_desc')} onPress={() => setModalVisible(true)} isLast={true} />
        </View>
        
        <Text style={{textAlign:'center', color:'#555', marginTop:40, fontSize: 12}}>Made with ❤️ for the Solana Community</Text>
      </ScrollView>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={globalStyles.modalOverlay}>
          <View style={[globalStyles.modalContent, {height: '80%'}]}>
            <View style={globalStyles.rowBetween}>
              <Text style={globalStyles.modalTitle}>{t('terms_title')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><X color="#fff" /></TouchableOpacity>
            </View>
            <ScrollView style={{marginTop: 16}}>
              {[1,2,3,4,5,6].map(n => (
                <View key={n} style={{marginBottom: 20}}>
                  <Text style={{color:'#fff', fontWeight:'bold', fontSize:16, marginBottom:6}}>{t(`term_${n}_title`)}</Text>
                  <Text style={{color:'#aaa', lineHeight:20}}>{t(`term_${n}_desc`)}</Text>
                </View>
              ))}
              <View style={{height: 50}}/>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {showBanner ? (
        <View style={[localStyles.bannerContainer, { paddingBottom: insets.bottom }]}>
          <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
        </View>
      ) : null}
    </View>
  );
};

// モダンUI共通のスタイル定義
const localStyles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 10,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    color: '#aaa',
    fontSize: 13,
  },
  
  secretCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  secretCardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleBtn: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleBtnText: {
    color: '#a855f7',
    fontSize: 12,
    fontWeight: 'bold',
  },
  secretContent: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: '#1a1a1a',
  },
  secretText: {
    color: '#ef4444',
    fontFamily: 'monospace',
    fontSize: 14,
    lineHeight: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },

  helpItem: {
    padding: 16,
  },
  helpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  helpTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    flex: 1,
  },
  helpDesc: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 20,
    paddingLeft: 44,
  },

  bannerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
});