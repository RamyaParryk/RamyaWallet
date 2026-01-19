import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Linking } from 'react-native';
import { 
  Users, ShieldCheck, Server, Globe, CircleHelp, Info, LogOut, 
  ChevronRight, Youtube, Github, ExternalLink 
} from 'lucide-react-native';
import { styles } from '../styles/globalStyles';

// 設定項目の共通パーツ
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

export const SettingsScreen = ({ t, onNavigate, onLogout }: any) => {
  return (
    <ScrollView style={styles.content}>
      <Text style={styles.screenTitle}>{t('settings')}</Text>
      
      <Text style={styles.sectionHeader}>{t('general')}</Text>
      <SettingItem icon={Users} title={t('address_book')} onPress={() => onNavigate('address_book')} />
      <SettingItem icon={ShieldCheck} title={t('security')} onPress={() => onNavigate('settings_security')} />
      <SettingItem icon={Server} title={t('network')} onPress={() => onNavigate('settings_network')} />
      <SettingItem icon={Globe} title={t('language')} onPress={() => onNavigate('settings_lang')} />
  
      <Text style={styles.sectionHeader}>{t('support')}</Text>
      <SettingItem icon={CircleHelp} title={t('help')} onPress={() => onNavigate('settings_help')} />
      <SettingItem icon={Info} title={t('about')} onPress={() => onNavigate('settings_about')} />
  
      <TouchableOpacity style={[styles.settingItem, {marginTop: 20}]} onPress={onLogout}>
         <View style={[styles.settingIcon, {backgroundColor:'#3f0f0f'}]}>
           <LogOut size={20} color="#ef4444"/>
         </View>
         <Text style={[styles.settingText, {color:'#ef4444'}]}>{t('logout')}</Text>
      </TouchableOpacity>
      
      <Text style={styles.versionText}>Version 1.0.1</Text>
      <View style={{height: 50}} />
    </ScrollView>
  );
};