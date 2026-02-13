import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Plus, Copy, Trash2 } from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { PublicKey } from '@solana/web3.js';

import { styles } from '../styles/globalStyles';
import { HeaderRow } from '../components/HeaderRow';
import { shortenAddress } from '../utils/solanaUtils';
// ★カスタムモーダルをインポート
import { SimpleAlertModal, ConfirmModal } from '../components/ActionModals';

export const AddressBookScreen = ({ t, contacts, onSave, notify, onBack }: any) => {
  // 連絡先追加用のモーダル表示状態
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState(''); 
  const [newAddr, setNewAddr] = useState('');

  // ★ アラート・確認用State
  const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'error' });
  const [confirm, setConfirm] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });

  const addContact = () => {
    if(!newName || !newAddr) return;
    try {
      new PublicKey(newAddr); 
      const updated = [...contacts, { name: newName, address: newAddr }];
      onSave(updated);
      setNewName(''); setNewAddr(''); setModalVisible(false);
      notify(t('added'));
    } catch(e) {
      // ★ setAlert を使用
      setAlert({ visible: true, title: t('error'), message: t('invalid_address'), type: 'error' });
    }
  };

  const deleteContact = (index: number) => {
    // ★ setConfirm を使用
    setConfirm({
      visible: true,
      title: t('delete'),
      message: t('confirm_delete'),
      onConfirm: () => {
        const updated = contacts.filter((_:any, i:number) => i !== index);
        onSave(updated);
        // 処理が終わったらモーダルを閉じる
        setConfirm(prev => ({ ...prev, visible: false }));
      }
    });
  };

  return (
    <View style={styles.content}>
      <HeaderRow title={t('address_book')} onBack={onBack} rightIcon={<TouchableOpacity onPress={() => setModalVisible(true)}><Plus size={24} color="#a855f7" /></TouchableOpacity>} />
      
      <ScrollView>
        {contacts.length === 0 ? <Text style={styles.descText}>Empty</Text> : contacts.map((c: any, i: number) => (
          <View key={i} style={styles.settingItem}>
             <View style={{flex:1}}>
               <Text style={styles.settingText}>{c.name}</Text>
               <Text style={styles.descTextSmall}>{shortenAddress(c.address)}</Text>
             </View>
             <View style={{flexDirection:'row', gap:15}}>
               <TouchableOpacity onPress={() => {Clipboard.setString(c.address); notify(t('copied'));}}>
                 <Copy size={20} color="#666" />
               </TouchableOpacity>
               <TouchableOpacity onPress={() => deleteContact(i)}>
                 <Trash2 size={20} color="#ef4444" />
               </TouchableOpacity>
             </View>
          </View>
        ))}
      </ScrollView>

      {/* 連絡先追加用モーダル */}
      {modalVisible && (
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContent}>
            <Text style={styles.sectionTitle}>{t('add_new')}</Text>
            <TextInput style={styles.inputField} placeholder={t('name')} placeholderTextColor="#666" value={newName} onChangeText={setNewName} />
            <TextInput style={styles.inputField} placeholder={t('address')} placeholderTextColor="#666" value={newAddr} onChangeText={setNewAddr} />
            <TouchableOpacity style={styles.primaryButton} onPress={addContact}>
              <Text style={styles.primaryButtonText}>{t('save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={{marginTop:15}}>
              <Text style={{color:'#666',textAlign:'center'}}>{t('close')}</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* ★カスタムモーダルを配置 */}
      <SimpleAlertModal 
        visible={alert.visible} 
        title={alert.title} 
        message={alert.message} 
        type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })} 
      />

      <ConfirmModal
        visible={confirm.visible}
        title={confirm.title}
        message={confirm.message}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        onCancel={() => setConfirm({ ...confirm, visible: false })}
        onConfirm={confirm.onConfirm}
      />
    </View>
  );
};