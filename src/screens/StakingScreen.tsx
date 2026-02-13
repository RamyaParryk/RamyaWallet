import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { ArrowDown } from 'lucide-react-native';
import { VersionedTransaction, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Buffer } from 'buffer';

import { createJupiterApiClient } from '@jup-ag/api';

import { styles } from '../styles/globalStyles';
import { HeaderRow } from '../components/HeaderRow';
import { SOL_MINT, JITO_SOL_MINT, JUPITER_BASE_PATH } from '../constants/config';
import { parseSolanaError } from '../utils/solanaUtils';
import { ConfirmModal, SuccessModal, SimpleAlertModal } from '../components/ActionModals';

const jupiterQuoteApi = createJupiterApiClient({ basePath: JUPITER_BASE_PATH });

export const StakingScreen = ({ t, wallet, connection, notify, onBack, solBalance, onRetryFetch }: any) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [alert, setAlert] = useState({ visible: false, title: '', message: '' });

  const safeBalance = Number(solBalance) || 0;

  const handlePercentSelect = (percent: number) => {
    let finalAmount = 0;
    if (percent === 100) {
      finalAmount = Math.max(0, safeBalance - 0.01);
    } else {
      finalAmount = safeBalance * (percent / 100);
    }
    setAmount(finalAmount.toFixed(4).replace(/\.?0+$/, ""));
  };

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
          outputMint: JITO_SOL_MINT,
          amount: inputLamports,
          slippageBps: 50,
        });
        if (!q) throw new Error("No quote found");
        setQuote(q);
      } catch (e: any) { setQuote(null); } finally { setLoading(false); }
    };
    const timer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timer);
  }, [amount]);

  const handleStakePress = () => { if (quote) setShowConfirm(true); };

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

      if (!result || !result.swapTransaction) throw new Error("Failed to get swap transaction");

      const swapTransactionBuf = Buffer.from(result.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      if (!wallet.secretKey) throw new Error("Wallet not loaded");
      const keypair = Keypair.fromSecretKey(wallet.secretKey);
      transaction.sign([keypair]);

      const txid = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: true, maxRetries: 2 });
      notify(t('processing'));

      const confirmation = await connection.confirmTransaction(txid, 'confirmed');
      if (confirmation.value.err) throw new Error("Transaction Failed");

      notify(t('stake_success_msg'));
      setShowSuccess(true);
      setAmount('');
      setQuote(null);
      if (onRetryFetch) setTimeout(() => { onRetryFetch(); }, 2000);

    } catch (e: any) {
      console.error("[STAKE] Failed:", e);
      const friendlyMsg = parseSolanaError(e, t);
      setAlert({ visible: true, title: t('stake_failed'), message: friendlyMsg });
    } finally {
      setLoading(false);
    }
  };

  const estimatedJitoSol = quote && quote.outAmount
    ? (Number(quote.outAmount) / 1000000000).toFixed(4)
    : "0.00";

  return (
    <View style={styles.content}>
      <HeaderRow title={t('staking_btn')} onBack={onBack} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Deposit Card (SOL) */}
        <View style={[localStyles.card, { marginTop: 10 }]}>
          <View style={localStyles.cardHeader}>
            <Text style={localStyles.label}>{t('deposit')} (SOL)</Text>
            <Text style={localStyles.balanceText}>{t('available')}: {safeBalance.toFixed(4)} SOL</Text>
          </View>
          
          {/* ★ Swap画面と同じように右寄せ・デカ文字に変更 */}
          <TextInput 
            style={[localStyles.amountInput, { fontSize: amount.length > 8 ? 24 : 32 }]} 
            placeholder="0" 
            placeholderTextColor="#555" 
            keyboardType="numeric" 
            value={amount} 
            onChangeText={setAmount} 
          />
          
          <View style={localStyles.percentRow}>
            {[10, 50, 100].map((p) => (
              <TouchableOpacity key={p} onPress={() => handlePercentSelect(p)} style={localStyles.percentBtn}>
                <Text style={localStyles.percentText}>{p === 100 ? 'MAX' : `${p}%`}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ alignItems: 'center', marginVertical: -10, zIndex: 10 }}>
           <View style={localStyles.arrowCircle}>
             <ArrowDown size={24} color="#666" />
           </View>
        </View>

        {/* Receive Card (JitoSOL) */}
        <View style={[localStyles.card, { marginTop: 0, paddingTop: 24 }]}>
          <View style={localStyles.cardHeader}>
            <Text style={localStyles.label}>{t('receive_lbl')} (JitoSOL)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={[localStyles.coinIcon, { backgroundColor: '#22c55e' }]}><Text style={{ fontWeight: 'bold', color: 'white' }}>J</Text></View>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>JitoSOL</Text>
            </View>
          </View>
          
          {loading ? (
            <ActivityIndicator color="#a855f7" style={{alignSelf: 'flex-end', marginVertical: 10}} /> 
          ) : (
            // ★ こちらも右寄せに統一
            <Text style={[localStyles.amountInput, { color: quote ? '#fff' : '#666', fontSize: estimatedJitoSol.length > 8 ? 24 : 32 }]}>
              {estimatedJitoSol}
            </Text>
          )}
          
          <Text style={[localStyles.balanceText, { color: '#22c55e', fontWeight: 'bold', fontSize: 14, marginTop: 5, textAlign: 'right' }]}>
            {t('apy_est')}
          </Text>
        </View>

        <TouchableOpacity style={[styles.primaryButton, (!quote || loading) && { backgroundColor: '#333' }, { marginTop: 30 }]} disabled={!quote || loading} onPress={handleStakePress}>
          <Text style={styles.primaryButtonText}>{loading ? t('processing') : t('staking_btn')}</Text>
        </TouchableOpacity>

        <View style={[styles.infoCard, { marginTop: 40, opacity: 0.8 }]}>
          <Text style={[styles.label, { color: '#aaa', marginBottom: 8 }]}>{t('liquid_staking')}</Text>
          <Text style={[styles.descText, { fontSize: 13 }]}>{t('staking_desc')}</Text>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={showConfirm}
        title={t('confirm_stake_title')}
        message={`${amount} SOL \n⬇️\n ${estimatedJitoSol} JitoSOL`}
        cancelText={t('cancel')}
        confirmText={t('staking_btn')}
        onCancel={() => setShowConfirm(false)}
        onConfirm={() => { setShowConfirm(false); doStake(); }}
      />
      <SuccessModal visible={showSuccess} message={t('stake_success_msg')} onDone={() => setShowSuccess(false)} />
      
      <SimpleAlertModal 
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </View>
  );
};

// ★ SwapScreenに合わせたスタイル定義を追加
const localStyles = StyleSheet.create({
  card: { backgroundColor: '#1e1e1e', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#333' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  label: { color: '#aaa', fontSize: 14, fontWeight: '600' },
  balanceText: { color: '#aaa', fontSize: 12 },
  amountInput: { fontSize: 32, color: '#fff', fontWeight: 'bold', textAlign: 'right', padding: 0 },
  percentRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  percentBtn: { backgroundColor: '#2a2a2a', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#444' },
  percentText: { color: '#a855f7', fontSize: 12, fontWeight: 'bold' },
  arrowCircle: { backgroundColor: '#111', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#333' },
  coinIcon: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }
});