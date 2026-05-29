import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowLeft, X } from 'lucide-react-native';
import ReactNativeBiometrics from 'react-native-biometrics';
import { styles } from '../styles/globalStyles';
import { SimpleAlertModal } from '../components/ActionModals';

// --- ロック解除画面 ---
export const UnlockScreen = ({ t, correctPin, biometricsEnabled, onUnlock, onLogout }: any) => {
  const [pin, setPin] = useState('');
  const rnBiometrics = new ReactNativeBiometrics();
  const [alert, setAlert] = useState({ visible: false, title: '', message: '' });

  useEffect(() => {
    if (biometricsEnabled) {
      checkBiometrics();
    }
  }, []);

  const checkBiometrics = async () => {
    try {
      // 🌟 修正：センサーが有効か先にチェックし、エラー発生を防ぐ
      const { available } = await rnBiometrics.isSensorAvailable();
      if (!available) return;

      // 🌟 修正：翻訳テキストがない場合のフォールバック文字列を追加
      const { success } = await rnBiometrics.simplePrompt({ 
        promptMessage: t('welcome_back') || 'Welcome Back' 
      });
      
      if (success) onUnlock();
    } catch (e) {
      // 🌟 修正：エラーの握りつぶしをやめ、コンソールに出力する
      console.log('Biometrics error:', e);
    }
  };

  const handlePress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        if (newPin === correctPin) {
          setTimeout(onUnlock, 100);
        } else {
          setAlert({ visible: true, title: t('error') || 'Error', message: t('pin_mismatch') || 'PIN mismatch' });
        }
      }
    }
  };

  return (
    <View style={[styles.pinContainer, { backgroundColor: 'transparent' }]}>
      <Text style={styles.pinTitle}>{t('welcome_back') || 'Welcome Back'}</Text>
      <Text style={styles.pinDesc}>{t('enter_pin') || 'Enter PIN'}</Text>
      <View style={styles.pinDots}>
        {[...Array(4)].map((_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotActive]} />
        ))}
      </View>
      <View style={styles.numPad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <TouchableOpacity key={num} style={styles.numBtn} onPress={() => handlePress(num.toString())}>
            <Text style={styles.numText}>{num}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.numBtnPlaceholder} />
        <TouchableOpacity style={styles.numBtn} onPress={() => handlePress("0")}>
          <Text style={styles.numText}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.numBtn} onPress={() => setPin(pin.slice(0, -1))}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      {biometricsEnabled && (
         <TouchableOpacity style={{marginTop: 30}} onPress={checkBiometrics}>
           <Text style={{color: '#a855f7', fontWeight:'bold'}}>{t('use_biometrics') || 'Use Biometrics'}</Text>
         </TouchableOpacity>
      )}
      <TouchableOpacity style={{marginTop: 30}} onPress={onLogout}>
        <Text style={{color: '#666'}}>{t('logout_reset') || 'Logout / Reset'}</Text>
      </TouchableOpacity>

      <SimpleAlertModal 
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() => { setAlert({ ...alert, visible: false }); setPin(''); }}
      />
    </View>
  );
};

// --- PIN設定画面 ---
export const PinSetupScreen = ({ t, onSuccess, onCancel }: any) => {
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [alert, setAlert] = useState({ visible: false, title: '', message: '' });

  const handlePress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        setTimeout(() => handleComplete(newPin), 100);
      }
    }
  };

  const handleComplete = (inputPin: string) => {
    if (step === 'create') {
      setFirstPin(inputPin);
      setPin('');
      setStep('confirm');
    } else {
      if (inputPin === firstPin) {
        onSuccess(inputPin);
      } else {
        setAlert({ visible: true, title: t('error') || 'Error', message: t('pin_mismatch') || 'PIN mismatch' });
      }
    }
  };

  return (
    <View style={[styles.pinContainer, { backgroundColor: 'transparent' }]}>
      <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
        <X size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.pinTitle}>{step === 'create' ? (t('pin_setup') || 'PIN Setup') : "OK"}</Text>
      <View style={styles.pinDots}>
        {[...Array(4)].map((_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotActive]} />
        ))}
      </View>
      <View style={styles.numPad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <TouchableOpacity key={num} style={styles.numBtn} onPress={() => handlePress(num.toString())}>
            <Text style={styles.numText}>{num}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.numBtnPlaceholder} />
        <TouchableOpacity style={styles.numBtn} onPress={() => handlePress("0")}>
          <Text style={styles.numText}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.numBtn} onPress={() => setPin(pin.slice(0, -1))}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <SimpleAlertModal 
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() => { 
          setAlert({ ...alert, visible: false }); 
          setStep('create'); setPin(''); setFirstPin(''); 
        }}
      />
    </View>
  );
};