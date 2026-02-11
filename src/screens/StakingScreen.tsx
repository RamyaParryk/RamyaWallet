import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { ArrowDown } from 'lucide-react-native';
import { VersionedTransaction, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Buffer } from 'buffer';

// ★ SDKをインポート
import { createJupiterApiClient } from '@jup-ag/api';

import { styles } from '../styles/globalStyles';
import { HeaderRow } from '../components/HeaderRow';
// JUPITER_BASE_PATH を追加でインポートしてください
import { SOL_MINT, JITO_SOL_MINT, JUPITER_BASE_PATH } from '../constants/config';
import { parseSolanaError } from '../utils/solanaUtils';
import { ConfirmModal, SuccessModal } from '../components/ActionModals';

// ★ クライアントを初期化（SwapScreenと同じ強い設定）
const jupiterQuoteApi = createJupiterApiClient({
  basePath: JUPITER_BASE_PATH,
});

export const StakingScreen = ({ t, wallet, connection, notify, onBack, solBalance, onRetryFetch }: any) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const safeBalance = Number(solBalance) || 0;

  // パーセント選択処理
  const handlePercentSelect = (percent: number) => {
    let finalAmount = 0;
    if (percent === 100) {
      // MAXの場合、ガス代(0.01)を残す
      finalAmount = Math.max(0, safeBalance - 0.01);
    } else {
      finalAmount = safeBalance * (percent / 100);
    }
    setAmount(finalAmount.toFixed(4).replace(/\.?0+$/, ""));
  };

  // Quote取得（SDKを使用）
  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
      setQuote(null);
      return;
    }
    const fetchQuote = async () => {
      setLoading(true);
      try {
        const inputLamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);

        // ★ SDKを使って見積もりを取得
        const q = await jupiterQuoteApi.quoteGet({
          inputMint: SOL_MINT,
          outputMint: JITO_SOL_MINT,
          amount: inputLamports,
          slippageBps: 50, // 0.5%
        });

        if (!q) throw new Error("No quote found");
        setQuote(q);
      } catch (e: any) {
        setQuote(null);
      } finally { setLoading(false); }
    };
    const timer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timer);
  }, [amount]);

  // ダイアログ
  const handleStakePress = () => {
    if (!quote) return;
    setShowConfirm(true);
  };

  const doStake = async () => {
    if (!wallet || !quote || !connection) return;
    setLoading(true);
    try {
      // ★ SDKを使ってSwapトランザクションを作成
      // ここでSwapと同じ設定（dynamicComputeUnitLimit）を使います
      const result = await jupiterQuoteApi.swapPost({
        swapRequest: {
          quoteResponse: quote,
          userPublicKey: wallet.address,
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true as any, // 爆速設定
          // prioritizeFeeLamports は削除済み
        }
      });

      if (!result || !result.swapTransaction) throw new Error("Failed to get swap transaction");

      const swapTransactionBuf = Buffer.from(result.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      if (!wallet.secretKey) throw new Error("Wallet not loaded");
      const keypair = Keypair.fromSecretKey(wallet.secretKey);
      transaction.sign([keypair]);

      const rawTransaction = transaction.serialize();

      const txid = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
        maxRetries: 2
      });

      notify(t('processing'));

      const confirmation = await connection.confirmTransaction(txid, 'confirmed');
      if (confirmation.value.err) throw new Error("Transaction Failed");

      notify(t('stake_success_msg'));
      setShowSuccess(true);
      setAmount('');
      setQuote(null);
      // 重たい処理が続くので、2000ミリ秒まつ
      if (onRetryFetch) {
        setTimeout(() => {
          console.log("[STAKE] 2秒経過：残高更新を開始します");
          onRetryFetch();
        }, 2000);
      }

    } catch (e: any) {
      console.error("[STAKE] Failed:", e);
      const friendlyMsg = parseSolanaError(e, t);
      Alert.alert(t('stake_failed'), friendlyMsg);
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
        <View style={[styles.swapCard, { marginTop: 10 }]}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>{t('deposit')} (SOL)</Text>
            <Text style={{ color: '#888', fontSize: 12 }}>
              {t('available')}: {safeBalance.toFixed(4)} SOL
            </Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor="#555"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {[10, 50, 100].map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => handlePercentSelect(p)}
                style={{
                  backgroundColor: '#222',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#333'
                }}
              >
                <Text style={{ color: '#a855f7', fontSize: 12, fontWeight: 'bold' }}>
                  {p === 100 ? 'MAX' : `${p}%`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ alignItems: 'center', marginVertical: 10 }}>
          <ArrowDown size={24} color="#666" />
        </View>

        <View style={[styles.swapCard, { backgroundColor: '#222' }]}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>{t('receive_lbl')} (JitoSOL)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={[styles.coinIcon, { backgroundColor: '#22c55e' }]}><Text style={{ fontWeight: 'bold', color: 'white' }}>J</Text></View>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>JitoSOL</Text>
            </View>
          </View>
          {loading ? <ActivityIndicator color="#a855f7" /> : (
            <Text style={styles.input}>{estimatedJitoSol}</Text>
          )}
          <Text style={[styles.balanceText, { color: '#22c55e', fontWeight: 'bold', fontSize: 14 }]}>
            {t('apy_est')}
          </Text>
        </View>

        {/* handleStakePress に変更済み */}
        <TouchableOpacity
          style={[styles.primaryButton, (!quote || loading) && { backgroundColor: '#333' }, { marginTop: 30 }]}
          disabled={!quote || loading}
          onPress={handleStakePress}
        >
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
        onConfirm={() => {
          setShowConfirm(false);
          doStake(); // ここで実行
        }}
      />

      {/* 2. 成功用アニメーション */}
      <SuccessModal
        visible={showSuccess}
        message={t('stake_success_msg')}
        onDone={() => setShowSuccess(false)}
      />
    </View>
  );
};