import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, Share } from 'react-native';
import { Copy, Share2, Users, X } from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

import { styles } from '../styles/globalStyles';
import { HeaderRow } from '../components/HeaderRow'; // ★さっき作ったやつ
import { shortenAddress } from '../utils/solanaUtils';

// --- 受取画面 ---
export const ReceiveScreen = ({ t, wallet, onBack, notify }: any) => {
  const address = wallet?.address || "";
  
  const handleCopy = () => {
    Clipboard.setString(address);
    notify(t('address_copied'));
  };

  const handleShare = async () => {
    try { await Share.share({ message: address }); } catch (e) { console.log(e); }
  };

  return (
    <View style={styles.content}>
      <HeaderRow title={t('receive')} onBack={onBack} />
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
         <View style={{backgroundColor: 'white', padding: 20, borderRadius: 20, marginBottom: 30}}>
            <Image 
              source={{uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${address}`}} 
              style={{width: 200, height: 200}} 
            />
         </View>
         <Text style={{color: '#888', marginBottom: 10}}>{t('solana_address')}</Text>
         <Text style={{color: 'white', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, marginHorizontal: 20}}>{address}</Text>
         <View style={{flexDirection: 'row', gap: 20}}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleCopy}>
              <Copy size={20} color="#a855f7" style={{marginRight: 8}} />
              <Text style={styles.secondaryButtonText}>{t('copy')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleShare}>
              <Share2 size={20} color="#a855f7" style={{marginRight: 8}} />
              <Text style={styles.secondaryButtonText}>{t('share')}</Text>
            </TouchableOpacity>
         </View>
      </View>
    </View>
  );
};

// --- 送金画面 ---
export const SendScreen = ({ t, wallet, connection, contacts, onBack, notify }: any) => {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showContacts, setShowContacts] = useState(false);

  const handleSend = async () => {
    if (!address || !amount) return;
    setLoading(true);
    try {
      const destPubkey = new PublicKey(address);
      const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(wallet.address),
          toPubkey: destPubkey,
          lamports: lamports,
        })
      );
      
      const keypair = Keypair.fromSecretKey(wallet.secretKey);
      const signature = await connection.sendTransaction(transaction, [keypair]);
      notify(t('sending'));
      await connection.confirmTransaction(signature);
      
      Alert.alert(t('send_success'), `Tx: ${signature.slice(0,8)}...`);
      setAddress(''); setAmount(''); onBack();
    } catch (e: any) {
      Alert.alert(t('send_failed'), e.message);
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.content}>
      <HeaderRow title={t('send')} onBack={onBack} rightIcon={<TouchableOpacity onPress={() => setShowContacts(true)}><Users size={24} color="#a855f7"/></TouchableOpacity>} />
      <ScrollView>
        <View style={styles.swapCard}>
          <Text style={styles.label}>{t('recipient')}</Text>
          <TextInput 
            style={[styles.input, {fontSize: 14, fontWeight:'normal'}]} 
            placeholder="Address" placeholderTextColor="#555" 
            value={address} onChangeText={setAddress} multiline
          />
        </View>
        <View style={[styles.swapCard, {marginTop: 20}]}>
          <Text style={styles.label}>{t('amount_sol')}</Text>
          <TextInput 
            style={styles.input} placeholder="0.00" placeholderTextColor="#555" 
            keyboardType="numeric" value={amount} onChangeText={setAmount} 
          />
        </View>
        <TouchableOpacity 
          style={[styles.primaryButton, {marginTop: 40}, (!address || !amount || loading) && {backgroundColor: '#333'}]}
          disabled={!address || !amount || loading} onPress={handleSend}
        >
          <Text style={styles.primaryButtonText}>{loading ? t('processing') : t('send')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {showContacts && (
        <View style={styles.modalOverlay}>
           <View style={styles.modalContent}>
              <View style={[styles.rowBetween, {marginBottom:15}]}><Text style={styles.sectionTitle}>{t('address_book')}</Text><TouchableOpacity onPress={() => setShowContacts(false)}><X color="#fff" /></TouchableOpacity></View>
              <ScrollView>
                 {contacts.length === 0 ? <Text style={{color:'#666',marginTop:20}}>Empty</Text> : 
                   contacts.map((c:any, i:number) => (
                    <TouchableOpacity key={i} style={[styles.tokenItem, {borderBottomWidth:1, borderBottomColor:'#333'}]} onPress={() => { setAddress(c.address); setShowContacts(false); }}>
                       <View><Text style={styles.tokenSym}>{c.name}</Text><Text style={styles.tokenName}>{shortenAddress(c.address)}</Text></View>
                    </TouchableOpacity>
                 ))}
              </ScrollView>
           </View>
        </View>
      )}
    </View>
  );
};