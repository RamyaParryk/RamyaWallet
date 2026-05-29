import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Share, Keyboard, Platform, StyleSheet, LayoutAnimation, KeyboardAvoidingView } from 'react-native';
import { Copy, Share2, QrCode, Check, CreditCard } from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction } from '@solana/spl-token';
import { Camera } from 'react-native-vision-camera';
import { signWithSeedVault, shortenAddress } from '../utils/solanaUtils'; 
import { styles as globalStyles } from '../styles/globalStyles';
import { HeaderRow } from '../components/HeaderRow';
import { SimpleAlertModal, SuccessModal } from '../components/ActionModals';
import { refreshAssetsService } from '../services/refreshAssets';
import { SOL_MINT } from '../constants/config';
import { useAssetStore } from '../state/assetStore';
import { useWalletConnectStore } from '../state/walletConnectStore';
import { QRScannerModal } from '../components/QRScannerModal';
import { HCESession, NFCTagType4, NFCTagType4NDEFContentType } from 'react-native-hce';
import NfcManager, { NfcTech, NfcEvents } from 'react-native-nfc-manager';

const SOLANA_PAY_SCHEME = 'solana:';

const safeNotify = (notify: any, message: string) => { try { notify?.(message); } catch {} };
const sanitizeAmount = (value: string) => value.replace(',', '.').trim();

const extractSolanaUri = (text: string | null | undefined): string | null => {
  if (!text) return null;
  const match = text.match(/solana:[A-Za-z0-9?=&._:%\-]+/);
  return match ? match[0] : null;
};
const bytesToString = (bytes: number[]) => { try { return String.fromCharCode(...bytes); } catch { return ''; } };
const decodeNdefTextPayload = (payload: number[]) => { if (!payload || payload.length === 0) return ''; const status = payload[0]; const langLength = status & 0x3f; return bytesToString(payload.slice(1 + langLength)); };
const decodeNdefUrlPayload = (payload: number[]) => { if (!payload || payload.length === 0) return ''; const prefixMap: Record<number, string> = { 0x00: '', 0x01: 'http://www.', 0x02: 'https://www.', 0x03: 'http://', 0x04: 'https://', }; const prefix = prefixMap[payload[0]] ?? ''; const rest = bytesToString(payload.slice(1)); return `${prefix}${rest}`; };
const decodeNdefMessageFromTag = (tag: any): string | null => {
  try {
    const message = tag?.ndefMessage;
    if (!Array.isArray(message) || message.length === 0) return null;
    for (const record of message) {
      const payload: number[] = Array.from(record?.payload || []);
      const typeBytes: number[] = Array.from(record?.type || []);
      const type = bytesToString(typeBytes);
      if (!payload.length) continue;
      const candidates = [ type === 'U' ? decodeNdefUrlPayload(payload) : '', type === 'T' ? decodeNdefTextPayload(payload) : '', decodeNdefTextPayload(payload), decodeNdefUrlPayload(payload), bytesToString(payload) ];
      for (const candidate of candidates) { const found = extractSolanaUri(candidate); if (found) return found; }
    }
  } catch (e) { console.log('[NFC] decode error:', e); }
  return null;
};

// ==========================================
// 🌟 1. 受け取る側 (ReceiveScreen)
// ==========================================
export const ReceiveScreen = ({ t, wallet, onBack, notify }: any) => {
  const address = wallet?.address || '';
  const [receiveMode, setReceiveMode] = useState<'qr' | 'nfc'>('qr');
  const [amount, setAmount] = useState('');
  const [isReady, setIsReady] = useState(false); 

  useEffect(() => {
    let session: HCESession | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    setIsReady(false);
    const stopReaderMode = async () => { try { NfcManager.setEventListener(NfcEvents.DiscoverTag, null); await NfcManager.unregisterTagEvent().catch(() => {}); await NfcManager.cancelTechnologyRequest().catch(() => {}); } catch {} };

    const startHceSession = async () => {
      if (Platform.OS !== 'android' || receiveMode !== 'nfc' || !address) return;
      try {
        await stopReaderMode();
        const cleanAmount = sanitizeAmount(amount);
        const paymentUri = cleanAmount ? `${SOLANA_PAY_SCHEME}${address}?amount=${encodeURIComponent(cleanAmount)}` : `${SOLANA_PAY_SCHEME}${address}`;
        const tag = new NFCTagType4({ type: NFCTagType4NDEFContentType.URL, content: paymentUri, writable: false });
        session = await HCESession.getInstance();
        await session.setEnabled(false).catch(() => {});
        if (disposed) return;
        await session.setApplication(tag);
        if (disposed) return;
        await session.setEnabled(true);
        if (!disposed) setIsReady(true);
      } catch (e) {
        safeNotify(notify, t('nfc_failed') || 'NFCエラーが発生しました');
        if (session) await session.setEnabled(false).catch(() => {});
      }
    };
    timer = setTimeout(startHceSession, 500);
    return () => { disposed = true; if (timer) clearTimeout(timer); if (session) session.setEnabled(false).catch(() => {}); };
  }, [receiveMode, amount, address, notify, t]);

  const handleCopy = () => { Clipboard.setString(address); safeNotify(notify, t('address_copied') || 'アドレスをコピーしました'); };
  const handleShare = async () => { try { await Share.share({ message: address }); } catch {} };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <HeaderRow title={t('receive') || '受取る'} onBack={onBack} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, alignItems: 'center', paddingTop: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <View style={localStyles.tabContainer}>
            <TouchableOpacity style={[localStyles.tabButton, receiveMode === 'qr' && localStyles.activeTab]} onPress={() => { LayoutAnimation.easeInEaseOut(); setReceiveMode('qr'); }}>
              <QrCode size={18} color={receiveMode === 'qr' ? '#fff' : '#666'} /><Text style={[localStyles.tabText, receiveMode === 'qr' && localStyles.activeTabText]}>QR Code</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[localStyles.tabButton, receiveMode === 'nfc' && localStyles.activeTab]} onPress={() => { LayoutAnimation.easeInEaseOut(); setReceiveMode('nfc'); }}>
              <CreditCard size={18} color={receiveMode === 'nfc' ? '#fff' : '#666'} /><Text style={[localStyles.tabText, receiveMode === 'nfc' && localStyles.activeTabText]}>{t('nfc_payment') || 'タッチ決済 (NFC)'}</Text>
            </TouchableOpacity>
          </View>

          {receiveMode === 'qr' ? (
            <View style={{ alignItems: 'center', width: '100%' }}>
              <View style={localStyles.qrWrapper}><Image source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(address)}&color=fff&bgcolor=1a1a1a` }} style={{ width: 220, height: 220 }} /></View>
              <View style={globalStyles.card}>
                <Text style={globalStyles.screenTitle} numberOfLines={2}>{address}</Text>
                <View style={localStyles.btnRow}>
                  <TouchableOpacity style={localStyles.iconBtn} onPress={handleCopy}><Copy size={20} color="#fff" /><Text style={localStyles.btnText}>{t('copy') || 'コピー'}</Text></TouchableOpacity>
                  <TouchableOpacity style={localStyles.iconBtn} onPress={handleShare}><Share2 size={20} color="#fff" /><Text style={localStyles.btnText}>{t('share') || '共有'}</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View style={{ width: '100%', alignItems: 'center' }}>
              <View style={[localStyles.qrWrapper, { padding: 30, justifyContent: 'center' }]}> 
                <CreditCard size={80} color={isReady ? '#a855f7' : '#444'} />
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', marginTop: 16, textAlign: 'center', lineHeight: 22 }}>
                  {!isReady ? (t('nfc_updating') || '金額を反映中...') : amount ? `${amount} SOL\n${t('nfc_tap_ready') || 'かざしてください'}` : (t('nfc_receive_instruction') || 'かざしてアドレスのみ共有\nまたは、金額を入力してかざす')}
                </Text>
              </View>
              <View style={[globalStyles.card, { paddingVertical: 12 }]}> 
                <Text style={[globalStyles.cardLabel, { textAlign: 'left', marginBottom: 6 }]}>{t('amount_sol') || '金額 (SOL)'}</Text>
                <TextInput style={[globalStyles.amountInputLarge, { marginBottom: 0 }]} placeholder="0.00" placeholderTextColor="#444" keyboardType="numeric" value={amount} onChangeText={setAmount} />
              </View>
              <Text style={{ color: '#666', fontSize: 13, marginTop: 12, textAlign: 'center' }}>{t('nfc_scan_holding') || '相手のスマホにかざしてください...'}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// ==========================================
// 🌟 2. 送る側 (SendScreen)
// ==========================================
type SendStep = 'asset' | 'recipient' | 'amount' | 'confirm';

export const SendScreen = ({ t, wallet, connection, contacts, onBack, notify, preSelectedAsset, preSelectedAddress, preSelectedAmount }: any) => {
  const assets = useAssetStore((s) => s.assets);
  const sendableAssets = assets.filter((a: any) => a.mint !== 'native-stake' && a.mint !== 'staked-skr' && a.decimals > 0);
  const initialStep = preSelectedAsset && preSelectedAddress && preSelectedAmount ? 'confirm' : preSelectedAsset ? 'recipient' : 'asset';

  const [step, setStep] = useState<SendStep>(initialStep);
  const [selectedAsset, setSelectedAsset] = useState<any>(preSelectedAsset || null);
  const [address, setAddress] = useState(preSelectedAddress || '');
  const [amount, setAmount] = useState(preSelectedAmount || '');

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'error' });
  const [showSuccess, setShowSuccess] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const handleUniversalScan = (scannedValue: string) => {
    const value = scannedValue.trim();
    setIsScanning(false);
    if (value.startsWith('wc:')) { safeNotify(notify, t('processing') || '接続中...'); useWalletConnectStore.getState().pair(value).catch(() => {}); return; }
    if (value.startsWith(SOLANA_PAY_SCHEME)) {
      const urlStr = value.replace(SOLANA_PAY_SCHEME, '');
      const [addressPart, ...queryParts] = urlStr.split('?');
      const queryPart = queryParts.join('?');
      setAddress(addressPart);
      let hasAmount = false; let hasToken = false;
      if (queryPart) {
        const params: Record<string, string> = {};
        queryPart.split('&').forEach(pair => { const [k, v] = pair.split('='); if (k && v) params[k] = decodeURIComponent(v); });
        const parsedAmount = params['amount'];
        const parsedToken = params['spl-token'] || params['mint'];
        if (parsedAmount) { setAmount(parsedAmount); hasAmount = true; }
        if (parsedToken) {
          const foundAsset = assets.find((a: any) => a.mint === parsedToken);
          if (foundAsset) { setSelectedAsset(foundAsset); hasToken = true; }
        }
      }
      if (selectedAsset || hasToken) setStep(hasAmount ? 'confirm' : 'amount');
      else setStep(hasAmount ? 'amount' : 'recipient');
      safeNotify(notify, t('qr_scanned') || 'スキャン成功！ ✅');
      return;
    }
    setAddress(value);
    setStep(selectedAsset ? 'amount' : 'recipient');
    safeNotify(notify, t('qr_scanned') || 'スキャン成功！ ✅');
  };

  const handleOpenScanner = async () => {
    const permission = await Camera.requestCameraPermission();
    if (permission === 'granted') setIsScanning(true);
    else setAlert({ visible: true, title: t('error') || 'エラー', message: t('camera_permission_denied') || 'カメラの権限がありません', type: 'error' });
  };
  const transceiveIsoDep = async (cmd: number[]): Promise<number[]> => { const manager: any = NfcManager; const result = manager.isoDepHandler?.transceive ? await manager.isoDepHandler.transceive(cmd) : manager.transceive ? await manager.transceive(cmd) : null; if (!result) throw new Error('IsoDep transceive is not available'); return Array.from(result as number[]); };
  const isSuccessApdu = (res: number[]) => res.length >= 2 && res[res.length - 2] === 0x90 && res[res.length - 1] === 0x00;
  const trimStatus = (res: number[]) => (res.length >= 2 ? res.slice(0, res.length - 2) : res);
  const trySelectNdefApp = async () => { const candidates = [ [0x00, 0xa4, 0x04, 0x00, 0x07, 0xd2, 0x76, 0x00, 0x00, 0x85, 0x01, 0x01, 0x00], [0x00, 0xa4, 0x04, 0x00, 0x07, 0xd2, 0x76, 0x00, 0x00, 0x85, 0x01, 0x01], ]; for (const cmd of candidates) { const res = await transceiveIsoDep(cmd); if (isSuccessApdu(res)) return true; } return false; };
  const readNdefFromType4Tag = async (): Promise<string | null> => {
    try {
      const selected = await trySelectNdefApp(); if (!selected) return null;
      let res = await transceiveIsoDep([0x00, 0xa4, 0x00, 0x0c, 0x02, 0xe1, 0x03]); if (!isSuccessApdu(res)) return null;
      res = await transceiveIsoDep([0x00, 0xb0, 0x00, 0x00, 0x0f]); if (!isSuccessApdu(res)) return null;
      const cc = trimStatus(res);
      const ndefFileId = cc.length >= 11 && cc[9] !== undefined && cc[10] !== undefined ? [cc[9], cc[10]] : [0xe1, 0x04];
      res = await transceiveIsoDep([0x00, 0xa4, 0x00, 0x0c, 0x02, ndefFileId[0], ndefFileId[1]]); if (!isSuccessApdu(res)) return null;
      res = await transceiveIsoDep([0x00, 0xb0, 0x00, 0x00, 0x02]); if (!isSuccessApdu(res)) return null;
      const nlenBytes = trimStatus(res); const nlen = ((nlenBytes[0] || 0) << 8) | (nlenBytes[1] || 0);
      if (!nlen || nlen <= 0 || nlen > 512) return null;
      const chunks: number[] = []; let offset = 2;
      while (chunks.length < nlen) { const remaining = nlen - chunks.length; const le = Math.min(remaining, 0xf0); res = await transceiveIsoDep([0x00, 0xb0, (offset >> 8) & 0xff, offset & 0xff, le]); if (!isSuccessApdu(res)) return null; chunks.push(...trimStatus(res)); offset += le; }
      return extractSolanaUri(bytesToString(chunks));
    } catch (e) { return null; }
  };
  const readNdefViaGetTag = async (): Promise<string | null> => { try { const tag = await NfcManager.getTag(); return decodeNdefMessageFromTag(tag); } catch (e) { return null; } };
  const handleNfcScan = async () => {
    try {
      safeNotify(notify, t('nfc_scan_holding') || '相手のスマホにかざしてください...');
      await NfcManager.cancelTechnologyRequest().catch(() => {}); NfcManager.setEventListener(NfcEvents.DiscoverTag, null); 
      await NfcManager.requestTechnology([NfcTech.Ndef, NfcTech.IsoDep]);
      const viaTag = await readNdefViaGetTag(); if (viaTag) { handleUniversalScan(viaTag); return; }
      const viaApdu = await readNdefFromType4Tag(); if (viaApdu) { handleUniversalScan(viaApdu); return; }
      safeNotify(notify, t('data_not_found') || 'データが見つかりませんでした');
    } catch (ex) { safeNotify(notify, t('nfc_failed') || 'スキャンに失敗しました'); } finally { await NfcManager.cancelTechnologyRequest().catch(() => {}); NfcManager.setEventListener(NfcEvents.DiscoverTag, null); }
  };

  useEffect(() => { if (selectedAsset?.decimals === 0 && !amount) setAmount('1'); }, [selectedAsset, amount]);

  const handleBackPress = () => {
    if (step === 'asset') return onBack();
    if (step === 'recipient') return preSelectedAsset ? onBack() : setStep('asset');
    if (step === 'amount') { if (preSelectedAddress && !preSelectedAsset) return setStep('asset'); return setStep('recipient'); }
    if (step === 'confirm') return setStep('amount');
  };

  const goToAmount = () => { try { new PublicKey(address); setStep('amount'); } catch { setAlert({ visible: true, title: t('error') || 'エラー', message: t('invalid_address') || '無効なアドレスです', type: 'error' }); } };
  const goToConfirm = () => {
    if (!selectedAsset) return;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setAlert({ visible: true, title: t('error') || 'エラー', message: t('invalid_amount') || '有効な金額を入力してください', type: 'error' }); return; }
    if (Number(amount) > selectedAsset.amount) { setAlert({ visible: true, title: t('error') || 'エラー', message: t('err_insufficient_funds') || '残高が不足しています', type: 'error' }); return; }
    setStep('confirm');
  };

  const executeSend = async () => {
    Keyboard.dismiss(); setLoading(true);
    try {
      if (!wallet?.address || !selectedAsset) throw new Error(t('unknown_error') || '準備が完了していません');
      const fromPubkey = new PublicKey(wallet.address);
      const destPubkey = new PublicKey(address);
      const sendAmount = parseFloat(amount);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const transaction = new Transaction();

      if (selectedAsset.mint === SOL_MINT) {
        transaction.add(SystemProgram.transfer({ fromPubkey, toPubkey: destPubkey, lamports: Math.floor(sendAmount * LAMPORTS_PER_SOL) }));
      } else {
        const mintPubkey = new PublicKey(selectedAsset.mint);
        const fromATA = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
        const toATA = await getAssociatedTokenAddress(mintPubkey, destPubkey);
        const toAtaInfo = await connection.getAccountInfo(toATA);
        if (!toAtaInfo) transaction.add(createAssociatedTokenAccountInstruction(fromPubkey, toATA, destPubkey, mintPubkey));
        const multiplier = Math.pow(10, selectedAsset.decimals);
        transaction.add(createTransferInstruction(fromATA, toATA, fromPubkey, Math.floor(sendAmount * multiplier)));
      }

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;
      let signature = '';

      if (wallet.walletType === 'seed-vault') {
        const messageV0 = new TransactionMessage({ payerKey: fromPubkey, recentBlockhash: blockhash, instructions: transaction.instructions }).compileToV0Message();
        const vTx = new VersionedTransaction(messageV0);
        const signedTxBytes = await signWithSeedVault(vTx.serialize(), wallet);
        signature = await connection.sendRawTransaction(signedTxBytes, { skipPreflight: false, preflightCommitment: 'confirmed' });
      } else {
        if (!wallet.secretKey) throw new Error(t('unknown_error') || 'シークレットキーがありません');
        const keypair = Keypair.fromSecretKey(wallet.secretKey);
        signature = await connection.sendTransaction(transaction, [keypair], { skipPreflight: false, preflightCommitment: 'confirmed' });
      }

      safeNotify(notify, t('sending') || '送信中...');
      await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, 'confirmed');
      setShowSuccess(true); refreshAssetsService({ force: true });
    } catch (e: any) { setAlert({ visible: true, title: t('send_failed') || '送信失敗', message: e.message || '不明なエラー', type: 'error' }); } finally { setLoading(false); }
  };

  const getHeaderTitle = () => {
    if (step === 'asset') return t('send') || '送る';
    if (step === 'recipient') return t('select_recipient') || '宛先の選択';
    if (step === 'amount') return `${t('send') || '送る'} ${selectedAsset?.symbol}`;
    if (step === 'confirm') return t('confirm_transaction') || '送信内容の確認';
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <HeaderRow title={getHeaderTitle()} onBack={handleBackPress} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
          
          {step === 'asset' && (
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              <View style={globalStyles.card}>
                <Text style={globalStyles.sectionTitle}>{t('your_assets') || 'あなたのアセット'}</Text>
                {sendableAssets.length === 0 ? (
                  <Text style={{ color: '#666', textAlign: 'center', paddingVertical: 20 }}>{t('no_assets_to_send') || '送信可能なアセットがありません'}</Text>
                ) : (
                  sendableAssets.map((a: any, i: number) => (
                    <TouchableOpacity key={i} style={[globalStyles.tokenItem, { borderWidth: 0, paddingHorizontal: 0, borderBottomWidth: 1 }]} onPress={() => { setSelectedAsset(a); if (address) setStep('amount'); else setStep('recipient'); }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {a.logoURI ? <Image source={{ uri: a.logoURI }} style={{ width: 40, height: 40, borderRadius: 20 }} /> : <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#444' }} />}
                        <View><Text style={globalStyles.tokenSym}>{a.name}</Text><Text style={globalStyles.tokenName}>{a.amount} {a.symbol}</Text></View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>
          )}

          {step === 'recipient' && (
            <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
              <View style={globalStyles.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <TextInput style={[globalStyles.input, { flex: 1, fontSize: 14, fontWeight: 'normal', borderWidth: 0, marginBottom: 0 }]} placeholder={t('enter_solana_address') || 'Solanaアドレスを入力'} placeholderTextColor="#555" value={address} onChangeText={setAddress} autoFocus={!isScanning} />
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={handleNfcScan} style={{ padding: 8 }}><CreditCard size={24} color="#a855f7" /></TouchableOpacity>
                    <TouchableOpacity onPress={handleOpenScanner} style={{ padding: 8 }}><QrCode size={24} color="#888" /></TouchableOpacity>
                  </View>
                </View>
              </View>

              <Text style={globalStyles.sectionTitle}>{t('your_addresses') || '登録済みアドレス'}</Text>
              <View style={[globalStyles.card, { flex: 1, marginBottom: 16 }]}> 
                {!contacts || contacts.length === 0 ? (
                  <Text style={{ color: '#666', textAlign: 'center', paddingVertical: 20 }}>{t('no_saved_wallets') || '登録されているアドレスはありません'}</Text>
                ) : (
                  contacts.map((c: any, i: number) => (
                    <TouchableOpacity key={i} style={[globalStyles.tokenItem, { borderWidth: 0, paddingHorizontal: 0, borderBottomWidth: 1 }]} onPress={() => { setAddress(c.address); setStep('amount'); }}>
                      <View><Text style={globalStyles.tokenSym}>{c.name}</Text><Text style={globalStyles.tokenName}>{shortenAddress(c.address)}</Text></View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
              <TouchableOpacity style={[globalStyles.primaryButton, !address && { backgroundColor: '#333' }]} disabled={!address} onPress={goToAmount}><Text style={globalStyles.primaryButtonText}>{t('next') || '次へ'}</Text></TouchableOpacity>
            </View>
          )}

          {step === 'amount' && (
            <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
              <View style={{ alignItems: 'center', marginTop: 30, marginBottom: 30 }}>
                <Text style={{ color: '#888', fontSize: 20, marginBottom: 12 }}>{selectedAsset?.symbol}</Text>
                <TextInput style={{ color: '#fff', fontSize: amount.length > 12 ? 36 : amount.length > 8 ? 48 : 64, fontWeight: 'bold', textAlign: 'center', width: '100%' }} placeholder="0" placeholderTextColor="#333" keyboardType="numeric" returnKeyType="done" value={amount} onChangeText={setAmount} onSubmitEditing={goToConfirm} autoFocus editable={selectedAsset?.decimals !== 0} />
                <Text style={{ color: '#888', fontSize: 16, marginTop: 12 }}>{t('available') || '利用可能'}: {selectedAsset?.amount} {selectedAsset?.symbol}</Text>
              </View>
              {selectedAsset && selectedAsset.decimals !== 0 && (
                <View style={globalStyles.percentRow}>
                  <TouchableOpacity style={globalStyles.percentBtn} onPress={() => setAmount(String(parseFloat(((selectedAsset.amount || 0) / 2).toFixed(9))))}><Text style={globalStyles.percentText}>{t('half') || '半分'}</Text></TouchableOpacity>
                  <TouchableOpacity style={globalStyles.percentBtn} onPress={() => { const maxAmt = selectedAsset.mint === SOL_MINT ? Math.max(0, (selectedAsset.amount || 0) - 0.005) : (selectedAsset.amount || 0); setAmount(String(parseFloat(maxAmt.toFixed(9)))); }}><Text style={globalStyles.percentText}>{t('max') || '最大'}</Text></TouchableOpacity>
                </View>
              )}
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={[globalStyles.primaryButton, (!amount || Number(amount) <= 0) && { backgroundColor: '#333' }]} disabled={!amount || Number(amount) <= 0} onPress={goToConfirm}><Text style={globalStyles.primaryButtonText}>{t('review') || '確認する'}</Text></TouchableOpacity>
            </View>
          )}

          {step === 'confirm' && (
            <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
              <View style={{ alignItems: 'center', marginBottom: 30 }}>
                {selectedAsset?.logoURI ? <Image source={{ uri: selectedAsset.logoURI }} style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 16 }} /> : <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#444', marginBottom: 16 }} />}
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center' }} adjustsFontSizeToFit numberOfLines={1}>{amount} {selectedAsset?.symbol}</Text>
              </View>

              <Text style={globalStyles.sectionTitle}>{t('transaction_preview') || '送信内容のプレビュー'}</Text>
              <View style={globalStyles.card}>
                <View style={localStyles.previewRow}><Text style={{ color: '#888' }}>{t('to') || '宛先'}</Text><Text style={{ color: '#fff', fontWeight: 'bold' }}>{shortenAddress(address)}</Text></View>
                <View style={localStyles.previewRow}><Text style={{ color: '#888' }}>{t('network_fee') || 'ネットワーク手数料'}</Text><Text style={{ color: '#22c55e', fontWeight: 'bold' }}>~0.00001 SOL</Text></View>
                <View style={{ height: 1, backgroundColor: '#333', marginBottom: 16 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: 'bold', marginRight: 16 }}>{t('total_sent') || '合計送信額'}</Text><Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, flexShrink: 1, textAlign: 'right' }} adjustsFontSizeToFit numberOfLines={1}>{amount} {selectedAsset?.symbol}</Text></View>
              </View>

              <View style={{ flex: 1 }} />
              <TouchableOpacity style={[globalStyles.primaryButton, loading && { backgroundColor: '#333' }]} disabled={loading} onPress={executeSend}>
                {loading ? <Text style={globalStyles.primaryButtonText}>{t('processing') || '処理中...'}</Text> : <View style={{ flexDirection: 'row', alignItems: 'center' }}><Check size={20} color="#fff" style={{ marginRight: 8 }} /><Text style={globalStyles.primaryButtonText}>{t('approve_and_send') || '承認して送信'}</Text></View>}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {isScanning && <QRScannerModal visible={isScanning} onClose={() => setIsScanning(false)} onScan={handleUniversalScan} />}
      <SimpleAlertModal visible={alert.visible} title={alert.title} message={alert.message} type={alert.type} onClose={() => setAlert({ ...alert, visible: false })} />
      <SuccessModal visible={showSuccess} message={t('send_success') || '送信完了'} onDone={() => { setShowSuccess(false); onBack(); }} />
    </View>
  );
};

const localStyles = StyleSheet.create({
  tabContainer: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 12, padding: 4, marginBottom: 24, width: '100%' },
  tabButton: { flex: 1, flexDirection: 'row', paddingVertical: 12, justifyContent: 'center', alignItems: 'center', borderRadius: 10, gap: 8 },
  activeTab: { backgroundColor: '#2a2a2a' },
  tabText: { color: '#666', fontWeight: 'bold', fontSize: 14 },
  activeTabText: { color: '#fff' },
  qrWrapper: { backgroundColor: '#1a1a1a', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: '#333', marginBottom: 24, width: 250, height: 250, alignItems: 'center' },
  btnRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, borderTopWidth: 1, borderTopColor: '#222', paddingTop: 12 },
  iconBtn: { alignItems: 'center', gap: 6 },
  btnText: { color: '#aaa', fontSize: 12 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
});