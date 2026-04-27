import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  ScrollView,
  Platform, 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowDown, X, Search, Shield, BadgeCheck } from 'lucide-react-native';
import { VersionedTransaction, Keypair, PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';

import { ReferralProvider } from '@jup-ag/referral-sdk';

import { MY_PLATFORM_FEE_BPS, MY_FEE_ACCOUNT } from '../constants/config';
import { parseSolanaError } from '../utils/solanaUtils';
import { TokenIcon } from '../components/TokenIcon';
import { ConfirmModal, SuccessModal, SimpleAlertModal } from '../components/ActionModals';

import { refreshAssetsService } from '../services/refreshAssets';
import { jupiterQuoteApi } from '../services/jupiterService'; // ★共通クライアントをインポート！

import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { ADMOB_ANDROID_BANNER_ID as ADMOB_ANDROID_ENV } from '@env';

const BAD_MINTS_KEY = 'ramya_bad_icon_mints_v1';
const BANNER_ESTIMATED_HEIGHT = 60; 

const shortenAddress = (address: string, chars = 4) => {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

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

export const SwapScreen = ({
  t,
  wallet,
  tokenList,
  notify,
  connection,
  onRetryFetch,
  solBalance,
  tokenBalances,
}: any) => {
  const [badMints, setBadMints] = useState<Set<string>>(new Set());

  const adUnitId = useMemo(() => {
    if (Platform.OS !== 'android') return '';
    return (ADMOB_ANDROID_ENV || '').trim();
  }, []);
  const showBanner = adUnitId.length > 0;

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(BAD_MINTS_KEY);
        const arr = raw ? (JSON.parse(raw) as string[]) : [];
        setBadMints(new Set(arr.filter(Boolean)));
      } catch {
        setBadMints(new Set());
      }
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

  useEffect(() => {
    if (iconFilteredTokenList.length > 2) {
      const sol = iconFilteredTokenList.find((x: any) => x.symbol === 'SOL') || iconFilteredTokenList[0];
      const usdc = iconFilteredTokenList.find((x: any) => x.symbol === 'USDC') || iconFilteredTokenList[1];
      setFromToken((prev: any) => (prev?.address ? prev : sol));
      setToToken((prev: any) => (prev?.address ? prev : usdc));
    }
  }, [iconFilteredTokenList]);

  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '' });

  const [modalVisible, setModalVisible] = useState(false);
  const [modalSide, setModalSide] = useState<'from' | 'to'>('from');
  const [searchQuery, setSearchQuery] = useState('');

  const currentBalance = useMemo(() => {
    if (fromToken?.symbol === 'SOL') return solBalance || 0;
    const balances = tokenBalances || {};
    return balances[fromToken?.address] || 0;
  }, [fromToken, solBalance, tokenBalances]);

  const filteredTokens = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const balances = tokenBalances || {};
    const list = iconFilteredTokenList;

    if (query) {
      return list
        .filter((x: any) => {
          const symbol = (x.symbol || '').toLowerCase();
          const name = (x.name || '').toLowerCase();
          const addr = (x.address || '').toLowerCase();
          return symbol.includes(query) || name.includes(query) || addr.includes(query);
        })
        .slice(0, 100);
    }

    if (modalSide === 'from') {
      return list.filter((x: any) => {
        const bal = x.symbol === 'SOL' ? solBalance : balances[x.address] || 0;
        return bal > 0 || x.symbol === 'SOL' || x.symbol === 'USDC';
      });
    }

    return list.slice(0, 100);
  }, [iconFilteredTokenList, searchQuery, tokenBalances, solBalance, modalSide]);

  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
      setQuote(null);
      return;
    }
    if (!fromToken?.address || !toToken?.address) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const decimals = fromToken.decimals || 9;
        const amountInLamports = Math.floor(parseFloat(amount) * Math.pow(10, decimals));
        const quoteResponse = await jupiterQuoteApi.quoteGet({
          inputMint: fromToken.address,
          outputMint: toToken.address,
          amount: amountInLamports,
          slippageBps: 100,
          platformFeeBps: MY_PLATFORM_FEE_BPS,
        });
        setQuote(quoteResponse);
      } catch {
        setQuote(null);
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [amount, fromToken, toToken]);

  const doSwap = async () => {
    if (!wallet || !quote || !connection) return;
    setLoading(true);
    try {
      let feeAccountStr: string | null = null;
      if (MY_PLATFORM_FEE_BPS > 0 && MY_FEE_ACCOUNT) {
        try {
          const provider = new ReferralProvider(connection);
          const referralAccountPubKey = new PublicKey(MY_FEE_ACCOUNT);
          const mint = new PublicKey(toToken.address);
          const feeAccountPubKey = await provider.getReferralTokenAccountPubKey({ referralAccountPubKey, mint });
          feeAccountStr = feeAccountPubKey.toBase58();
        } catch (err) {
          console.warn('[Swap] Fee Error:', err);
        }
      }

      const requestParams: any = {
        quoteResponse: quote,
        userPublicKey: wallet.address,
        wrapAndUnwrapSol: true,
        ...(feeAccountStr ? { feeAccount: feeAccountStr } : {}),
        dynamicComputeUnitLimit: true,
      };

      const swapResult = await jupiterQuoteApi.swapPost({ swapRequest: requestParams });
      if (!swapResult?.swapTransaction) throw new Error('No transaction');

      const transaction = VersionedTransaction.deserialize(Buffer.from(swapResult.swapTransaction, 'base64'));
      if (!wallet.secretKey) throw new Error('Wallet not loaded');

      transaction.sign([Keypair.fromSecretKey(wallet.secretKey)]);
      const txid = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: true, maxRetries: 2 });

      notify(t('processing'));
      const confirmation = await connection.confirmTransaction(txid, 'confirmed');
      if (confirmation.value.err) throw new Error('Tx Failed');

      notify(t('swap_success_msg'));
      setShowSuccess(true);
      setAmount('');
      setQuote(null);
      if (onRetryFetch) onRetryFetch();

      refreshAssetsService({ force: true });

    } catch (e: any) {
      setAlert({ visible: true, title: t('swap_failed'), message: parseSolanaError(e, t) });
    } finally {
      setLoading(false);
    }
  };

  const handleSwapPress = () => {
    if (quote) setShowConfirm(true);
  };

  const displayOutAmount = useMemo(() => {
    if (!quote?.outAmount) return '0';
    return (Number(quote.outAmount) / Math.pow(10, toToken.decimals || 6)).toFixed(4);
  }, [quote, toToken]);

  const handleSwitch = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setAmount('');
    setQuote(null);
  };

  return (
    <View style={localStyles.container}>
      <Text style={localStyles.screenTitle}>{t('swap')}</Text>

      <ScrollView 
        contentContainerStyle={[
          localStyles.scrollContent, 
          { paddingBottom: showBanner ? BANNER_ESTIMATED_HEIGHT + 20 : 40 }
        ]}
      >
        <View style={localStyles.card}>
          <View style={localStyles.cardHeader}>
            <Text style={localStyles.cardLabel}>{t('pay')}</Text>
            <Text style={localStyles.balanceText}>
              {t('available')}: {Number(currentBalance).toLocaleString()}
            </Text>
          </View>

          <View style={localStyles.inputRow}>
            <TextInput
              style={[localStyles.amountInput, { fontSize: amount.length > 10 ? 24 : 32, textAlign: 'right' }]}
              placeholder="0"
              placeholderTextColor="#555"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <TouchableOpacity
              style={localStyles.tokenSelectBtn}
              onPress={() => {
                setModalSide('from');
                setModalVisible(true);
              }}
            >
              <TokenIcon
                uri={fromToken.logoURI}
                symbol={fromToken.symbol}
                mint={fromToken.address}
                size={36}
                onBadIcon={(mint) => markBadMint(mint)}
              />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={localStyles.tokenSymbol}>{fromToken.symbol}</Text>
                <Text style={localStyles.tokenAddress} numberOfLines={1}>
                  {shortenAddress(fromToken.address)}
                </Text>
              </View>
              <ArrowDown size={16} color="#aaa" />
            </TouchableOpacity>
          </View>

          <View style={localStyles.percentRow}>
            {[10, 50, 100].map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => {
                  let bal = Number(currentBalance);
                  let final = bal * (p / 100);
                  if (p === 100 && fromToken.symbol === 'SOL') final = Math.max(0, final - 0.01);
                  setAmount(final.toFixed(6).replace(/\.?0+$/, ''));
                }}
                style={localStyles.percentBtn}
              >
                <Text style={localStyles.percentText}>{p === 100 ? 'MAX' : `${p}%`}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={localStyles.switchContainer}>
          <TouchableOpacity style={localStyles.switchBtn} onPress={handleSwitch}>
            <ArrowDown size={24} color="#a855f7" />
          </TouchableOpacity>
        </View>

        <View style={[localStyles.card, { paddingTop: 24 }]}>
          <View style={localStyles.cardHeader}>
            <Text style={localStyles.cardLabel}>{t('receive_lbl')}</Text>
          </View>

          <View style={localStyles.inputRow}>
            {loading ? (
              <ActivityIndicator color="#a855f7" style={{ marginLeft: 'auto', marginRight: 10 }} />
            ) : (
              <Text
                style={[
                  localStyles.amountInput,
                  { color: quote ? '#fff' : '#666', fontSize: displayOutAmount.length > 10 ? 24 : 32, textAlign: 'right' },
                ]}
              >
                {displayOutAmount}
              </Text>
            )}

            <TouchableOpacity
              style={localStyles.tokenSelectBtn}
              onPress={() => {
                setModalSide('to');
                setModalVisible(true);
              }}
            >
              <TokenIcon
                uri={toToken.logoURI}
                symbol={toToken.symbol}
                mint={toToken.address}
                size={36}
                onBadIcon={(mint) => markBadMint(mint)}
              />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={localStyles.tokenSymbol}>{toToken.symbol}</Text>
                <Text style={localStyles.tokenAddress} numberOfLines={1}>
                  {shortenAddress(toToken.address)}
                </Text>
              </View>
              <ArrowDown size={16} color="#aaa" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={localStyles.infoBox}>
          <View style={localStyles.infoRow}>
            <Text style={localStyles.infoLabel}>{t('route')}</Text>
            <Text style={localStyles.infoValue}>Jupiter SDK</Text>
          </View>
          <View style={localStyles.infoRow}>
            <Text style={localStyles.infoLabel}>{t('fee')}</Text>
            <Text style={[localStyles.infoValue, { color: '#4ade80' }]}>0% {t('included')} ✨</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[localStyles.swapBtn, (!quote || loading) && { backgroundColor: '#333' }]}
          disabled={!quote || loading}
          onPress={handleSwapPress}
        >
          <Text style={localStyles.swapBtnText}>{loading ? t('processing') : t('swap_btn')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={localStyles.modalContainer}>
          <View style={localStyles.modalHeader}>
            <Text style={localStyles.modalTitle}>{t('select')}</Text>
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                setSearchQuery('');
              }}
            >
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={localStyles.searchBar}>
            <Search size={20} color="#888" style={{ marginRight: 8 }} />
            <TextInput
              style={localStyles.searchInput}
              placeholder="Search tokens..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
          </View>

          <View style={localStyles.verifiedBanner}>
            <Shield size={14} color="#3b82f6" style={{ marginRight: 6 }} />
            <Text style={localStyles.verifiedText}>{t('verified_tokens_desc')}</Text>
          </View>

          <FlatList
            data={filteredTokens}
            keyExtractor={(item: any) => item.address || item.symbol}
            renderItem={({ item }: any) => {
              const balances = tokenBalances || {};
              const bal = item.symbol === 'SOL' ? solBalance : balances[item.address] || 0;

              return (
                <TouchableOpacity
                  style={localStyles.tokenItem}
                  onPress={() => {
                    if (modalSide === 'from') {
                      setFromToken(item);
                      setAmount('');
                      setQuote(null);
                    } else {
                      setToToken(item);
                    }
                    setModalVisible(false);
                    setSearchQuery('');
                  }}
                >
                  <TokenIcon
                    uri={item.logoURI}
                    symbol={item.symbol}
                    mint={item.address}
                    size={40}
                    onBadIcon={(mint) => markBadMint(mint)}
                  />
                  <View style={localStyles.tokenInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={localStyles.tokenSymbolLarge}>{item.symbol}</Text>
                      <View style={{ marginLeft: 6 }}>
                        <BadgeCheck size={18} color="#3b82f6" fill="#1e1e1e" />
                      </View>
                    </View>
                    <Text style={localStyles.tokenName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>

                  {Number(bal) > 0 && (
                    <View style={localStyles.tokenBalanceContainer}>
                      <Text style={localStyles.tokenBalanceText}>
                        {Number(bal).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      <ConfirmModal
        visible={showConfirm}
        title={t('confirm_swap_title')}
        message={`${amount} ${fromToken.symbol} \n⬇️\n ${displayOutAmount} ${toToken.symbol}`}
        cancelText={t('cancel')}
        confirmText={t('swap_btn')}
        onCancel={() => setShowConfirm(false)}
        onConfirm={() => {
          setShowConfirm(false);
          doSwap();
        }}
      />

      <SuccessModal visible={showSuccess} message={t('swap_success_msg')} onDone={() => setShowSuccess(false)} />

      <SimpleAlertModal
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ ...alert, visible: false })}
      />

      {showBanner ? (
        <View style={localStyles.bannerContainer}>
          <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
        </View>
      ) : null}
    </View>
  );
};

const localStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', paddingTop: 10 },
  screenTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 20 },
  scrollContent: { paddingHorizontal: 16 },
  card: { backgroundColor: '#1e1e1e', borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#333' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardLabel: { color: '#aaa', fontSize: 14, fontWeight: '600' },
  balanceText: { color: '#aaa', fontSize: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 70 },
  amountInput: { flex: 1, fontSize: 32, color: '#fff', fontWeight: 'bold', height: '100%', padding: 0 },
  tokenSelectBtn: { backgroundColor: '#333', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, marginLeft: 12, minWidth: 140, flexDirection: 'row', alignItems: 'center' },
  tokenSymbol: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  tokenAddress: { color: '#888', fontSize: 10 },
  percentRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  percentBtn: { backgroundColor: '#2a2a2a', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#444' },
  percentText: { color: '#a855f7', fontSize: 12, fontWeight: 'bold' },
  switchContainer: { alignItems: 'center', marginVertical: -20, zIndex: 10 },
  switchBtn: { backgroundColor: '#111', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#a855f7' },
  infoBox: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 12, marginTop: 16, borderWidth: 1, borderColor: '#333' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  infoLabel: { color: '#888', fontSize: 13 },
  infoValue: { color: '#e2e8f0', fontSize: 13, fontWeight: '600' },
  swapBtn: { backgroundColor: '#a855f7', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 24 },
  swapBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalContainer: { flex: 1, backgroundColor: '#1a1a1a', paddingTop: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', marginHorizontal: 16, borderRadius: 12, paddingHorizontal: 12, height: 48, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#fff', height: '100%' },
  tokenItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  tokenInfo: { marginLeft: 12, flex: 1 },
  tokenSymbolLarge: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  tokenName: { fontSize: 14, color: '#888' },
  tokenBalanceContainer: { alignItems: 'flex-end' },
  tokenBalanceText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  verifiedBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.15)', marginHorizontal: 16, marginBottom: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)' },
  verifiedText: { color: '#60a5fa', fontSize: 12, fontWeight: '600', flex: 1 },
  bannerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 8,
    backgroundColor: 'transparent', 
  },
});