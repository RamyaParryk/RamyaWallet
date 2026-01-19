import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Image, Linking, Modal, Alert } from 'react-native';
import { Lock, Check, Youtube, Github, Info, ExternalLink, RefreshCw, TrendingUp, Percent, Zap, ShieldCheck, Wallet, ChevronRight } from 'lucide-react-native';
import ReactNativeBiometrics from 'react-native-biometrics';

import { styles } from '../styles/globalStyles';
import { HeaderRow } from '../components/HeaderRow';
import { YOUTUBE_URL, GITHUB_URL } from '../constants/config';
import { secretKeyToString } from '../utils/solanaUtils';

// ローカル用 SettingItem
const SettingItem = ({ icon: Icon, title, desc, onPress, color="#222" }: any) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress}>
     <View style={[styles.settingIcon, {backgroundColor: color}]}>
       <Icon size={20} color={color === '#222' ? '#fff' : '#ef4444'}/>
     </View>
     <View style={{flex:1}}>
       <Text style={styles.settingText}>{title}</Text>
       {desc && <Text style={styles.descTextSmall}>{desc}</Text>}
     </View>
     {color === '#222' && <ChevronRight size={20} color="#444" />}
  </TouchableOpacity>
);

// --- セキュリティ設定画面 ---
export const SecuritySettingsScreen = ({ t, wallet, biometrics, setBiometrics, hasPin, onSetupPin, onBack, network }: any) => {
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const rnBiometrics = new ReactNativeBiometrics();

  if (!wallet) return <View style={styles.content} />;

  const handleBiometrics = async (enabled: boolean) => {
    if (enabled) {
      if (!hasPin) {
         Alert.alert(t('pin_required'), "", [{ text: t('cancel'), style: "cancel" }, { text: t('pin_setup'), onPress: onSetupPin }]);
         return;
      }
      try {
        const { available } = await rnBiometrics.isSensorAvailable();
            if (!available) {
                Alert.alert(t('error'), t('biometrics_error'));
                return;
            }
        const { success } = await rnBiometrics.simplePrompt({ promptMessage: t('biometrics') });
        if (success) setBiometrics(true);
      } catch(e) { Alert.alert(t('auth_cancelled')); }
    } else {
      setBiometrics(false);
    }
  };

  return (
    <ScrollView style={styles.content}>
      <HeaderRow title={t('security')} onBack={onBack} />
      <SettingItem icon={Lock} title={t('pin_setup')} desc={hasPin ? "OK" : "NO"} onPress={onSetupPin} />
      <View style={[styles.rowBetween, {paddingVertical:16, borderTopWidth:1, borderTopColor:'#222'}]}>
        <Text style={styles.settingText}>{t('biometrics')}</Text>
        <Switch value={biometrics} onValueChange={handleBiometrics} trackColor={{false: "#333", true: "#9333ea"}} />
      </View>
      <Text style={[styles.sectionHeader, {marginTop:30}]}>{t('recovery_phrase')}</Text>
      <View style={styles.infoCard}>
         <View style={styles.rowBetween}>
           <Text style={styles.label}>12 words</Text>
           <TouchableOpacity onPress={() => setShowMnemonic(!showMnemonic)}><Text style={styles.linkText}>{showMnemonic ? t('hide') : t('show')}</Text></TouchableOpacity>
         </View>
         {showMnemonic && <Text style={styles.secretText}>{wallet?.mnemonic || "Unavailable"}</Text>}
      </View>
      <Text style={[styles.sectionHeader, {marginTop:10}]}>{t('private_key')}</Text>
      <View style={styles.infoCard}>
         <View style={styles.rowBetween}>
           <Text style={styles.label}>{t('raw_key')}</Text>
           <TouchableOpacity onPress={() => setShowKey(!showKey)}><Text style={styles.linkText}>{showKey ? t('hide') : t('show')}</Text></TouchableOpacity>
         </View>
         {showKey && wallet?.secretKey && <Text style={styles.secretText}>{secretKeyToString(wallet.secretKey)}</Text>}
      </View>
    </ScrollView>
  );
};

// --- ネットワーク設定画面 ---
export const NetworkSettingsScreen = ({ t, currentNetwork, setNetwork, currentRpc, setRpc, onBack }: any) => {
  const networks = [{ id: 'mainnet-beta', name: 'Mainnet Beta', desc: 'Real Money' }, { id: 'devnet', name: 'Devnet', desc: 'Test Env' }];
  const rpcs = [{ id: 'Public', name: 'Public Node' }, { id: 'Helius', name: 'Helius' }, { id: 'QuickNode', name: 'QuickNode' }];

  return (
    <View style={styles.content}>
      <HeaderRow title={t('network')} onBack={onBack} />
      <ScrollView>
        <Text style={styles.sectionHeader}>{t('environment')}</Text>
        <View style={styles.settingGroup}>
          {networks.map((net: any) => (
            <TouchableOpacity key={net.id} style={[styles.networkItem, currentNetwork === net.id && styles.networkItemActive]} onPress={() => setNetwork(net.id)}>
               <View><Text style={[styles.settingText, currentNetwork === net.id && {color:'#a855f7'}]}>{net.name}</Text><Text style={styles.descTextSmall}>{net.desc}</Text></View>
               {currentNetwork === net.id && <Check size={20} color="#a855f7" />}
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.sectionHeader, {marginTop:20}]}>{t('rpc_endpoint')}</Text>
        <View style={styles.settingGroup}>
          {rpcs.map((rpc: any) => (
            <TouchableOpacity key={rpc.id} style={[styles.networkItem, currentRpc === rpc.id && styles.networkItemActive]} onPress={() => setRpc(rpc.id)}>
               <Text style={[styles.settingText, currentRpc === rpc.id && {color:'#a855f7'}]}>{rpc.name}</Text>
               {currentRpc === rpc.id && <Check size={20} color="#a855f7" />}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

// --- 言語設定画面 ---
export const LanguageScreen = ({ onBack, onChange, currentLang }: any) => {
  const langs = [
    { code: 'ja', label: '日本語' }, { code: 'en', label: 'English' }, { code: 'es', label: 'Español' },
    { code: 'ru', label: 'Русский' }, { code: 'de', label: 'Deutsch' }, { code: 'zh', label: '中文' }, { code: 'ko', label: '한국어' },
  ];
  return (
    <View style={styles.content}>
      <HeaderRow title="Language" onBack={onBack} />
      <ScrollView>
        {langs.map(l => (
          <TouchableOpacity key={l.code} style={styles.settingItem} onPress={() => onChange(l.code)}>
            <Text style={[styles.settingText, currentLang===l.code && {color:'#a855f7'}]}>{l.label}</Text>
            {currentLang===l.code && <Check size={20} color="#a855f7" />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// --- ヘルプ画面 ---
export const HelpScreen = ({ t, onBack }: any) => {
  const items = [
    {icon:RefreshCw, color:'#222', t:'faq_restore'}, {icon:TrendingUp, color:'#22c55e', t:'faq_stake'},
    {icon:Percent, color:'#22c55e', t:'faq_apy'}, {icon:Zap, color:'#eab308', t:'faq_fee'},
    {icon:ShieldCheck, color:'#ef4444', t:'faq_device'}, {icon:Wallet, color:'#a855f7', t:'faq_bank'}
  ];
  return (
    <ScrollView style={styles.content}>
      <HeaderRow title={t('help')} onBack={onBack} />
      <Text style={styles.sectionHeader}>FAQ</Text>
      {items.map((it, i) => (
        <View key={i} style={styles.helpItemContainer}>
           <View style={styles.helpHeaderRow}>
              <View style={[styles.helpIconBadge, {backgroundColor: it.color}]}><it.icon size={16} color="#fff" /></View>
              <Text style={styles.helpTitle}>{t(it.t)}</Text>
           </View>
           <Text style={styles.helpDesc}>{t(it.t + '_desc')}</Text>
        </View>
      ))}
      <View style={{height:40}}/>
    </ScrollView>
  );
};

// --- アバウト画面 ---
export const AboutScreen = ({ t, onBack }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  return (
    <View style={styles.content}>
      <HeaderRow title={t('about')} onBack={onBack} />
      <ScrollView>
        <View style={{alignItems:'center', marginVertical: 30}}>
          <View style={[styles.logoBox, {width:100, height:100, borderRadius:30}]}>
             <Image source={require('../../assets/splash.png')} style={{width: 60, height: 60, borderRadius: 15}}/>
          </View>
          <Text style={[styles.title, {fontSize:24, marginTop:10}]}>{t('welcome_title')}</Text>
          <Text style={{color:'#888'}}>Version 1.0.1</Text>
        </View>

        <View style={styles.settingGroup}>
           <SettingItem icon={Youtube} title={t('official_youtube')} desc="@ramyaparryk" onPress={() => Linking.openURL(YOUTUBE_URL)} color="#FF0000" />
           <SettingItem icon={Github} title="Official GitHub" desc="Check Source Code" onPress={() => Linking.openURL(GITHUB_URL)} color="#171515" />
           <TouchableOpacity style={styles.settingItem} onPress={() => setModalVisible(true)}>
              <View style={styles.settingIcon}><Info size={20} color="#fff"/></View>
              <View style={{flex:1}}><Text style={styles.settingText}>{t('terms')}</Text><Text style={styles.descTextSmall}>{t('terms_desc')}</Text></View>
              <ChevronRight size={20} color="#444" />
           </TouchableOpacity>
        </View>
        <Text style={{textAlign:'center', color:'#444', marginTop:50, marginBottom:30}}>Made with ❤️ for Solana Community</Text>
      </ScrollView>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {height: '80%'}]}>
            <View style={styles.rowBetween}><Text style={styles.modalTitle}>{t('terms_title')}</Text><TouchableOpacity onPress={() => setModalVisible(false)}><X color="#fff" /></TouchableOpacity></View>
            <ScrollView style={{marginTop: 10}}>
              {[1,2,3,4,5,6].map(n => <View key={n}><Text style={styles.termTitle}>{t(`term_${n}_title`)}</Text><Text style={styles.termText}>{t(`term_${n}_desc`)}</Text></View>)}
              <View style={{height: 50}}/>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};