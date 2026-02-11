import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking, Image } from 'react-native';
import {
  RefreshCw, Copy, ArrowDownLeft, Send, CreditCard, TrendingUp
} from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { styles } from '../styles/globalStyles';
import { shortenAddress } from '../utils/solanaUtils';
// ★追加: TokenIconをインポート
import { TokenIcon } from '../components/TokenIcon';

// --- ローカル用サブコンポーネント ---

const ActionButton = ({ icon: Icon, label, onPress, color = '#1a1a1a' }: any) => (
  <TouchableOpacity onPress={onPress} style={{ alignItems: 'center', gap: 5 }}>
    <View style={[styles.actionCircle, { backgroundColor: color }]}><Icon size={24} color="#fff" /></View>
    <Text style={styles.label}>{label}</Text>
  </TouchableOpacity>
);

// ★ 修正: TokenIcon を使用するように変更
const AssetItem = ({ symbol, name, amount, price, logoURI, status }: any) => {
  // 1. スキャム（suspicious）は完全に隠す
  if (status === 'suspicious') return null;

  // 2. 未確認（unknown）は薄く表示＆バッジ付け
  const isUnknown = status === 'unknown';

  return (
    <View style={[styles.assetRow, isUnknown && { opacity: 0.6 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        
        {/* ★ ここで TokenIcon を使用！ */}
        <TokenIcon uri={logoURI} symbol={symbol} size={40} />

        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.assetSym}>{symbol}</Text>
            {/* UNKNOWN バッジの表示 */}
            {isUnknown && (
              <View style={{backgroundColor: '#444', paddingHorizontal: 4, borderRadius: 4}}>
                <Text style={{fontSize: 10, color: '#aaa', fontWeight: 'bold'}}>UNKNOWN</Text>
              </View>
            )}
          </View>
          <Text style={styles.assetAmt}>{amount.toLocaleString()} {symbol}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.assetVal}>${(amount * price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>
        <Text style={{ color: '#666', fontSize: 14 }}>@ ${price.toLocaleString()}</Text>
      </View>
    </View>
  );
};

// --- メインコンポーネント ---

export const DashboardScreen = ({ t, wallet, assets, totalValue, onNav, notify, onRefresh, onNavigate }: any) => {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.addressPill} onPress={() => { Clipboard.setString(wallet?.address); notify(t('address_copied')); }}>
          <View style={styles.greenDot} />
          <Text style={styles.addressText}>{shortenAddress(wallet?.address)}</Text>
          <Copy size={12} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => { notify(t('processing')); onRefresh(); }}>
          <RefreshCw size={20} color="#888" />
        </TouchableOpacity>
      </View>

      <View style={styles.balanceSection}>
        <Text style={styles.label}>{t('total_assets')}</Text>
        <Text style={styles.bigBalance}>${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>

        <View style={styles.actionRow}>
          <ActionButton icon={ArrowDownLeft} label={t('receive')} onPress={() => onNavigate('receive')} />
          <ActionButton icon={Send} label={t('send')} onPress={() => onNavigate('send')} />
          <ActionButton icon={CreditCard} label={t('buy')} onPress={() => Alert.alert(t('buy'), t('purchase_provider'), [{ text: t('cancel'), style: "cancel" }, { text: "MoonPay", onPress: () => Linking.openURL('https://www.moonpay.com/buy') }, { text: "Transak", onPress: () => Linking.openURL('https://global.transak.com/') }])} />
          <View style={{ alignItems: 'center', gap: 5 }}>
            <TouchableOpacity style={[styles.actionCircle, { backgroundColor: '#22c55e' }]} onPress={() => onNavigate('stake')}>
              <TrendingUp size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.label}>{t('stake')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.assetsCard}>
        <View style={styles.assetsHeader}>
          <Text style={styles.sectionTitle}>{t('assets')}</Text>
          <TouchableOpacity onPress={() => onNav('swap')}><Text style={styles.linkText}>{t('trade')}</Text></TouchableOpacity>
        </View>

        {assets.length === 0 ? (
          <Text style={{ color: '#666', textAlign: 'center', marginTop: 20 }}>{t('no_assets')}</Text>
        ) : (
          assets.map((asset: any) => (
            <AssetItem
              key={asset.mint}
              symbol={asset.symbol}
              name={asset.name}
              amount={asset.amount}
              price={asset.price}
              logoURI={asset.logoURI}
              status={asset.status}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
};