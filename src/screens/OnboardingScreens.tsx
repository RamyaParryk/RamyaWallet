import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Zap, Download, ShieldCheck } from 'lucide-react-native';
import { validateMnemonic } from 'bip39';

import { styles } from '../styles/globalStyles';
import { HeaderRow } from '../components/HeaderRow';
import { wait } from '../utils/solanaUtils';

// --- スプラッシュ画面 ---
export const SplashScreen = () => (
  <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#2e1065' }]}>
    <Image source={require('../../assets/splash.png')} style={{ width: '50%', height: undefined, aspectRatio: 1, resizeMode: 'contain' }} />
  </View>
);

// --- ウェルカム画面 ---
export const WelcomeScreen = ({ t, onStart, onImport }: any) => (
  <View style={styles.centerContent}>
    <View style={styles.logoBox}><Zap size={40} color="white" fill="white" /></View>
    <Text style={styles.title}>{t('welcome_title')}</Text>
    <Text style={styles.subtitle}>{t('welcome_subtitle')}</Text>
    
    <TouchableOpacity style={styles.primaryButton} onPress={onStart}>
      <Text style={styles.primaryButtonText}>{t('create_new')}</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.secondaryButton} onPress={onImport}>
      <Download size={20} color="#a855f7" style={{marginRight:8}} />
      <Text style={styles.secondaryButtonText}>{t('import_wallet')}</Text>
    </TouchableOpacity>
  </View>
);

// --- インポート画面 ---
export const ImportWalletScreen = ({ t, onBack, onImport }: any) => {
  const [mnemonic, setMnemonic] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    const cleanMnemonic = mnemonic.trim().toLowerCase(); 
    if (!cleanMnemonic) return;
    if (!validateMnemonic(cleanMnemonic)) {
      Alert.alert(t('error'), t('invalid_phrase'));
      return;
    }
    setLoading(true);
    await wait(500);
    const success = await onImport(cleanMnemonic);
    if (!success) setLoading(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <HeaderRow title={t('import_wallet')} onBack={onBack} />
        <Text style={styles.descText}>{t('secret_phrase_desc')}</Text>
        <TextInput 
          style={styles.mnemonicInput}
          placeholder="apple banana cherry..."
          placeholderTextColor="#555"
          multiline numberOfLines={4}
          value={mnemonic} onChangeText={setMnemonic}
          autoCapitalize="none" autoCorrect={false}
        />
        <TouchableOpacity 
          style={[styles.primaryButton, (!mnemonic || loading) && {backgroundColor:'#333'}]} 
          onPress={handleImport} disabled={!mnemonic || loading}
        >
          {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.primaryButtonText}>{t('import_wallet')}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// --- ローディング画面 ---
export const LoadingScreen = ({ t, onFinish }: any) => {
  useEffect(() => { onFinish(); }, []);
  return (
    <View style={styles.centerContent}>
      <ActivityIndicator size="large" color="#9333ea" />
      <Text style={styles.subtitle}>{t('loading_mnemonic')}</Text>
    </View>
  );
};

// --- 作成画面 ---
export const CreateWalletScreen = ({ t, wallet, onConfirm }: any) => {
  const words = wallet?.mnemonic ? wallet.mnemonic.split(' ') : [];
  return (
    <View style={styles.content}>
      <Text style={styles.screenTitle}>{t('secret_phrase_title')}</Text>
      <Text style={styles.descText}>{t('secret_phrase_desc')}</Text>
      <View style={styles.mnemonicContainer}>
        {words.map((word: string, i: number) => (
          <View key={i} style={styles.wordTag}>
            <Text style={styles.wordNum}>{i+1}</Text>
            <Text style={styles.wordText}>{word}</Text>
          </View>
        ))}
      </View>
      <View style={styles.warningBox}>
        <ShieldCheck size={20} color="#eab308" />
        <Text style={styles.warningText}>{t('warning_share')}</Text>
      </View>
      <TouchableOpacity style={[styles.primaryButton, {marginTop: 'auto'}]} onPress={onConfirm}>
        <Text style={styles.primaryButtonText}>{t('saved_btn')}</Text>
      </TouchableOpacity>
    </View>
  );
};