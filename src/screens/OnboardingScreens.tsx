import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, ActivityIndicator, Image, 
  TextInput, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { Zap, Download, ShieldCheck } from 'lucide-react-native';
import { validateMnemonic } from 'bip39';
import { SeedVault } from '@solana-mobile/seed-vault-lib';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../styles/globalStyles';
import { HeaderRow } from '../components/HeaderRow';
import { wait } from '../utils/solanaUtils';
import { SimpleAlertModal } from '../components/ActionModals';

// --- スプラッシュ画面 ---
export const SplashScreen = () => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#2e1065',
      paddingTop: insets.top,
      paddingBottom: insets.bottom
    }]}>
      <Image source={require('../../assets/splash.png')} style={{ width: '50%', height: undefined, aspectRatio: 1, resizeMode: 'contain' }} />
    </View>
  );
};

// --- ウェルカム画面 ---
export const WelcomeScreen = ({ t, onStart, onImport, onStartSeedVault }: any) => {
  const [hasSeedVault, setHasSeedVault] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const checkDevice = async () => {
      try {
        if (Platform.OS === 'android') {
          const available = await SeedVault.isSeedVaultAvailable(false);
          setHasSeedVault(available); 
        } else {
          setHasSeedVault(false); 
        }
      } catch (e) {
        setHasSeedVault(false);
      }
    };
    checkDevice();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <ScrollView 
        contentContainerStyle={{ 
          flexGrow: 1, 
          alignItems: 'center', 
          justifyContent: 'center',
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 20), 
          paddingHorizontal: 16
        }}
      >
        <View style={[styles.logoBox, { marginTop: 40 }]}><Zap size={40} color="white" fill="white" /></View>
        <Text style={styles.title}>{t('welcome_title') || 'Ramya Wallet'}</Text>
        <Text style={styles.subtitle}>{t('welcome_subtitle') || 'Safe, Fast, Simple.'}</Text>
        
        <View style={{ flex: 1, minHeight: 20 }} /> 

        {hasSeedVault && (
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#22c55e', marginBottom: 16 }]} onPress={onStartSeedVault}>
            <ShieldCheck size={20} color="#fff" style={{marginRight: 8}} />
            <Text style={styles.primaryButtonText}>{t('connect_seed_vault') || 'Connect Seed Vault'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.primaryButton, { marginBottom: 16 }]} onPress={onStart}>
          <Text style={styles.primaryButtonText}>{t('create_new') || 'Create New Wallet'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.secondaryButton, { marginBottom: 20 }]} onPress={onImport}>
          <Download size={20} color="#a855f7" style={{marginRight:8}} />
          <Text style={styles.secondaryButtonText}>{t('import_wallet') || 'Import Existing Wallet'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// --- インポート画面 ---
export const ImportWalletScreen = ({ t, onBack, onImport }: any) => {
  const [mnemonic, setMnemonic] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '' });
  const insets = useSafeAreaInsets();

  const handleImport = async () => {
    const cleanMnemonic = mnemonic
      .replace(/\s+/g, ' ') 
      .trim()
      .toLowerCase(); 

    if (!cleanMnemonic) return;
    if (!validateMnemonic(cleanMnemonic)) {
      setAlert({ visible: true, title: t('error') || 'Error', message: t('invalid_phrase') || 'Invalid recovery phrase' });
      return;
    }
    setLoading(true);
    await wait(500);
    const success = await onImport(cleanMnemonic);
    if (!success) setLoading(false);
  };

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#000',
      paddingTop: insets.top,
      paddingBottom: insets.bottom 
    }}>
      <HeaderRow title={t('import_wallet') || 'Import Wallet'} onBack={onBack} />
      
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 }}>
          <Text style={styles.descText}>{t('import_phrase_desc') || 'Enter your 12 or 24-word recovery phrase.'}</Text>
          
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
            {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.primaryButtonText}>{t('import_wallet') || 'Import Wallet'}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <SimpleAlertModal 
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </View>
  );
};

// --- ローディング画面 ---
export const LoadingScreen = ({ t, onFinish }: any) => {
  const insets = useSafeAreaInsets();
  useEffect(() => { onFinish(); }, []);
  return (
    <View style={[styles.centerContent, { 
      backgroundColor: '#000',
      paddingTop: insets.top,
      paddingBottom: insets.bottom 
    }]}>
      <ActivityIndicator size="large" color="#a855f7" />
      <Text style={styles.subtitle}>{t('loading_mnemonic') || 'Generating recovery phrase...'}</Text>
    </View>
  );
};

// --- 作成画面 ---
export const CreateWalletScreen = ({ t, wallet, onConfirm }: any) => {
  const insets = useSafeAreaInsets();
  const words = wallet?.mnemonic ? wallet.mnemonic.split(' ') : [];
  
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <ScrollView 
        contentContainerStyle={{ 
          flexGrow: 1,
          paddingHorizontal: 16, 
          paddingTop: Math.max(insets.top, 10), 
          paddingBottom: Math.max(insets.bottom, 20) 
        }}
        bounces={false} 
      >
        <Text style={[styles.screenTitle, { marginTop: 20 }]}>{t('secret_phrase_title') || 'Secret Recovery Phrase'}</Text>
        <Text style={styles.descText}>{t('secret_phrase_desc') || 'These 12 words are the ONLY way to recover your wallet.'}</Text>
        
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
          <Text style={styles.warningText}>{t('warning_share') || 'Never share this with anyone.'}</Text>
        </View>
        
        <TouchableOpacity style={[styles.primaryButton, { marginTop: 'auto', marginBottom: 10 }]} onPress={onConfirm}>
          <Text style={styles.primaryButtonText}>{t('saved_btn') || 'I saved it'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};