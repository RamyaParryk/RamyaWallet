import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { ArrowDown, Check } from 'lucide-react-native';
import { VersionedTransaction, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Buffer } from 'buffer';

import { styles as globalStyles } from '../styles/globalStyles'; // 🌟 グローバルスタイルをインポート
import { HeaderRow } from '../components/HeaderRow';
import { SOL_MINT, SUPPORTED_LSTS, JITO_SOL_MINT, MSOL_MINT, BSOL_MINT, LST_APY_APIS } from '../constants/config';
import { signWithSeedVault, parseSolanaError } from '../utils/solanaUtils'; 
import { ConfirmModal, SuccessModal, SimpleAlertModal } from '../components/ActionModals';
import { refreshAssetsService } from '../services/refreshAssets';
import { jupiterQuoteApi } from '../services/jupiterService';
import { TokenIcon } from '../components/TokenIcon';
import { useAssetStore } from '../state/assetStore';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { ADMOB_ANDROID_BANNER_ID as ADMOB_ANDROID_ENV } from '@env';

const BANNER_ESTIMATED_HEIGHT = 60;

const fetchWithTimeout = async (url: string, ms = 5000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
  } finally {
    clearTimeout(timer);
  }
};

export const StakingScreen = ({ t, wallet, connection, notify, onBack, solBalance, onRetryFetch }: any) => {
  const insets = useSafeAreaInsets();
  const adUnitId = Platform.OS === 'android' ? (ADMOB_ANDROID_ENV || '').trim() : '';
  const showBanner = adUnitId.length > 0;
  const tokenMap = useAssetStore(state => state.tokenMap);

  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLST, setSelectedLST] = useState(SUPPORTED_LSTS[0]);
  const [quote, setQuote] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '' });

  const [dynamicApys, setDynamicApys] = useState<Record<string, string>>({});
  const safeBalance = Number(solBalance) || 0;

  useEffect(() => {
    const fetchApys = async () => {
      const newApys: Record<string, string> = {};

      try {
        const res = await fetchWithTimeout(LST_APY_APIS.JITO);
        if (res.ok) {
          const data = await res.json();
          let apyValue = Array.isArray(data) && data.length > 0 ? (data[0].apy || data[0].apr || 0) : (data.apy || data.apr || data.apr?.['1m'] || 0);
          if (apyValue > 0) {
            if (apyValue < 1) apyValue = apyValue * 100;
            newApys[JITO_SOL_MINT] = apyValue.toFixed(2) + '%';
          }
        }
      } catch (e: any){ console.log('[APY] 🤫 Jito fetch failed'); }

      try {
        const res = await fetchWithTimeout(LST_APY_APIS.MARINADE);
        if (res.ok) {
          const text = await res.text();
          let apyValue = parseFloat(text.trim());
          if (!isNaN(apyValue) && apyValue > 0) {
            if (apyValue < 1) apyValue = apyValue * 100;
            newApys[MSOL_MINT] = apyValue.toFixed(2) + '%';
          }
        }
      } catch (e: any){ console.log('[APY] 🤫 Marinade fetch failed'); }

      try {
        const res = await fetchWithTimeout(LST_APY_APIS.SOLBLAZE);
        if (res.ok) {
          const text = await res.text();
          let apyValue = 0;
          try { const data = JSON.parse(text); apyValue = data.apy || data.apr || 0; } catch { apyValue = parseFloat(text.trim()); }
          if (!isNaN(apyValue) && apyValue > 0) {
            if (apyValue < 1) apyValue = apyValue * 100;
            newApys[BSOL_MINT] = apyValue.toFixed(2) + '%';
          }
        }
      } catch (e: any){ console.log('[APY] 🤫 SolBlaze fetch failed'); }

      if (Object.keys(newApys).length > 0) setDynamicApys(prev => ({ ...prev, ...newApys }));
    };
    fetchApys();
  }, []);

  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) return setQuote(null);
    const fetchQuote = async () => {
      setLoading(true);
      try {
        const inputLamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
        setQuote(await jupiterQuoteApi.quoteGet({ inputMint: SOL_MINT, outputMint: selectedLST.mint, amount: inputLamports, slippageBps: 50 }));
      } catch (e) { setQuote(null); } finally { setLoading(false); }
    };
    const timer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timer);
  }, [amount, selectedLST]);

  const doStake = async () => {
    if (!wallet || !quote || !connection) return;
    setLoading(true);
    try {
      const requestParams: any = {
        quoteResponse: quote,
        userPublicKey: wallet.address,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true as any,
        prioritizationFeeLamports: {
          priorityLevelWithMaxLamports: { priorityLevel: "high", maxLamports: 5000000 }
        },
        useSharedAccounts: true,
        skipUserAccountsRpcCalls: true,
      };

      let result;
      try {
        result = await jupiterQuoteApi.swapPost({ swapRequest: requestParams });
      } catch (apiError: any) {
        if (apiError.response && typeof apiError.response.json === 'function') {
          const errBody = await apiError.response.json();
          throw new Error(errBody?.error || 'Jupiter API Rejected');
        }
        throw apiError;
      }

      if (!result?.swapTransaction) throw new Error("Failed to get transaction");

      const txBytes = new Uint8Array(Buffer.from(result.swapTransaction, 'base64'));
      let txid = '';

      if (wallet.walletType === 'seed-vault') {
        const signedTxBytes = await signWithSeedVault(txBytes, wallet);
        txid = await connection.sendRawTransaction(signedTxBytes, { skipPreflight: false });
      } else {
        if (!wallet.secretKey) throw new Error("Wallet not loaded");
        const transaction = VersionedTransaction.deserialize(txBytes);
        transaction.sign([Keypair.fromSecretKey(wallet.secretKey)]);
        txid = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false });
      }
      
      notify(t('processing'));
      await connection.confirmTransaction(txid, 'confirmed');

      setShowSuccess(true);
      setAmount('');
      setQuote(null);
      refreshAssetsService({ force: true });
    } catch (e: any) {
      console.error("🔥 [STAKE FATAL ERROR]", e);
      setAlert({ visible: true, title: t('error') || 'Error', message: parseSolanaError(e, t) });
    } finally { setLoading(false); }
  };

  const estimatedOut = quote ? (Number(quote.outAmount) / 10**9).toFixed(4) : "0.00";
  const activeTokenInfo = tokenMap.get(selectedLST.mint);
  const activeSymbol = activeTokenInfo?.symbol || selectedLST.fallbackSymbol;
  const displayApy = dynamicApys[selectedLST.mint] || selectedLST.fallbackApy;

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <HeaderRow title={t('staking_btn')} onBack={onBack} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: showBanner ? BANNER_ESTIMATED_HEIGHT + 40 : 60 }}>
        
        <Text style={globalStyles.sectionTitle}>{t('select_staking_asset') || 'Select Asset'}</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={localStyles.lstSelector}>
          {SUPPORTED_LSTS.map((lst) => {
            const tokenInfo = tokenMap.get(lst.mint);
            const symbol = tokenInfo?.symbol || lst.fallbackSymbol;
            const isActive = selectedLST.mint === lst.mint;
            return (
              <TouchableOpacity key={lst.mint} onPress={() => { setSelectedLST(lst); setQuote(null); }} style={[localStyles.lstChip, isActive && localStyles.lstChipActive]}>
                <TokenIcon uri={tokenInfo?.logoURI} mint={lst.mint} symbol={symbol} size={26} />
                <Text style={localStyles.lstChipText}>{symbol}</Text>
                {isActive && <Check size={14} color="#a855f7" style={{marginLeft: 6}} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        
        <View style={globalStyles.card}>
          <View style={globalStyles.cardHeader}>
            <Text style={globalStyles.cardLabel}>{t('deposit')} (SOL)</Text>
            <Text style={{ color: '#888', fontSize: 12 }}>{t('available')}: {safeBalance.toFixed(4)}</Text>
          </View>
          <TextInput style={globalStyles.amountInputLarge} placeholder="0" placeholderTextColor="#555" keyboardType="numeric" value={amount} onChangeText={setAmount} />
          
          <View style={globalStyles.percentRow}>
            {[10, 50, 100].map((p) => (
              <TouchableOpacity key={p} onPress={() => {
                  let final = safeBalance * (p / 100);
                  if (p === 100) final = Math.max(0, final - 0.005);
                  setAmount(final.toFixed(6).replace(/\.?0+$/, ''));
                }} style={globalStyles.percentBtn}>
                <Text style={globalStyles.percentText}>{p === 100 ? 'MAX' : `${p}%`}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ alignItems: 'center', marginVertical: -10, zIndex: 10 }}>
          <View style={localStyles.arrowCircle}><ArrowDown size={20} color="#666" /></View>
        </View>

        <View style={[globalStyles.card, { paddingTop: 24 }]}>
          <View style={globalStyles.cardHeader}>
            <Text style={globalStyles.cardLabel}>{t('receive_lbl')} ({activeSymbol})</Text>
            <Text style={localStyles.apyText}>{displayApy} APY</Text>
          </View>
          {loading ? <ActivityIndicator color="#a855f7" style={{alignSelf: 'flex-end', marginVertical: 10}} /> : <Text style={globalStyles.amountInputLarge}>{estimatedOut}</Text>}
        </View>

        <TouchableOpacity style={[globalStyles.primaryButton, (!quote || loading) && { backgroundColor: '#333' }, { marginTop: 30 }]} disabled={!quote || loading} onPress={() => quote && setShowConfirm(true)}>
          <Text style={globalStyles.primaryButtonText}>{t('staking_btn')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <ConfirmModal visible={showConfirm} title={t('confirm_stake_title')} message={`${amount} SOL -> ${estimatedOut} ${activeSymbol}`} onCancel={() => setShowConfirm(false)} onConfirm={() => { setShowConfirm(false); doStake(); }} />
      <SuccessModal visible={showSuccess} message={t('stake_success_msg')} onDone={() => setShowSuccess(false)} />
      <SimpleAlertModal visible={alert.visible} title={alert.title} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
      
      {showBanner && <View style={[globalStyles.bannerContainerFixed, { paddingBottom: insets.bottom }]}><BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} /></View>}
    </View>
  );
};

const localStyles = StyleSheet.create({
  lstSelector: { flexDirection: 'row', marginBottom: 24 },
  lstChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, marginRight: 12, borderWidth: 1, borderColor: '#333' },
  lstChipActive: { borderColor: '#a855f7', backgroundColor: 'rgba(168, 85, 247, 0.1)' },
  lstChipText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 10 },
  apyText: { color: '#22c55e', fontWeight: 'bold', fontSize: 14 },
  arrowCircle: { backgroundColor: '#111', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
});