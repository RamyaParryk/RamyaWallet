import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { styles } from '../styles/globalStyles';
import { ExternalLink, AlertCircle, CheckCircle2, RefreshCw, ArrowUpRight, Zap, FileCode2 } from 'lucide-react-native';
import { Connection, PublicKey } from '@solana/web3.js';
import { MAINNET_RPC_URL, HELIUS_API_KEY } from '../constants/config';

// 相対時間を計算する関数
const getRelativeTime = (timestamp?: number | null) => {
  if (!timestamp) return 'Unknown';
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - timestamp);
  
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
};

const formatDescription = (desc: string, type: string, myAddress: string) => {
  if (!desc || desc === 'UNKNOWN') {
    if (type === 'SWAP') return 'Token Swap';
    if (type === 'TRANSFER') return 'Token Transfer';
    return 'Contract Interaction';
  }
  let formatted = desc.replace(new RegExp(myAddress, 'g'), 'You');
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
            const cleanDescription = formatDescription(tx.description, tx.type, address);
            return {
              signature: tx.signature,
              blockTime: tx.timestamp,
              relativeTime: getRelativeTime(tx.timestamp),
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
        relativeTime: getRelativeTime(sig.blockTime),
        error: sig.err,
        status: sig.err ? 'failed' : 'success',
        description: 'Contract Interaction',
        type: 'UNKNOWN'
      }));
      setHistory(data);
    } catch (e) {
      console.error("[HISTORY] Fetch failed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [address]);

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
    // ★ 修正: backgroundColor を 'transparent' に明示的に設定！
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Text style={localStyles.screenTitle}>{t('history') || 'Transaction History'}</Text>
      
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
                    {isFailed ? 'Failed Transaction' : item.description}
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
              <Text style={localStyles.emptyText}>{t('no_transactions') || 'No transactions found.'}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

const localStyles = StyleSheet.create({
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    // ★ 修正: #1a1a1a から 85%の半透明な黒 に変更してすりガラス風に！
    backgroundColor: 'rgba(26, 26, 26, 0.85)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
    paddingRight: 10,
    justifyContent: 'center',
  },
  txTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    lineHeight: 20,
  },
  txHash: {
    color: '#888',
    fontSize: 12,
  },
  txRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 60,
  },
  txTime: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
  },
});