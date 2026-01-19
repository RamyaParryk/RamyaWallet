import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { ArrowDown } from 'lucide-react-native';
import { VersionedTransaction, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Buffer } from 'buffer';

import { styles } from '../styles/globalStyles';
import { HeaderRow } from '../components/HeaderRow';
import { 
  JUPITER_QUOTE_API, JUPITER_SWAP_API, SOL_MINT, JITO_SOL_MINT, 
  MY_PLATFORM_FEE_BPS, MY_FEE_ACCOUNT 
} from '../constants/config';

export const StakingScreen = ({ t, wallet, connection, notify, onBack, solBalance }: any) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);

  useEffect(() => {
    if(!amount || parseFloat(amount) <= 0) { setQuote(null); return; }
    
    const fetchQuote = async () => {
       setLoading(true);
       try {
         const inputLamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
         const params = new URLSearchParams({
           inputMint: SOL_MINT,
           outputMint: JITO_SOL_MINT,
           amount: inputLamports.toString(),
           slippageBps: '50', // 0.5%
           platformFeeBps: MY_PLATFORM_FEE_BPS.toString()
         });
         
         const res = await fetch(`${JUPITER_QUOTE_API}?${params}`);
         const data = await res.json();
         if (data.error) throw new Error(data.error);
         setQuote(data);
       } catch (e: any) { console.log(e); } 
       finally { setLoading(false); }
    };

    const timer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timer);
  }, [amount]);

  const doStake = async () => {
    if (!wallet || !quote || !connection) return;
    setLoading(true);
    try {
      const swapBody = { 
        quoteResponse: quote, 
        userPublicKey: wallet.address, 
        wrapAndUnwrapSol: true,
        feeAccount: MY_FEE_ACCOUNT 
      };
      
      const swapRes = await fetch(JUPITER_SWAP_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(swapBody) });
      const swapJson = await swapRes.json();
      if (swapJson.error) throw new Error(swapJson.error);

      const swapTransactionBuf = Buffer.from(swapJson.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      
      const keypair = Keypair.fromSecretKey(wallet.secretKey);
      transaction.sign([keypair]);
      
      const rawTransaction = transaction.serialize();
      const txid = await connection.sendRawTransaction(rawTransaction, { skipPreflight: true, maxRetries: 2 });
      notify(t('processing'));
      await connection.confirmTransaction(txid);
      
      notify(t('staking_success'));
      setAmount('');
      setQuote(null);
    } catch (e: any) { 
      console.error(e); 
      Alert.alert(t('error'), e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <View style={styles.content}>
      <HeaderRow title={t('staking_btn')} onBack={onBack} />

      <ScrollView>
        <View style={styles.infoCard}>
           <Text style={styles.label}>{t('liquid_staking')}</Text>
           <Text style={styles.descText}>{t('staking_desc')}</Text>
        </View>

        <View style={styles.swapCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>{t('deposit')} (SOL)</Text>
            <View style={{flexDirection:'row', alignItems:'center', gap:5}}>
               <View style={[styles.coinIcon, {backgroundColor:'#9945FF'}]}><Text style={{fontWeight:'bold', color:'white'}}>S</Text></View>
               <Text style={{color:'white', fontWeight:'bold'}}>SOL</Text>
            </View>
          </View>
          <TextInput 
            style={styles.input} 
            placeholder="0" 
            placeholderTextColor="#555" 
            keyboardType="numeric" 
            value={amount} 
            onChangeText={setAmount} 
          />
          <Text style={styles.balanceText}>Balance: {solBalance?.toFixed(4)} SOL</Text>
        </View>

        <View style={{alignItems:'center', marginVertical:10}}>
          <ArrowDown size={24} color="#666" />
        </View>

        <View style={[styles.swapCard, {backgroundColor:'#222'}]}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>{t('receive_lbl')} (JitoSOL)</Text>
            <View style={{flexDirection:'row', alignItems:'center', gap:5}}>
               <View style={[styles.coinIcon, {backgroundColor:'#22c55e'}]}><Text style={{fontWeight:'bold', color:'white'}}>J</Text></View>
               <Text style={{color:'white', fontWeight:'bold'}}>JitoSOL</Text>
            </View>
          </View>
          {loading ? <ActivityIndicator color="#a855f7" /> : (
            <Text style={styles.input}>
               {quote ? (quote.outAmount / 1000000000).toFixed(4) : "0.00"}
            </Text>
          )}
          <Text style={[styles.balanceText, {color: '#22c55e', fontWeight: 'bold', fontSize: 14}]}>
          {t('apy_est')}
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.primaryButton, (!quote || loading) && {backgroundColor:'#333'}, {marginTop:30}]} 
          disabled={!quote || loading} 
          onPress={doStake}
        >
          <Text style={styles.primaryButtonText}>{loading ? t('processing') : t('staking_btn')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};