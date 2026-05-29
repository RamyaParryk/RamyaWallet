import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { styles } from '../styles/globalStyles';
import { ExternalLink, AlertCircle, RefreshCw, ArrowUpRight, Zap, FileCode2 } from 'lucide-react-native';
import { Connection, PublicKey } from '@solana/web3.js';
import { MAINNET_RPC_URL, HELIUS_API_KEY } from '../constants/config';

const getRelativeTime = (timestamp: number | null | undefined, t: any) => {
  if (!timestamp) return t('unknown') || '不明';
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - timestamp);
  
  if (diff < 60) return `${diff}${t('time_sec_ago') || '秒前'}`;
  if (diff < 3600) return `${Math.floor(diff / 60)}${t('time_min_ago') || '分前'}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${t('time_hr_ago') || '時間前'}`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}${t('time_day_ago') || '日前'}`;
  return new Date(timestamp * 1000).toLocaleDateString();
};

const formatDescription = (desc: string, type: string, myAddress: string, t: any) => {
  if (!desc || desc === 'UNKNOWN') {
    if (type === 'SWAP') return t('swap') || 'スワップ';
    if (type === 'TRANSFER') return t('send') || '送金';
    return t('tx_contract') || 'コントラクト実行';
  }
  let formatted = desc.replace(new RegExp(myAddress, 'g'), t('tx_you') || 'あなた');
  formatted = formatted.replace(/[1-9A-HJ-NP-Za-km-z]{32,44}/g, (match) => {
    return `${match.slice(0, 4)}...${match.slice(-4)}`;
  });
  return formatted;
};

export const HistoryScreen = ({ t, address, onBack }: any) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!address) {
      setLoading(false);
      return;
    }
    try {
      if (HELIUS_API_KEY) {
        const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${HELIUS_API_KEY}`;
        const res = await fetch(url);
        if (res.ok) {
          const parsedData = await res.json();
          const formatted = parsedData.map((tx: any) => {
            const cleanDescription = formatDescription(tx.description, tx.type, address, t);
            return {
              signature: tx.signature,
              blockTime: tx.timestamp,
              relativeTime: getRelativeTime(tx.timestamp, t),
              error: tx.transactionError,
              status: tx.transactionError ? 'failed' : 'success',
              description: cleanDescription,
              type: tx.type,
            };
          });
          setHistory(formatted);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }
      const connection = new Connection(MAINNET_RPC_URL, 'confirmed');
      const pubKey = new PublicKey(address);
      const signatures = await connection.getSignaturesForAddress(pubKey, { limit: 20 });
      const data = signatures.map(sig => ({
        signature: sig.signature,
        blockTime: sig.blockTime,
        relativeTime: getRelativeTime(sig.blockTime, t),
        error: sig.err,
        status: sig.err ? 'failed' : 'success',
        description: t('tx_contract') || 'コントラクト実行',
        type: 'UNKNOWN'
      }));
      setHistory(data);
    } catch (e) {
      console.error("[HISTORY] Fetch failed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [address, t]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const onRefresh = () => { setRefreshing(true); fetchHistory(); };

  const getIconForType = (type: string, isFailed: boolean) => {
    if (isFailed) return <AlertCircle size={20} color="#ef4444" />;
    switch (type) {
      case 'SWAP': return <RefreshCw size={20} color="#a855f7" />;
      case 'TRANSFER': return <ArrowUpRight size={20} color="#3b82f6" />;
      case 'UNKNOWN': return <FileCode2 size={20} color="#888" />;
      default: return <Zap size={20} color="#22c55e" />;
    }
  };

  const getBgColorForType = (type: string, isFailed: boolean) => {
    if (isFailed) return 'rgba(239, 68, 68, 0.1)';
    switch (type) {
      case 'SWAP': return 'rgba(168, 85, 247, 0.1)';
      case 'TRANSFER': return 'rgba(59, 130, 246, 0.1)';
      case 'UNKNOWN': return 'rgba(136, 136, 136, 0.1)';
      default: return 'rgba(34, 197, 94, 0.1)';
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Text style={[styles.screenTitle, { paddingTop: 10, marginBottom: 4 }]}>{t('history') || '履歴'}</Text>
      <Text style={localStyles.subTitle}>{t('history_desc') || '最新10件の取引を表示します'}</Text>
      
      {loading ? (
        <View style={localStyles.center}>
          <ActivityIndicator size="large" color="#a855f7" />
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.signature}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}
          renderItem={({ item }) => {
            const isFailed = !!item.error;
            const icon = getIconForType(item.type, isFailed);
            const bgColor = getBgColorForType(item.type, isFailed);

            return (
              <TouchableOpacity 
                style={localStyles.txCard}
                activeOpacity={0.7}
                onPress={() => Linking.openURL(`https://solscan.io/tx/${item.signature}`)}
              >
                <View style={[localStyles.iconWrapper, { backgroundColor: bgColor }]}>
                  {icon}
                </View>

                <View style={localStyles.txInfo}>
                  <Text style={localStyles.txTitle} numberOfLines={3}>
                    {isFailed ? (t('error') || 'エラー') : item.description}
                  </Text>
                  <Text style={localStyles.txHash}>
                    {item.signature.slice(0, 8)}...{item.signature.slice(-8)}
                  </Text>
                </View>

                <View style={localStyles.txRight}>
                  <Text style={localStyles.txTime}>{item.relativeTime}</Text>
                  <ExternalLink size={14} color="#666" style={{ marginTop: 4 }} />
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={() => (
            <View style={localStyles.center}>
              <Text style={{ color: '#666', fontSize: 14 }}>{t('no_transactions') || '取引履歴はありません'}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

const localStyles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  subTitle: { textAlign: 'center', color: '#888', fontSize: 13, marginBottom: 16 },
  txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(26, 26, 26, 0.85)', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  iconWrapper: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txInfo: { flex: 1, paddingRight: 10, justifyContent: 'center' },
  txTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 4, lineHeight: 20 },
  txHash: { color: '#888', fontSize: 12 },
  txRight: { alignItems: 'flex-end', justifyContent: 'center', minWidth: 60 },
  txTime: { color: '#aaa', fontSize: 12, fontWeight: '600' },
});