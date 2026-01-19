import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, FlatList, Image, Alert } from 'react-native';
import { ArrowDown, X, Search, Shield } from 'lucide-react-native';
import { VersionedTransaction, Keypair, Connection } from '@solana/web3.js';
import { Buffer } from 'buffer';

import { styles } from '../styles/globalStyles';
import { JUPITER_QUOTE_API, JUPITER_SWAP_API, MY_PLATFORM_FEE_BPS, MY_FEE_ACCOUNT } from '../constants/config';

// --- サブコンポーネント ---
const TokenSelectBtn = ({token, onPress, label}: any) => (
  <TouchableOpacity style={styles.tokenBtn} onPress={onPress}>
     <Text style={styles.tokenBtnText}>{token?.symbol || label}</Text>
     <ArrowDown size={14} color="#aaa"/>
  </TouchableOpacity>
);

// --- メインコンポーネント ---
export const SwapScreen = ({ t, wallet, tokenList, notify, connection, onRetryFetch }: any) => {
  const [fromToken, setFromToken] = useState(tokenList[0] || {});
  const [toToken, setToToken] = useState(tokenList[1] || {});
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalSide, setModalSide] = useState('from');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (modalVisible && tokenList.length <= 7) {
      onRetryFetch();
    }
  }, [modalVisible]);

  const filteredTokens = useMemo(() => {
    if (!searchQuery) return tokenList;
    const lowerQuery = searchQuery.toLowerCase();
    return tokenList.filter((t: any) => 
      (t.symbol?.toLowerCase().includes(lowerQuery) || 
       t.name?.toLowerCase().includes(lowerQuery) ||
       t.address?.includes(searchQuery))
    );
  }, [tokenList, searchQuery]);

  useEffect(() => {
    if(!amount || parseFloat(amount) <= 0) { setQuote(null); return; }
    const timer = setTimeout(async () => {
       setLoading(true);
       try {
         const amountInLamports = Math.floor(parseFloat(amount) * Math.pow(10, fromToken.decimals));
         const params = new URLSearchParams({
           inputMint: fromToken.address,
           outputMint: toToken.address,
           amount: amountInLamports.toString(),
           slippageBps: '50', 
           platformFeeBps: MY_PLATFORM_FEE_BPS.toString()
         });
         const res = await fetch(`${JUPITER_QUOTE_API}?${params}`);
         const data = await res.json();
         if (data.error) throw new Error(data.error);
         setQuote(data);
       } catch (e: any) { 
         console.log("Quote Error", e); 
         setQuote(null); 
       } finally { setLoading(false); }
    }, 600);
    return () => clearTimeout(timer);
  }, [amount, fromToken, toToken]);

  const doSwap = async () => {
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
      
      if(!wallet.secretKey) throw new Error("秘密鍵が見つかりません");
      const keypair = Keypair.fromSecretKey(wallet.secretKey);
      
      transaction.sign([keypair]);
      const rawTransaction = transaction.serialize();
      const txid = await connection.sendRawTransaction(rawTransaction, { skipPreflight: true, maxRetries: 2 });
      notify("Tx...");
      await connection.confirmTransaction(txid);
      notify(t('send_success'));
      setAmount(''); setQuote(null);
    } catch (e: any) { notify(t('error')); } finally { setLoading(false); }
  };

  return (
    <View style={styles.content}>
      <Text style={styles.screenTitle}>{t('swap')}</Text>
      <View style={styles.swapCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>{t('pay')}</Text>
          <TokenSelectBtn token={fromToken} label={t('select')} onPress={() => {setModalSide('from'); setModalVisible(true)}} />
        </View>
        <TextInput style={styles.input} placeholder="0" placeholderTextColor="#555" keyboardType="numeric" value={amount} onChangeText={setAmount} />
      </View>
      <View style={{alignItems:'center', marginVertical:-15, zIndex:10}}><View style={styles.arrowCircle}><ArrowDown size={20} color="#a855f7" /></View></View>
      <View style={[styles.swapCard, {paddingTop: 25}]}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>{t('receive_lbl')}</Text>
          <TokenSelectBtn token={toToken} label={t('select')} onPress={() => {setModalSide('to'); setModalVisible(true)}} />
        </View>
        {loading ? <ActivityIndicator style={{alignSelf:'flex-start', marginVertical:10}}/> : <Text style={styles.input}>{quote ? (quote.outAmount / Math.pow(10, toToken.decimals)).toFixed(4) : '0.00'}</Text>}
      </View>
      <View style={styles.infoBox}>
         <Text style={styles.infoText}>{quote ? `${t('route')}: Jupiter Aggregator` : 'Jupiter Aggregator'}</Text>
         <View style={{flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4}}>
           <Text style={[styles.infoText, {color:'#a855f7', marginRight: 8}]}>{t('fee')}: 0.4% ({t('included')})</Text>
           <View style={styles.jitoBadge}>
             <Shield size={12} color="white" style={{marginRight: 4}} />
             <Text style={styles.jitoText}>{t('jito_protection')}</Text>
           </View>
         </View>
      </View>
      <TouchableOpacity style={[styles.primaryButton, (!quote || loading) && {backgroundColor:'#333'}]} disabled={!quote || loading} onPress={doSwap}>
        <Text style={styles.primaryButtonText}>{loading ? t('processing') : t('swap_btn')}</Text>
      </TouchableOpacity>

      {modalVisible && (
        <View style={styles.modalOverlay}>
           <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContent}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>{t('select')}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><X color="#fff" /></TouchableOpacity>
              </View>
              
              <View style={{ backgroundColor: '#222', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginVertical: 10 }}>
                <Search size={20} color="#888" />
                <TextInput 
                  style={{ flex: 1, color: 'white', padding: 12 }}
                  placeholder={`Search (${tokenList.length})`}
                  placeholderTextColor="#666"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <FlatList
                data={filteredTokens}
                keyExtractor={(item) => item.address}
                initialNumToRender={10}
                maxToRenderPerBatch={20}
                windowSize={10}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.tokenItem} onPress={() => { 
                    if(modalSide === 'from') setFromToken(item); 
                    else setToToken(item); 
                    setModalVisible(false); 
                    setSearchQuery(''); 
                  }}>
                     <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
                       {item.logoURI ? (
                         <Image source={{uri: item.logoURI}} style={{width: 30, height: 30, borderRadius: 15}} />
                       ) : (
                         <View style={{width:30, height:30, borderRadius:15, backgroundColor:'#555', alignItems:'center', justifyContent:'center'}}>
                           <Text style={{color:'#fff', fontSize:10}}>{item.symbol?.[0]}</Text>
                         </View>
                       )}
                       <View>
                         <Text style={styles.tokenSym}>{item.symbol}</Text>
                         <Text style={styles.tokenName}>{item.name}</Text>
                       </View>
                     </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={() => (
                   <Text style={{color:'#666', textAlign:'center', marginTop:20}}>No Token</Text>
                )}
              />
           </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
};