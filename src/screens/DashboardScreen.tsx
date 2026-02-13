import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking, Image, StyleSheet } from 'react-native';
import {
  RefreshCw, Copy, ArrowDownLeft, Send, CreditCard, TrendingUp, BadgeCheck, ExternalLink, Smartphone
} from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { styles } from '../styles/globalStyles';
import { shortenAddress } from '../utils/solanaUtils';
import { TokenIcon } from '../components/TokenIcon';

// --- ローカル用サブコンポーネント ---

const ActionButton = ({ icon: Icon, label, onPress, color = '#1a1a1a' }: any) => (
  <TouchableOpacity onPress={onPress} style={{ alignItems: 'center', gap: 5 }}>
    <View style={[styles.actionCircle, { backgroundColor: color }]}><Icon size={24} color="#fff" /></View>
    <Text style={styles.label}>{label}</Text>
  </TouchableOpacity>
);

const AssetItem = ({ symbol, name, amount, price, logoURI, status }: any) => {
  if (status === 'suspicious') return null;
  const isUnknown = status === 'unknown';

  return (
    <View style={[styles.assetRow, isUnknown && { opacity: 0.6 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TokenIcon uri={logoURI} symbol={symbol} size={40} />
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.assetSym}>{symbol}</Text>
            {isUnknown ? (
              <View style={{backgroundColor: '#444', paddingHorizontal: 4, borderRadius: 4}}>
                <Text style={{fontSize: 10, color: '#aaa', fontWeight: 'bold'}}>UNKNOWN</Text>
              </View>
            ) : (
              <BadgeCheck size={16} color="#3b82f6" fill="#1e1e1e" />
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

// ★ 公式トークンバナー (SKR追加版)
const PromoBanners = ({ t }: any) => {
  const promos = [
    //     {
    //   id: 'skr',
    //   symbol: 'SKR',
    //   name: 'Solana Mobile Seeker',
    //   color: '#14F195', // Solana Green/Teal
    //   logo: 'https://assets.coingecko.com/coins/images/70974/standard/seeker-logo.jpg?1764922774',
    //   url: 'https://solanamobile.com/', 
    //   isPump: false
    // },
    {
      id: 'rmyp',
      symbol: 'RMYP',
      name: 'RamyaParryk',
      color: '#a855f7', // 紫
      logo: 'https://images.pump.fun/coin-image/Gn1fP9M6eD5aPADWRy87DH3uVDTkFFNsy6dAu5k5ER6W?variant=86x86',
      url: 'https://pump.fun/Gn1fP9M6eD5aPADWRy87DH3uVDTkFFNsy6dAu5k5ER6W',
      isPump: true
    },
    {
      id: 'kcar',
      symbol: 'KCAR',
      name: 'K-Car',
      color: '#ef4444', // 赤
      logo: 'https://images.pump.fun/coin-image/HPPiyhzm2MWn4HSne6r6soMd4fkZ9pczAA4Cid3yL765?variant=86x86',
      url: 'https://pump.fun/HPPiyhzm2MWn4HSne6r6soMd4fkZ9pczAA4Cid3yL765',
      isPump: true
    }
  ];

  return (
    <View style={{ marginTop: 20, marginBottom: 10 }}>
      {/* 翻訳キーを使用 */}
      <Text style={[styles.sectionTitle, { marginBottom: 10, marginLeft: 4, fontSize: 18 }]}>
        {t('official_meme_token')}
      </Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 4 }}>
        {promos.map((p) => (
          <TouchableOpacity 
            key={p.id} 
            style={[localStyles.promoCard, { borderColor: p.color }]}
            onPress={() => Linking.openURL(p.url)}
          >
            {/* 画像がない場合のフォールバック付き */}
            {p.logo ? (
              <Image source={{ uri: p.logo }} style={localStyles.promoLogo} />
            ) : (
              <View style={[localStyles.promoLogo, { backgroundColor: p.color, justifyContent: 'center', alignItems: 'center' }]}>
                 <Smartphone size={20} color="#000" />
              </View>
            )}
            
            <View>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                <Text style={[localStyles.promoTitle, { color: p.color }]}>{p.symbol}</Text>
                {/* 認証バッジ */}
                <BadgeCheck size={14} color={p.color} fill="#1e1e1e" />
              </View>
              <Text style={localStyles.promoDesc} numberOfLines={1}>{p.name}</Text>
            </View>
            <ExternalLink size={16} color="#666" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        ))}
      </ScrollView>
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

      {/* 公式トークンバナー (SKR入り) */}
      <PromoBanners t={t} />

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

const localStyles = StyleSheet.create({
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: 200, 
    gap: 12,
  },
  promoLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  promoDesc: {
    fontSize: 12,
    color: '#aaa',
    maxWidth: 100, // 文字がはみ出ないように調整
  },
});