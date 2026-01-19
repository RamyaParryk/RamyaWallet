import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { styles } from '../styles/globalStyles';
import { ExternalLink, Clock, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { fetchTransactionHistory } from '../utils/solanaUtils';

export const HistoryScreen = ({ t, connection, address, onBack }: any) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await fetchTransactionHistory(connection, address);
      setHistory(data);
      setLoading(false);
    };
    load();
  }, []);

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