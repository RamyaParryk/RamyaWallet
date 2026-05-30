import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, FlatList, Modal, StyleSheet, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowDown, X, Search } from 'lucide-react-native';
import { VersionedTransaction, Keypair, PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { ReferralProvider } from '@jup-ag/referral-sdk';

import { MY_PLATFORM_FEE_BPS, MY_FEE_ACCOUNT } from '../constants/config';
import { signWithSeedVault, parseSolanaError, shortenAddress } from '../utils/solanaUtils'; 
import { TokenIcon } from '../components/TokenIcon';
import { ConfirmModal, SuccessModal, SimpleAlertModal } from '../components/ActionModals';
import { refreshAssetsService } from '../services/refreshAssets';
import { jupiterQuoteApi } from '../services/jupiterService'; 
import { styles as globalStyles } from '../styles/globalStyles';

import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { ADMOB_ANDROID_BANNER_ID as ADMOB_ANDROID_ENV } from '@env';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BAD_MINTS_KEY = 'ramya_bad_icon_mints_v1';
const BANNER_ESTIMATED_HEIGHT = 60; 

function isValidLogo(uri?: string) {
  if (!uri) return false;
  const s = String(uri).trim();
  if (!s) return false;
  const lower = s.toLowerCase();
  if (lower.endsWith('.svg')) return false;
  if (lower.startsWith('data:image/svg')) return false;
  if (lower.startsWith('ipfs://')) return false;
  return true;
}

export const SwapScreen = ({ t, wallet, tokenList, notify, connection, onRetryFetch, solBalance, tokenBalances, preSelectedAsset }: any) => {
  const insets = useSafeAreaInsets();
  const [badMints, setBadMints] = useState<Set<string>>(new Set());
  const adUnitId = useMemo(() => (Platform.OS === 'android' ? (ADMOB_ANDROID_ENV || '').trim() : ''), []);
  const showBanner = adUnitId.length > 0;

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(BAD_MINTS_KEY);
        const arr = raw ? (JSON.parse(raw) as string[]) : [];
        setBadMints(new Set(arr.filter(Boolean)));
      } catch { setBadMints(new Set()); }
    })();
  }, []);

  const markBadMint = useCallback(async (mint: string) => {
    if (!mint) return;
    setBadMints((prev) => {
      if (prev.has(mint)) return prev;
      const next = new Set(prev);
      AsyncStorage.setItem(BAD_MINTS_KEY, JSON.stringify(Array.from(next))).catch(() => {});
      return next;
    });
  }, []);

  const iconFilteredTokenList = useMemo(() => {
    if (!Array.isArray(tokenList)) return [];
    return tokenList.filter((tok: any) => {
      const mint = tok.address || tok.mint;
      const sym = tok.symbol;
      if (sym === 'SOL' || sym === 'USDC') return true;
      if (!mint) return false;
      if (badMints.has(mint)) return false;
      return isValidLogo(tok.logoURI);
    });
  }, [tokenList, badMints]);

  const [fromToken, setFromToken] = useState<any>({});
  const [toToken, setToToken] = useState<any>({});
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '' });
  const [modalVisible, setModalVisible] = useState(false);
  const [modalSide, setModalSide] = useState<'from' | 'to'>('from');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (iconFilteredTokenList.length > 0) {
      setFromToken((prev: any) => {
        if (prev?.address || prev?.mint) return prev;
        if (preSelectedAsset) return iconFilteredTokenList.find((x: any) => x.address === preSelectedAsset.mint) || preSelectedAsset;
        return iconFilteredTokenList.find((x: any) => x.symbol === 'SOL') || iconFilteredTokenList[0];
      });

      setToToken((prev: any) => {
        if (prev?.address || prev?.mint) return prev;
        const currentFromSymbol = preSelectedAsset?.symbol || 'SOL';
        const fallbackSymbol = currentFromSymbol === 'USDC' ? 'SOL' : 'USDC';
        return iconFilteredTokenList.find((x: any) => x.symbol === fallbackSymbol) || iconFilteredTokenList[1] || iconFilteredTokenList[0];
      });
    }
  }, [iconFilteredTokenList, preSelectedAsset]);

  const currentBalance = useMemo(() => {
    const address = fromToken?.address || fromToken?.mint;
    if (fromToken?.symbol === 'SOL') return solBalance || 0;
    return (tokenBalances || {})[address] || 0;
  }, [fromToken, solBalance, tokenBalances]);

  const filteredTokens = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const list = iconFilteredTokenList;
    if (query) return list.filter((x: any) => (x.symbol || '').toLowerCase().includes(query) || (x.name || '').toLowerCase().includes(query) || (x.address || '').toLowerCase().includes(query)).slice(0, 100);
    if (modalSide === 'from') return list.filter((x: any) => (x.symbol === 'SOL' ? solBalance : (tokenBalances || {})[x.address] || 0) > 0 || x.symbol === 'SOL' || x.symbol === 'USDC');
    return list.slice(0, 100);
  }, [iconFilteredTokenList, searchQuery, tokenBalances, solBalance, modalSide]);

  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) return setQuote(null);
    const fromAddr = fromToken?.address || fromToken?.mint;
    const toAddr = toToken?.address || toToken?.mint;
    if (!fromAddr || !toAddr) return;
    
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const decimals = fromToken.decimals || 9;
        const amountInLamports = Math.floor(parseFloat(amount) * Math.pow(10, decimals));
        setQuote(await jupiterQuoteApi.quoteGet({ inputMint: fromAddr, outputMint: toAddr, amount: amountInLamports, slippageBps: 100, platformFeeBps: MY_PLATFORM_FEE_BPS }));
      } catch { setQuote(null); } finally { setLoading(false); }
    }, 600);
    return () => clearTimeout(timer);
  }, [amount, fromToken, toToken]);

  const doSwap = async () => {
    if (!wallet || !quote || !connection) return;
    setLoading(true);
    try {
      const toAddr = toToken?.address || toToken?.mint;
      let feeAccountStr: string | null = null;
      if (MY_PLATFORM_FEE_BPS > 0 && MY_FEE_ACCOUNT) {
        try {
          const provider = new ReferralProvider(connection);
          feeAccountStr = (await provider.getReferralTokenAccountPubKey({ referralAccountPubKey: new PublicKey(MY_FEE_ACCOUNT), mint: new PublicKey(toAddr) })).toBase58();
        } catch {}
      }

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

      if (feeAccountStr) requestParams.feeAccount = feeAccountStr;

      const swapResult = await jupiterQuoteApi.swapPost({ swapRequest: requestParams });
      if (!swapResult?.swapTransaction) throw new Error('No transaction');

      const txBytes = new Uint8Array(Buffer.from(swapResult.swapTransaction, 'base64'));
      let txid = '';

      if (wallet.walletType === 'seed-vault') {
        const signedTxBytes = await signWithSeedVault(txBytes, wallet);
        txid = await connection.sendRawTransaction(signedTxBytes, { skipPreflight: false });
      } else {
        if (!wallet.secretKey) throw new Error('Wallet not loaded');
        const transaction = VersionedTransaction.deserialize(txBytes);
        transaction.sign([Keypair.fromSecretKey(wallet.secretKey)]);
        txid = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false });
      }

      notify(t('processing') || 'Processing...');
      const confirmation = await connection.confirmTransaction(txid, 'confirmed');
      if (confirmation.value.err) throw new Error('Tx Failed');

      notify(t('swap_success_msg') || 'Swap successful!');
      setShowSuccess(true);
      setAmount('');
      setQuote(null);
      if (onRetryFetch) onRetryFetch();
      refreshAssetsService({ force: true });
    } catch (e: any) {
      console.error("🔥 [SWAP FATAL ERROR]", e);
      setAlert({ visible: true, title: t('error') || 'Error', message: parseSolanaError(e, t) });
    } finally { setLoading(false); }
  };

  const handleSwapPress = () => {
    if (quote) setShowConfirm(true);
  };

  const displayOutAmount = useMemo(() => quote?.outAmount ? (Number(quote.outAmount) / Math.pow(10, toToken.decimals || 6)).toFixed(4) : '0', [quote, toToken]);

  const handleSwitch = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setAmount('');
    setQuote(null);
  };

  return (
    <View style={localStyles.container}>
      <Text style={globalStyles.screenTitle}>{t('swap') || 'Swap'}</Text>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: showBanner ? BANNER_ESTIMATED_HEIGHT + 40 : 60 }}>
        
        <View style={globalStyles.card}>
          <View style={globalStyles.cardHeader}>
            <Text style={globalStyles.cardLabel}>{t('pay') || 'Pay'}</Text>
            <Text style={{ color: '#aaa', fontSize: 12 }}>{t('available') || 'Available'}: {Number(currentBalance).toLocaleString()}</Text>
          </View>
          <View style={localStyles.inputRow}>
            <TextInput style={[globalStyles.amountInputLarge, { fontSize: amount.length > 10 ? 24 : 32 }]} placeholder="0" placeholderTextColor="#555" keyboardType="numeric" value={amount} onChangeText={setAmount} />
            <TouchableOpacity style={localStyles.tokenSelectBtn} onPress={() => { setModalSide('from'); setModalVisible(true); }}>
              <TokenIcon uri={fromToken.logoURI} symbol={fromToken.symbol} mint={fromToken.address || fromToken.mint} size={36} onBadIcon={(mint) => markBadMint(mint)} />
              <View style={{ marginLeft: 8, flex: 1 }}><Text style={globalStyles.tokenSym}>{fromToken.symbol}</Text><Text style={{ color: '#888', fontSize: 10 }} numberOfLines={1}>{shortenAddress(fromToken.address || fromToken.mint)}</Text></View>
              <ArrowDown size={16} color="#aaa" />
            </TouchableOpacity>
          </View>
          <View style={globalStyles.percentRow}>
            {[10, 50, 100].map((p) => (
              <TouchableOpacity key={p} onPress={() => {
                  let final = Number(currentBalance) * (p / 100);
                  if (p === 100 && fromToken.symbol === 'SOL') {
                    final = Math.max(0, final - 0.005);
                  }
                  const dec = fromToken.decimals !== undefined ? fromToken.decimals : 9;
                  setAmount(final.toFixed(dec).replace(/\.?0+$/, ''));
                }} style={globalStyles.percentBtn}><Text style={globalStyles.percentText}>{p === 100 ? 'MAX' : `${p}%`}</Text></TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={localStyles.switchContainer}><TouchableOpacity style={localStyles.switchBtn} onPress={handleSwitch}><ArrowDown size={24} color="#a855f7" /></TouchableOpacity></View>
        
        <View style={[globalStyles.card, { paddingTop: 24 }]}>
          <View style={globalStyles.cardHeader}><Text style={globalStyles.cardLabel}>{t('receive_lbl') || 'Receive'}</Text></View>
          <View style={localStyles.inputRow}>
            {loading ? <ActivityIndicator color="#a855f7" style={{ marginLeft: 'auto', marginRight: 10 }} /> : <Text style={[globalStyles.amountInputLarge, { color: quote ? '#fff' : '#666', fontSize: displayOutAmount.length > 10 ? 24 : 32 }]}>{displayOutAmount}</Text>}
            <TouchableOpacity style={localStyles.tokenSelectBtn} onPress={() => { setModalSide('to'); setModalVisible(true); }}>
              <TokenIcon uri={toToken.logoURI} symbol={toToken.symbol} mint={toToken.address || toToken.mint} size={36} onBadIcon={(mint) => markBadMint(mint)} />
              <View style={{ marginLeft: 8, flex: 1 }}><Text style={globalStyles.tokenSym}>{toToken.symbol}</Text><Text style={{ color: '#888', fontSize: 10 }} numberOfLines={1}>{shortenAddress(toToken.address || toToken.mint)}</Text></View>
              <ArrowDown size={16} color="#aaa" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={localStyles.infoBox}>
          <View style={localStyles.infoRow}><Text style={localStyles.infoLabel}>{t('fee') || 'Fee'}</Text><Text style={[localStyles.infoValue, { color: '#4ade80' }]}>0% {t('included') || 'Included'} ✨</Text></View>
        </View>
        
        <TouchableOpacity style={[globalStyles.primaryButton, (!quote || loading) && { backgroundColor: '#333' }, { marginTop: 24 }]} disabled={!quote || loading} onPress={handleSwapPress}>
          <Text style={globalStyles.primaryButtonText}>{loading ? (t('processing') || 'Processing...') : (t('swap_btn') || 'Swap')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={globalStyles.modalOverlay}>
          <View style={[globalStyles.modalContent, { flex: 1, padding: 0 }]}>
            <View style={localStyles.modalHeader}><Text style={globalStyles.modalTitle}>{t('select') || 'Select'}</Text><TouchableOpacity onPress={() => { setModalVisible(false); setSearchQuery(''); }}><X size={24} color="#fff" /></TouchableOpacity></View>
            <View style={localStyles.searchBar}><Search size={20} color="#888" style={{ marginRight: 8 }} /><TextInput style={localStyles.searchInput} placeholder={t('search_tokens') || "Search tokens..."} placeholderTextColor="#888" value={searchQuery} onChangeText={setSearchQuery} autoCapitalize="none" /></View>
            <FlatList data={filteredTokens} keyExtractor={(item: any) => item.address || item.symbol} renderItem={({ item }: any) => {
                const bal = item.symbol === 'SOL' ? solBalance : (tokenBalances || {})[item.address] || 0;
                return (
                  <TouchableOpacity style={globalStyles.tokenItem} onPress={() => { modalSide === 'from' ? (setFromToken(item), setAmount(''), setQuote(null)) : setToToken(item); setModalVisible(false); setSearchQuery(''); }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TokenIcon uri={item.logoURI} symbol={item.symbol} mint={item.address} size={40} onBadIcon={(mint) => markBadMint(mint)} />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={globalStyles.tokenSym}>{item.symbol}</Text>
                        <Text style={globalStyles.tokenName} numberOfLines={1}>{item.name}</Text>
                      </View>
                    </View>
                    {Number(bal) > 0 && <View><Text style={globalStyles.tokenBal}>{Number(bal).toLocaleString(undefined, { maximumFractionDigits: 4 })}</Text></View>}
                  </TouchableOpacity>
                );
              }} />
          </View>
        </View>
      </Modal>

      <ConfirmModal visible={showConfirm} title={t('confirm_swap_title') || 'Confirm Swap'} message={`${amount} ${fromToken.symbol} \n⬇️\n ${displayOutAmount} ${toToken.symbol}`} cancelText={t('cancel') || 'Cancel'} confirmText={t('swap_btn') || 'Swap'} onCancel={() => setShowConfirm(false)} onConfirm={() => { setShowConfirm(false); doSwap(); }} />
      <SuccessModal visible={showSuccess} message={t('swap_success_msg') || 'Swap successful!'} onDone={() => setShowSuccess(false)} />
      <SimpleAlertModal visible={alert.visible} title={alert.title} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
      
      {showBanner && (
        <View style={[globalStyles.bannerContainerFixed, { paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0 }]}>
          <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
        </View>
        )}
    </View>
  );
};

const localStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', paddingTop: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 70 },
  tokenSelectBtn: { backgroundColor: '#333', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, marginLeft: 12, minWidth: 140, flexDirection: 'row', alignItems: 'center' },
  switchContainer: { alignItems: 'center', marginVertical: -20, zIndex: 10 },
  switchBtn: { backgroundColor: '#111', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#a855f7' },
  infoBox: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 12, marginTop: 16, borderWidth: 1, borderColor: '#333' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  infoLabel: { color: '#888', fontSize: 13 },
  infoValue: { color: '#e2e8f0', fontSize: 13, fontWeight: '600' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', marginHorizontal: 16, borderRadius: 12, paddingHorizontal: 12, height: 48, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#fff', height: '100%' },
});