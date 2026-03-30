import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Share, Keyboard, Platform, StyleSheet, LayoutAnimation } from 'react-native';
import { Copy, Share2, Users, X, QrCode, ArrowRight, Check } from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction } from '@solana/spl-token';

// カメラ用のインポート
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';

import { styles } from '../styles/globalStyles';
import { HeaderRow } from '../components/HeaderRow';
import { shortenAddress } from '../utils/solanaUtils';
import { SimpleAlertModal, SuccessModal } from '../components/ActionModals';
import { refreshAssetsService } from '../services/refreshAssets';

import { useAssetStore } from '../state/assetStore';
import { SOL_MINT } from '../constants/config';

// ==========================================
// 受取画面 (ReceiveScreen)
// ==========================================
export const ReceiveScreen = ({ t, wallet, onBack, notify }: any) => {
  const address = wallet?.address || "";
  
  const handleCopy = () => {
    Clipboard.setString(address);
    notify(t('address_copied') || 'Address copied');
  };

  const handleShare = async () => {
    try { await Share.share({ message: address }); } catch (e) { console.log(e); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <HeaderRow title={t('receive') || 'Receive'} onBack={onBack} />
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
         <View style={{backgroundColor: 'white', padding: 20, borderRadius: 20, marginBottom: 30}}>
            <Image 
              source={{uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${address}`}} 
              style={{width: 200, height: 200}} 
            />
         </View>
         <Text style={{color: '#888', marginBottom: 10}}>{t('solana_address') || 'Your Solana Address'}</Text>
         <Text style={{color: 'white', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, marginHorizontal: 20}}>{address}</Text>
         <View style={{flexDirection: 'row', gap: 20}}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleCopy}>
              <Copy size={20} color="#a855f7" style={{marginRight: 8}} />
              <Text style={styles.secondaryButtonText}>{t('copy') || 'Copy'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleShare}>
              <Share2 size={20} color="#a855f7" style={{marginRight: 8}} />
              <Text style={styles.secondaryButtonText}>{t('share') || 'Share'}</Text>
            </TouchableOpacity>
         </View>
      </View>
    </View>
  );
};

// ==========================================
// 送金画面 (SendScreen)
// ==========================================
type SendStep = 'asset' | 'recipient' | 'amount' | 'confirm';

export const SendScreen = ({ t, wallet, connection, contacts, onBack, notify, preSelectedAsset }: any) => {
  const assets = useAssetStore((s) => s.assets);
  const sendableAssets = assets.filter((a: any) => a.mint !== 'native-stake' && a.decimals > 0);
  
  const [step, setStep] = useState<SendStep>(preSelectedAsset ? 'recipient' : 'asset');
  const [selectedAsset, setSelectedAsset] = useState<any>(preSelectedAsset || null);
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'error' });
  const [showSuccess, setShowSuccess] = useState(false);

  // ★ キーボードの高さを管理（ヌルッと動かす魔法）
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(e.endCoordinates.height);
    });
    
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // カメラ制御用のステートと設定
  const [isScanning, setIsScanning] = useState(false);
  const device = useCameraDevice('back');

  // QRコードを読み取った時の処理
  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && codes[0].value) {
        let scannedValue = codes[0].value;
        if (scannedValue.startsWith('solana:')) {
          scannedValue = scannedValue.replace('solana:', '').split('?')[0];
        }
        setAddress(scannedValue);
        setIsScanning(false);
        notify(t('qr_scanned') || 'QR Scanned! ✅');
      }
    }
  });

  // カメラボタンを押した時の権限チェック
  const handleOpenScanner = async () => {
    const permission = await Camera.requestCameraPermission();
    if (permission === 'granted') {
      setIsScanning(true);
    } else {
      setAlert({ 
        visible: true, 
        title: t('error') || 'Error', 
        message: t('camera_permission_denied') || 'Camera permission denied', 
        type: 'error' 
      });
    }
  };

  useEffect(() => {
    if (selectedAsset?.decimals === 0) setAmount('1');
  }, [selectedAsset]);

  const handleBackPress = () => {
    if (step === 'asset') return onBack();
    if (step === 'recipient') return preSelectedAsset ? onBack() : setStep('asset');
    if (step === 'amount') return setStep('recipient');
    if (step === 'confirm') return setStep('amount');
  };

  const goToAmount = () => {
    try {
      new PublicKey(address);
      setStep('amount');
    } catch {
      setAlert({ visible: true, title: t('error') || 'Error', message: t('invalid_address') || 'Invalid address', type: 'error' });
    }
  };

  const goToConfirm = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setAlert({ visible: true, title: t('error') || 'Error', message: 'Enter a valid amount', type: 'error' });
      return;
    }
    if (Number(amount) > selectedAsset.amount) {
      setAlert({ visible: true, title: t('error') || 'Error', message: 'Insufficient balance', type: 'error' });
      return;
    }
    setStep('confirm');
  };

  const executeSend = async () => {
    Keyboard.dismiss();
    setLoading(true);
    try {
      const fromPubkey = new PublicKey(wallet.address);
      const destPubkey = new PublicKey(address);
      const sendAmount = parseFloat(amount);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const transaction = new Transaction();

      if (selectedAsset.mint === SOL_MINT) {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey: destPubkey,
            lamports: Math.floor(sendAmount * LAMPORTS_PER_SOL),
          })
        );
      } else {
        const mintPubkey = new PublicKey(selectedAsset.mint);
        const fromATA = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
        const toATA = await getAssociatedTokenAddress(mintPubkey, destPubkey);
        const toAtaInfo = await connection.getAccountInfo(toATA);
        
        if (!toAtaInfo) {
          transaction.add(createAssociatedTokenAccountInstruction(fromPubkey, toATA, destPubkey, mintPubkey));
        }
        const multiplier = Math.pow(10, selectedAsset.decimals);
        transaction.add(createTransferInstruction(fromATA, toATA, fromPubkey, Math.floor(sendAmount * multiplier)));
      }
      
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      const keypair = Keypair.fromSecretKey(wallet.secretKey);
      const signature = await connection.sendTransaction(transaction, [keypair], {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      notify(t('sending') || 'Sending...');
      
      await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, 'confirmed');
      
      setShowSuccess(true);
      refreshAssetsService({ force: true });
    } catch (e: any) {
      console.error(e);
      setAlert({ visible: true, title: t('send_failed') || 'Failed', message: e.message || "Unknown error", type: 'error' });
    } finally { 
      setLoading(false); 
    }
  };

  const getHeaderTitle = () => {
    if (step === 'asset') return t('send') || 'Send';
    if (step === 'recipient') return t('select_recipient') || 'Select Recipient';
    if (step === 'amount') return `${t('send') || 'Send'} ${selectedAsset?.symbol}`;
    if (step === 'confirm') return t('confirm_transaction') || 'Confirm Transaction';
  };

  return (
    // ★ KeyboardAvoidingViewを外し、普通のViewで土台を作る
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <HeaderRow title={getHeaderTitle()} onBack={handleBackPress} />
      
      {/* ★ ここで画面の底をキーボードの高さ分だけ押し上げます */}
      <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
        
        {/* ---------------------------------------------------
            Step 1: アセット選択 (Select Asset)
        --------------------------------------------------- */}
        {step === 'asset' && (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}>
            <View style={styles.swapCard}>
              <Text style={[styles.sectionTitle]}>{t('your_assets') || 'Your Assets'}</Text>
              {sendableAssets.length === 0 ? (
                 <Text style={{ color: '#666', textAlign: 'center', paddingVertical: 20 }}>{t('no_assets_to_send') || 'No assets to send'}</Text>
              ) : (
                sendableAssets.map((a: any, i: number) => (
                  <TouchableOpacity 
                    key={i} 
                    style={[styles.tokenItem, { borderBottomWidth: 1, borderBottomColor: '#222', paddingVertical: 12 }]} 
                    onPress={() => { setSelectedAsset(a); setStep('recipient'); }}
                  >
                     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {a.logoURI ? (
                          <Image source={{ uri: a.logoURI }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                        ) : (
                          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#444' }} />
                        )}
                        <View>
                           <Text style={styles.tokenSym}>{a.name}</Text>
                           <Text style={styles.tokenName}>{a.amount} {a.symbol}</Text>
                        </View>
                     </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        )}

        {/* ---------------------------------------------------
            Step 2: 宛先入力 (Select Recipient)
        --------------------------------------------------- */}
        {step === 'recipient' && (
          // ★ ScrollViewからViewに戻して、ボタンプッシュアップを確実に効かせる
          <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 }}>
            <View style={styles.swapCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <TextInput 
                  style={[styles.input, { flex: 1, fontSize: 14, fontWeight: 'normal', borderWidth: 0 }]} 
                  placeholder={t('enter_solana_address') || 'Enter Solana address'} 
                  placeholderTextColor="#555" 
                  value={address} 
                  onChangeText={setAddress}
                  autoFocus={!isScanning}
                />
                <TouchableOpacity onPress={handleOpenScanner} style={{ padding: 8 }}>
                  <QrCode size={24} color="#888" />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>{t('your_addresses') || 'Your addresses'}</Text>
            {/* アドレス帳だけスクロールできるように設定 */}
            <ScrollView style={[styles.swapCard, { flex: 1, marginBottom: 16 }]} keyboardShouldPersistTaps="handled">
               {(!contacts || contacts.length === 0) ? (
                 <Text style={{ color: '#666', textAlign: 'center', paddingVertical: 20 }}>{t('no_saved_wallets') || 'No additional wallets found'}</Text>
               ) : (
                 contacts.map((c: any, i: number) => (
                  <TouchableOpacity 
                    key={i} 
                    style={[styles.tokenItem, { borderBottomWidth: 1, borderBottomColor: '#222', paddingVertical: 12 }]} 
                    onPress={() => { 
                      setAddress(c.address); 
                      setStep('amount'); 
                    }}
                  >
                     <View>
                       <Text style={styles.tokenSym}>{c.name}</Text>
                       <Text style={styles.tokenName}>{shortenAddress(c.address)}</Text>
                     </View>
                  </TouchableOpacity>
                 ))
               )}
            </ScrollView>

            <TouchableOpacity 
              style={[styles.primaryButton, (!address) && { backgroundColor: '#333' }]}
              disabled={!address} 
              onPress={goToAmount}
            >
              <Text style={styles.primaryButtonText}>{t('next') || 'Next'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ---------------------------------------------------
            Step 3: 数量入力 (Amount)
        --------------------------------------------------- */}
        {step === 'amount' && (
          // ★ こちらもViewに戻す
          <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 }}>
            <View style={{ alignItems: 'center', marginTop: 30, marginBottom: 30 }}>
               <Text style={{ color: '#888', fontSize: 20, marginBottom: 12 }}>{selectedAsset?.symbol}</Text>
               <TextInput 
                 style={{ 
                   color: '#fff', 
                   fontSize: amount.length > 12 ? 36 : (amount.length > 8 ? 48 : 64), 
                   fontWeight: 'bold', 
                   textAlign: 'center', 
                   width: '100%' 
                 }} 
                 placeholder="0" 
                 placeholderTextColor="#333" 
                 keyboardType="numeric" 
                 value={amount} 
                 onChangeText={setAmount} 
                 autoFocus
                 editable={selectedAsset?.decimals !== 0} 
               />
               <Text style={{ color: '#888', fontSize: 16, marginTop: 12 }}>
                 {t('available') || 'Available'}: {selectedAsset?.amount} {selectedAsset?.symbol}
               </Text>
            </View>

            {selectedAsset?.decimals !== 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
                <TouchableOpacity 
                  style={{ backgroundColor: '#1a1a1a', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}
                  onPress={() => setAmount(String(parseFloat((selectedAsset.amount / 2).toFixed(9))))}
                >
                  <Text style={{ color: '#a855f7', fontWeight: 'bold' }}>{t('half') || 'Half'}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ backgroundColor: '#1a1a1a', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}
                  onPress={() => {
                    const maxAmt = selectedAsset?.mint === SOL_MINT ? Math.max(0, selectedAsset.amount - 0.002) : selectedAsset?.amount;
                    setAmount(String(parseFloat(maxAmt.toFixed(9))));
                  }}
                >
                  <Text style={{ color: '#a855f7', fontWeight: 'bold' }}>{t('max') || 'Max'}</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flex: 1 }} />
            
            <TouchableOpacity 
              style={[styles.primaryButton, (!amount || Number(amount) <= 0) && { backgroundColor: '#333' }]}
              disabled={!amount || Number(amount) <= 0} 
              onPress={goToConfirm}
            >
              <Text style={styles.primaryButtonText}>{t('review') || 'Review'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ---------------------------------------------------
            Step 4: 最終確認 (Confirm Transaction)
        --------------------------------------------------- */}
        {step === 'confirm' && (
          <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 }}>
            <View style={{ alignItems: 'center', marginBottom: 30 }}>
              {selectedAsset?.logoURI ? (
                <Image source={{ uri: selectedAsset.logoURI }} style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 16 }} />
              ) : (
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#444', marginBottom: 16 }} />
              )}
              <Text 
                style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}
                adjustsFontSizeToFit={true}
                numberOfLines={1}
              >
                {amount} {selectedAsset?.symbol}
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>{t('transaction_preview') || 'Transaction preview'}</Text>
            <View style={styles.swapCard}>
               <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text style={{ color: '#888' }}>{t('to') || 'To'}</Text>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{shortenAddress(address)}</Text>
               </View>
               <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text style={{ color: '#888' }}>{t('network_fee') || 'Network Fee'}</Text>
                  <Text style={{ color: '#22c55e', fontWeight: 'bold' }}>~0.00001 SOL</Text>
               </View>
               <View style={{ height: 1, backgroundColor: '#333', marginBottom: 16 }} />
               <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', marginRight: 16 }}>{t('total_sent') || 'Total Sent'}</Text>
                  <Text 
                    style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, flexShrink: 1, textAlign: 'right' }}
                    adjustsFontSizeToFit={true}
                    numberOfLines={1}
                  >
                    {amount} {selectedAsset?.symbol}
                  </Text>
               </View>
            </View>

            <View style={{ flex: 1 }} />
            
            <TouchableOpacity 
              style={[styles.primaryButton, loading && { backgroundColor: '#333' }]}
              disabled={loading} 
              onPress={executeSend}
            >
              {loading ? (
                <Text style={styles.primaryButtonText}>{t('processing') || 'Processing...'}</Text>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Check size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>{t('approve_and_send') || 'Approve & Send'}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* カメラ起動時のフルスクリーンオーバーレイ */}
      {isScanning && device != null && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 100, backgroundColor: '#000' }]}>
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={isScanning}
            codeScanner={codeScanner}
          />
          <View style={{ position: 'absolute', top: 50, left: 20 }}>
            <TouchableOpacity onPress={() => setIsScanning(false)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 20 }}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={{ position: 'absolute', top: '25%', bottom: '25%', left: '15%', right: '15%', borderWidth: 2, borderColor: '#a855f7', borderRadius: 16 }} />
          <Text style={{ position: 'absolute', bottom: 100, width: '100%', textAlign: 'center', color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
            {t('scan_qr_code') || 'Scan QR Code'}
          </Text>
        </View>
      )}

      <SimpleAlertModal 
        visible={alert.visible} 
        title={alert.title} 
        message={alert.message} 
        type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })} 
      />
      <SuccessModal 
        visible={showSuccess} 
        message={t('send_success') || 'Sent Successfully!'} 
        onDone={() => { setShowSuccess(false); onBack(); }} 
      />
    </View>
  );
};