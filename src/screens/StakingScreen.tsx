import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { ArrowDown, Check } from 'lucide-react-native';
import { VersionedTransaction, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Buffer } from 'buffer';

import { styles } from '../styles/globalStyles';
import { HeaderRow } from '../components/HeaderRow';
import { SOL_MINT, SUPPORTED_LSTS } from '../constants/config';
import { parseSolanaError } from '../utils/solanaUtils';
import { ConfirmModal, SuccessModal, SimpleAlertModal } from '../components/ActionModals';
import { refreshAssetsService } from '../services/refreshAssets';
import { jupiterQuoteApi } from '../services/jupiterService';
import { TokenIcon } from '../components/TokenIcon';

// ★ AssetStore から tokenMap を取得してオンチェーンデータを解決
import { useAssetStore } from '../state/assetStore';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { ADMOB_ANDROID_BANNER_ID as ADMOB_ANDROID_ENV } from '@env';

const BANNER_ESTIMATED_HEIGHT = 60;

export const StakingScreen = ({ t, wallet, connection, notify, onBack, solBalance, onRetryFetch }: any) => {
  const insets = useSafeAreaInsets();
  const adUnitId = useMemo(() => (Platform.OS === 'android' ? (ADMOB_ANDROID_ENV || '').trim() : ''), []);
  const showBanner = adUnitId.length > 0;

  // ★ ストアから最新のトークン情報を取得
  const tokenMap = useAssetStore(state => state.tokenMap);

  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLST, setSelectedLST] = useState(SUPPORTED_LSTS[0]);
  const [quote, setQuote] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '' });

  const safeBalance = Number(solBalance) || 0;

  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
      setQuote(null);
      return;
    }
    const fetchQuote = async () => {
      setLoading(true);
      try {
        const inputLamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
        const q = await jupiterQuoteApi.quoteGet({
          inputMint: SOL_MINT,
          outputMint: selectedLST.mint,
          amount: inputLamports,
          slippageBps: 50,
        });
        setQuote(q);
      } catch (e) { setQuote(null); } finally { setLoading(false); }
    };
    const timer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timer);
  }, [amount, selectedLST]);

  const doStake = async () => {
    if (!wallet || !quote || !connection) return;
    setLoading(true);
    try {
      const result = await jupiterQuoteApi.swapPost({
        swapRequest: {
          quoteResponse: quote,
          userPublicKey: wallet.address,
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true as any,
        }
      });

      if (!result?.swapTransaction) throw new Error("Failed to get transaction");
      const transaction = VersionedTransaction.deserialize(Buffer.from(result.swapTransaction, 'base64'));
      if (!wallet.secretKey) throw new Error("Wallet not loaded");
      transaction.sign([Keypair.fromSecretKey(wallet.secretKey)]);
      
      const txid = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: true });
      notify(t('processing'));
      await connection.confirmTransaction(txid, 'confirmed');

      setShowSuccess(true);
      setAmount('');
      setQuote(null);
      refreshAssetsService({ force: true });
    } catch (e: any) {
      setAlert({ visible: true, title: t('stake_failed'), message: parseSolanaError(e, t) });
    } finally { setLoading(false); }
  };

  const estimatedOut = quote ? (Number(quote.outAmount) / 10**9).toFixed(4) : "0.00";
  
  // 選択中トークンの動的情報
  const activeTokenInfo = tokenMap.get(selectedLST.mint);
  const activeSymbol = activeTokenInfo?.symbol || selectedLST.fallbackSymbol;

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <HeaderRow title={t('staking_btn')} onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        
        <Text style={localStyles.sectionLabel}>{t('select_staking_asset') || 'Select Asset'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={localStyles.lstSelector}>
          {SUPPORTED_LSTS.map((lst) => {
            const tokenInfo = tokenMap.get(lst.mint);
            const symbol = tokenInfo?.symbol || lst.fallbackSymbol;
            const logoURI = tokenInfo?.logoURI;
            const isActive = selectedLST.mint === lst.mint;

            return (
              <TouchableOpacity 
                key={lst.mint} 
                onPress={() => { setSelectedLST(lst); setQuote(null); }}
                style={[localStyles.lstChip, isActive && localStyles.lstChipActive]}
              >
                <TokenIcon uri={logoURI} mint={lst.mint} symbol={symbol} size={26} />
                <Text style={localStyles.lstChipText}>{symbol}</Text>
                {isActive && <Check size={14} color="#a855f7" style={{marginLeft: 6}} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={localStyles.card}>
          <View style={localStyles.cardHeader}>
            <Text style={localStyles.label}>{t('deposit')} (SOL)</Text>
            <Text style={localStyles.balanceText}>{t('available')}: {safeBalance.toFixed(4)}</Text>
          </View>
          <TextInput style={localStyles.amountInput} placeholder="0" placeholderTextColor="#555" keyboardType="numeric" value={amount} onChangeText={setAmount} />
        </View>

        <View style={{ alignItems: 'center', marginVertical: -10, zIndex: 10 }}>
          <View style={localStyles.arrowCircle}><ArrowDown size={20} color="#666" /></View>
        </View>

        <View style={[localStyles.card, { paddingTop: 24 }]}>
          <View style={localStyles.cardHeader}>
            <Text style={localStyles.label}>{t('receive_lbl')} ({activeSymbol})</Text>
            <Text style={localStyles.apyText}>{selectedLST.apy} APY</Text>
          </View>
          {loading ? <ActivityIndicator color="#a855f7" style={{alignSelf: 'flex-end', marginVertical: 10}} /> : <Text style={localStyles.amountInput}>{estimatedOut}</Text>}
        </View>

        <TouchableOpacity 
          style={[styles.primaryButton, (!quote || loading) && { backgroundColor: '#333' }, { marginTop: 30 }]} 
          disabled={!quote || loading} 
          onPress={() => setShowConfirm(true)}
        >
          <Text style={styles.primaryButtonText}>{t('staking_btn')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <ConfirmModal 
        visible={showConfirm} 
        title={t('confirm_stake_title')} 
        message={`${amount} SOL -> ${estimatedOut} ${activeSymbol}`} 
        onCancel={() => setShowConfirm(false)} 
        onConfirm={() => { setShowConfirm(false); doStake(); }} 
      />
      <SuccessModal visible={showSuccess} message={t('stake_success_msg')} onDone={() => setShowSuccess(false)} />
      <SimpleAlertModal visible={alert.visible} title={alert.title} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />

      {showBanner ? (
        <View style={[localStyles.bannerContainer, { paddingBottom: insets.bottom }]}>
          <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
        </View>
      ) : null}
    </View>
  );
};

const localStyles = StyleSheet.create({
  sectionLabel: { color: '#888', fontSize: 12, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  lstSelector: { flexDirection: 'row', marginBottom: 24 },
  lstChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, marginRight: 12, borderWidth: 1, borderColor: '#333' },
  lstChipActive: { borderColor: '#a855f7', backgroundColor: 'rgba(168, 85, 247, 0.1)' },
  lstChipText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 10 },
  card: { backgroundColor: '#1e1e1e', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#333' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  label: { color: '#aaa', fontSize: 14, fontWeight: '600' },
  balanceText: { color: '#888', fontSize: 12 },
  apyText: { color: '#22c55e', fontWeight: 'bold', fontSize: 14 },
  amountInput: { fontSize: 32, color: '#fff', fontWeight: 'bold', textAlign: 'right', padding: 0 },
  arrowCircle: { backgroundColor: '#111', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  bannerContainer: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'flex-end', paddingTop: 8, backgroundColor: 'rgba(0,0,0,0.8)' },
});