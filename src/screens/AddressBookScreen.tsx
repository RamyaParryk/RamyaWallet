import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Plus, Copy, Trash2, QrCode } from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { PublicKey } from '@solana/web3.js';
import { Camera } from 'react-native-vision-camera';

import { styles } from '../styles/globalStyles';
import { HeaderRow } from '../components/HeaderRow';
import { shortenAddress } from '../utils/solanaUtils';
import { SimpleAlertModal, ConfirmModal } from '../components/ActionModals';
import { QRScannerModal } from '../components/QRScannerModal';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { ADMOB_ANDROID_BANNER_ID as ADMOB_ANDROID_ENV } from '@env';

const BANNER_ESTIMATED_HEIGHT = 60;

export const AddressBookScreen = ({ t, contacts, onSave, notify, onBack }: any) => {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState(''); 
  const [newAddr, setNewAddr] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'error' });
  const [confirm, setConfirm] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });

  const adUnitId = useMemo(() => {
    if (Platform.OS !== 'android') return '';
    return (ADMOB_ANDROID_ENV || '').trim();
  }, []);
  const showBanner = adUnitId.length > 0;

  const addContact = () => {
    if(!newName || !newAddr) return;
    try {
      new PublicKey(newAddr); 
      const updated = [...contacts, { name: newName, address: newAddr }];
      onSave(updated);
      setNewName(''); setNewAddr(''); setModalVisible(false);
      notify(t('added') || 'Added');
    } catch(e) {
      setAlert({ visible: true, title: t('error') || 'Error', message: t('invalid_address') || 'Invalid Address', type: 'error' });
    }
  };

  const deleteContact = (index: number) => {
    setConfirm({
      visible: true,
      title: t('delete') || 'Delete',
      message: t('confirm_delete') || 'Are you sure?',
      onConfirm: () => {
        const updated = contacts.filter((_:any, i:number) => i !== index);
        onSave(updated);
        setConfirm(prev => ({ ...prev, visible: false }));
      }
    });
  };

  const handleOpenScanner = async () => {
    const permission = await Camera.requestCameraPermission();
    if (permission === 'granted') setIsScanning(true);
    else setAlert({ visible: true, title: t('error') || 'Error', message: t('camera_permission_denied') || 'Camera permission denied', type: 'error' });
  };

  const handleScan = (scannedValue: string) => {
    const value = scannedValue.trim();
    setIsScanning(false);
    const addressPart = value.replace('solana:', '').split('?')[0]; 
    setNewAddr(addressPart);
    notify(t('qr_scanned') || 'QR Scanned ✅');
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <HeaderRow 
        title={t('address_book') || 'Address Book'} 
        onBack={onBack} 
        rightIcon={
          <TouchableOpacity onPress={() => setModalVisible(true)} style={{ padding: 8 }}>
            <Plus size={24} color="#a855f7" />
          </TouchableOpacity>
        } 
      />
      
      <ScrollView 
        contentContainerStyle={{ 
          paddingHorizontal: 16, 
          paddingTop: 16,
          paddingBottom: showBanner ? BANNER_ESTIMATED_HEIGHT + 20 : 40 
        }}
      >
        {/* 🌟 修正: empty ではなく 翻訳ファイルの no_saved_wallets に変更 */}
        {contacts.length === 0 ? <Text style={styles.descText}>{t('no_saved_wallets') || 'No saved addresses'}</Text> : contacts.map((c: any, i: number) => (
          <View key={i} style={styles.settingItem}>
             <View style={{flex:1}}>
               <Text style={styles.settingText}>{c.name}</Text>
               <Text style={styles.descTextSmall}>{shortenAddress(c.address)}</Text>
             </View>
             <View style={{flexDirection:'row', gap:15}}>
               <TouchableOpacity onPress={() => {Clipboard.setString(c.address); notify(t('copied') || 'Copied');}}>
                 <Copy size={20} color="#666" />
               </TouchableOpacity>
               <TouchableOpacity onPress={() => deleteContact(i)}>
                 <Trash2 size={20} color="#ef4444" />
               </TouchableOpacity>
             </View>
          </View>
        ))}
      </ScrollView>

      {modalVisible && (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "padding"} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: 'auto', paddingBottom: 40 }]}>
            <Text style={styles.sectionTitle}>{t('add_new') || 'Add New'}</Text>
            
            {/* 🌟 修正: name_placeholder ではなく 翻訳ファイルの name に変更 */}
            <TextInput 
              style={styles.inputField} 
              placeholder={t('name') || 'Name'} 
              placeholderTextColor="#666" 
              value={newName} 
              onChangeText={setNewName} 
            />
            <View style={{ position: 'relative', width: '100%', marginBottom: 16 }}>
              {/* 🌟 修正: address_placeholder ではなく 翻訳ファイルの address に変更 */}
              <TextInput 
                style={[styles.inputField, { marginBottom: 0, paddingRight: 50 }]} 
                placeholder={t('address') || 'Address'} 
                placeholderTextColor="#666" 
                value={newAddr} 
                onChangeText={setNewAddr} 
              />
              <TouchableOpacity 
                onPress={handleOpenScanner} 
                style={{ position: 'absolute', right: 0, top: 0, bottom: 0, paddingHorizontal: 14, justifyContent: 'center' }}
              >
                <QrCode size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={addContact}>
              <Text style={styles.primaryButtonText}>{t('save') || 'Save'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setModalVisible(false)} style={{ marginTop: 16, paddingVertical: 10 }}>
              <Text style={{ color: '#666', textAlign: 'center', fontWeight: 'bold' }}>{t('close') || 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      <QRScannerModal visible={isScanning} onClose={() => setIsScanning(false)} onScan={handleScan} />
      <SimpleAlertModal visible={alert.visible} title={alert.title} message={alert.message} type={alert.type} onClose={() => setAlert({ ...alert, visible: false })} />
      <ConfirmModal visible={confirm.visible} title={confirm.title} message={confirm.message} confirmText={t('delete') || 'Delete'} cancelText={t('cancel') || 'Cancel'} onCancel={() => setConfirm({ ...confirm, visible: false })} onConfirm={confirm.onConfirm} />
      
      {showBanner && (
        <View style={[styles.bannerContainerFixed, { paddingBottom: insets.bottom }]}>
          <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
        </View>
      )}
    </View>
  );
};