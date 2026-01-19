import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Plus, Copy, Trash2 } from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { PublicKey } from '@solana/web3.js';

import { styles } from '../styles/globalStyles';
import { HeaderRow } from '../components/HeaderRow';
import { shortenAddress } from '../utils/solanaUtils';

export const AddressBookScreen = ({ t, contacts, onSave, notify, onBack }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState(''); const [newAddr, setNewAddr] = useState('');

  const addContact = () => {
    if(!newName || !newAddr) return;
    try {
      new PublicKey(newAddr); 
      const updated = [...contacts, { name: newName, address: newAddr }];
      onSave(updated);
      setNewName(''); setNewAddr(''); setModalVisible(false);
      notify(t('added'));
    } catch(e) {
      Alert.alert(t('error'), t('invalid_address'));
    }
  };

  const deleteContact = (index: number) => {
    Alert.alert(t('delete'), t('confirm_delete'), [
      { text: t('cancel'), style: "cancel" },
      { text: t('delete'), style: "destructive", onPress: () => {
          const updated = contacts.filter((_:any, i:number) => i !== index);
          onSave(updated);
      }}
    ]);
  };

  return (
    <View style={styles.content}>
      <HeaderRow title={t('address_book')} onBack={onBack} rightIcon={<TouchableOpacity onPress={() => setModalVisible(true)}><Plus size={24} color="#a855f7" /></TouchableOpacity>} />
      <ScrollView>{contacts.length === 0 ? <Text style={styles.descText}>Empty</Text> : contacts.map((c: any, i: number) => (
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
      ))}</ScrollView>
      {modalVisible && <View style={styles.modalOverlay}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContent}><Text style={styles.sectionTitle}>{t('add_new')}</Text><TextInput style={styles.inputField} placeholder={t('name')} value={newName} onChangeText={setNewName} /><TextInput style={styles.inputField} placeholder={t('address')} value={newAddr} onChangeText={setNewAddr} /><TouchableOpacity style={styles.primaryButton} onPress={addContact}><Text style={styles.primaryButtonText}>{t('save')}</Text></TouchableOpacity><TouchableOpacity onPress={() => setModalVisible(false)} style={{marginTop:15}}><Text style={{color:'#666',textAlign:'center'}}>{t('close')}</Text></TouchableOpacity></KeyboardAvoidingView></View>}
    </View>
  );
};