import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { styles } from '../styles/globalStyles';
import { ExternalLink, Clock, AlertCircle, CheckCircle2 } from 'lucide-react-native';
// ★ Connection と PublicKey を直接インポート
import { Connection, PublicKey } from '@solana/web3.js';
// ★ 高速回線（Helius）のURLをインポート
import { MAINNET_RPC_URL } from '../constants/config';

export const HistoryScreen = ({ t, address, onBack }: any) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // アドレスがない場合は何もしない
      if (!address) {
        setLoading(false);
        return;
      }

      try {
        console.log("[HISTORY] Fetching with Helius RPC...");
        
        // ★ ここが重要！
        // 親から渡された connection を使わず、ここで新しく「高速回線」を作ります
        const connection = new Connection(MAINNET_RPC_URL, 'confirmed');
        const pubKey = new PublicKey(address);

        // 履歴を取得（最新20件に絞って負荷を下げる）
        const signatures = await connection.getSignaturesForAddress(pubKey, { limit: 20 });
        
        // データを整形
        const data = signatures.map(sig => ({
          signature: sig.signature,
          blockTime: sig.blockTime,
          date: sig.blockTime ? new Date(sig.blockTime * 1000).toLocaleString() : 'Unknown date',
          error: sig.err, // エラーがあればここに情報が入る
          status: sig.err ? 'failed' : 'success'
        }));

        setHistory(data);
      } catch (e) {
        console.error("[HISTORY] Fetch failed:", e);
      } finally {
        setLoading(false);
      }
    };
    
    load();
  }, [address]); // addressが変わったら再取得

  return (
    <View style={styles.content}>
      <Text style={styles.screenTitle}>{t('history') || 'Transaction History'}</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#a855f7" />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.signature}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.helpItemContainer}
              onPress={() => Linking.openURL(`https://solscan.io/tx/${item.signature}`)}
            >
              <View style={styles.helpHeaderRow}>
                {/* エラーがあるかどうかでアイコンを分岐 */}
                {item.error ? (
                  <AlertCircle size={20} color="#ef4444" />
                ) : (
                  <CheckCircle2 size={20} color="#22c55e" />
                )}
                <Text style={styles.helpTitle}>
                  {item.signature.slice(0, 8)}...{item.signature.slice(-8)}
                </Text>
                <ExternalLink size={16} color="#666" />
              </View>
              
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 28}}>
                <Clock size={12} color="#888" />
                <Text style={styles.descTextSmall}>{item.date}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <Text style={{color: '#666', textAlign: 'center', marginTop: 20}}>No transactions found.</Text>
          )}
        />
      )}
    </View>
  );
};