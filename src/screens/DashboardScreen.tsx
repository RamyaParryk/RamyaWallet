import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet, Image, Dimensions } from 'react-native';
import { RefreshCw, Copy, ArrowDownLeft, Send, CreditCard, TrendingUp, BadgeCheck, Lock, Image as ImageIcon } from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { styles } from '../styles/globalStyles';
import { shortenAddress } from '../utils/solanaUtils';
import { TokenIcon } from '../components/TokenIcon';
import { SelectionModal } from '../components/ActionModals';

const { width } = Dimensions.get('window');

// --- ローカル用サブコンポーネント ---
const ActionButton = ({ icon: Icon, label, onPress, color = '#1a1a1a' }: any) => (
  <TouchableOpacity onPress={onPress} style={{ alignItems: 'center', gap: 5 }}>
    <View style={[styles.actionCircle, { backgroundColor: color }]}>
      <Icon size={24} color="#fff" />
    </View>
    <Text style={styles.label}>{label}</Text>
  </TouchableOpacity>
);

type AssetItemProps = { mint: string; symbol: string; name: string; amount: number; price: number; logoURI?: string; status?: 'verified' | 'unknown' | 'suspicious'; decimals?: number; };

// ★ 通常の資産リスト用コンポーネント
const AssetItem: React.FC<AssetItemProps> = ({ mint, symbol, name, amount, price, logoURI, status }) => {
  if (status === 'suspicious') return null;
  const isUnknown = status === 'unknown';

  return (
    <View style={[styles.assetRow, isUnknown && { opacity: 0.6 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TokenIcon uri={logoURI} symbol={symbol} mint={mint} size={40} />
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.assetSym}>{name}</Text>
            {isUnknown ? (
              <View style={{ backgroundColor: '#444', paddingHorizontal: 4, borderRadius: 4 }}>
                <Text style={{ fontSize: 10, color: '#aaa', fontWeight: 'bold' }}>UNKNOWN</Text>
              </View>
            ) : (
              <BadgeCheck size={16} color="#3b82f6" fill="#1e1e1e" />
            )}
          </View>
          <Text style={styles.assetAmt}>
            {amount.toLocaleString()} {symbol}
          </Text>
        </View>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.assetVal}>
          ${((amount || 0) * (price || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </Text>
        <Text style={{ color: '#666', fontSize: 14 }}>@ ${(price || 0).toLocaleString()}</Text>
      </View>
    </View>
  );
};

// ★ ステーキング用の横スクロールカード
const StakedAssetCard = ({ asset }: { asset: AssetItemProps }) => (
  <View style={localStyles.stakedCard}>
    <View style={localStyles.stakedHeader}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TokenIcon uri={asset.logoURI} symbol={asset.symbol} size={24} />
        <Text style={localStyles.stakedName} numberOfLines={1}>{asset.name}</Text>
      </View>
      <Lock size={14} color="#888" />
    </View>
    <Text style={localStyles.stakedAmount}>
      {asset.amount.toLocaleString()} {asset.symbol}
    </Text>
    <Text style={localStyles.stakedValue}>
      ${((asset.amount || 0) * (asset.price || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
    </Text>
  </View>
);

// ★ NFT用のカード型コンポーネント
const NftCard = ({ asset }: { asset: AssetItemProps }) => (
  <TouchableOpacity style={localStyles.nftCard} activeOpacity={0.8}>
    <View style={localStyles.nftImageContainer}>
      {asset.logoURI ? (
        <Image source={{ uri: asset.logoURI }} style={localStyles.nftImage} resizeMode="cover" />
      ) : (
        <View style={localStyles.nftImagePlaceholder}>
          <ImageIcon size={32} color="#666" />
        </View>
      )}
    </View>
    <View style={localStyles.nftInfo}>
      <Text style={localStyles.nftName} numberOfLines={1}>{asset.name}</Text>
      <Text style={localStyles.nftAmount}>{asset.amount}x</Text>
    </View>
  </TouchableOpacity>
);

// --- メインコンポーネント ---
export const DashboardScreen = ({ t, wallet, assets, totalValue, onNav, notify, onRefresh, onNavigate }: any) => {
  const [buyModalVisible, setBuyModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'tokens' | 'nfts'>('tokens');

  // ★ 資産の分類 (decimals === 0 をNFTとみなす)
  const stakedAssets = assets?.filter((a: any) => a.mint === 'native-stake') || [];
  const liquidAssets = assets?.filter((a: any) => a.mint !== 'native-stake' && a.decimals > 0) || [];
  const nftAssets = assets?.filter((a: any) => a.mint !== 'native-stake' && a.decimals === 0) || [];

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.addressPill}
          onPress={() => { Clipboard.setString(wallet?.address); notify(t('address_copied')); }}
        >
          <View style={styles.greenDot} />
          <Text style={styles.addressText}>{shortenAddress(wallet?.address)}</Text>
          <Copy size={12} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={() => { notify(t('processing')); onRefresh?.(); }}>
          <RefreshCw size={20} color="#888" />
        </TouchableOpacity>
      </View>

      <View style={styles.balanceSection}>
        <Text style={styles.label}>{t('total_assets')}</Text>
        <Text style={styles.bigBalance}>
          ${Number(totalValue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </Text>

        <View style={styles.actionRow}>
          <ActionButton icon={ArrowDownLeft} label={t('receive')} onPress={() => onNavigate('receive')} />
          <ActionButton icon={Send} label={t('send')} onPress={() => onNavigate('send')} />
          <ActionButton icon={CreditCard} label={t('buy')} onPress={() => setBuyModalVisible(true)} />

          <View style={{ alignItems: 'center', gap: 5 }}>
            <TouchableOpacity style={[styles.actionCircle, { backgroundColor: '#22c55e' }]} onPress={() => onNavigate('stake')}>
              <TrendingUp size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.label}>{t('stake')}</Text>
          </View>
        </View>
      </View>

      {stakedAssets.length > 0 && (
        <View style={localStyles.stakedContainer}>
          <Text style={localStyles.stakedTitle}>Staked / DeFi Positions</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -20 }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          >
            {stakedAssets.map((asset: any) => (
              <StakedAssetCard key={asset.mint} asset={asset} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* ★ タブ切り替えUI */}
      <View style={localStyles.tabContainer}>
        <TouchableOpacity 
          style={[localStyles.tabButton, activeTab === 'tokens' && localStyles.activeTab]} 
          onPress={() => setActiveTab('tokens')}
        >
          <Text style={[localStyles.tabText, activeTab === 'tokens' && localStyles.activeTabText]}>Tokens</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[localStyles.tabButton, activeTab === 'nfts' && localStyles.activeTab]} 
          onPress={() => setActiveTab('nfts')}
        >
          <Text style={[localStyles.tabText, activeTab === 'nfts' && localStyles.activeTabText]}>NFTs ({nftAssets.length})</Text>
        </TouchableOpacity>
      </View>

      {/* ★ タブの中身の切り替え */}
      {activeTab === 'tokens' ? (
        <View style={styles.assetsCard}>
          <View style={styles.assetsHeader}>
            <Text style={styles.sectionTitle}>{t('assets')}</Text>
            <TouchableOpacity onPress={() => onNav('swap')}>
              <Text style={styles.linkText}>{t('trade')}</Text>
            </TouchableOpacity>
          </View>

          {(!liquidAssets || liquidAssets.length === 0) ? (
            <Text style={{ color: '#666', textAlign: 'center', marginTop: 20 }}>{t('no_assets')}</Text>
          ) : (
            liquidAssets.map((asset: any) => (
              <AssetItem key={asset.mint} {...asset} />
            ))
          )}
        </View>
      ) : (
        /* NFTのグリッド表示 */
        <View style={localStyles.nftGrid}>
          {(!nftAssets || nftAssets.length === 0) ? (
            <Text style={{ color: '#666', textAlign: 'center', width: '100%', marginTop: 40 }}>No NFTs found</Text>
          ) : (
            nftAssets.map((asset: any) => (
              <NftCard key={asset.mint} asset={asset} />
            ))
          )}
        </View>
      )}

      <SelectionModal
        visible={buyModalVisible}
        title={t('purchase_provider')}
        onCancel={() => setBuyModalVisible(false)}
        options={[
          { label: 'MoonPay (Global)', onPress: () => Linking.openURL('https://www.moonpay.com/buy') },
          { label: 'Transak (Global)', onPress: () => Linking.openURL('https://global.transak.com/') },
          { label: 'Coinbase Pay', onPress: () => Linking.openURL('https://pay.coinbase.com/') },
        ]}
      />
    </ScrollView>
  );
};

// ★ 専用スタイル
const localStyles = StyleSheet.create({
  stakedContainer: { marginTop: 10, marginBottom: 10 },
  stakedTitle: { fontSize: 16, fontWeight: 'bold', color: '#aaa', marginBottom: 12 },
  stakedCard: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderRadius: 16, padding: 16, width: 170 },
  stakedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  stakedName: { color: '#fff', fontWeight: 'bold', fontSize: 14, flexShrink: 1 },
  stakedAmount: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  stakedValue: { color: '#22c55e', fontSize: 13, marginTop: 4, fontWeight: '600' },
  
  // タブ用スタイル
  tabContainer: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 12, padding: 4, marginVertical: 16 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#2a2a2a' },
  tabText: { color: '#888', fontWeight: 'bold', fontSize: 15 },
  activeTabText: { color: '#fff' },

  // NFTグリッド用スタイル
  nftGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  nftCard: { 
    width: (width - 40 - 12) / 2, // 画面幅から余白を引いて2等分
    backgroundColor: '#1a1a1a', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#333',
    overflow: 'hidden',
    marginBottom: 8
  },
  nftImageContainer: { width: '100%', aspectRatio: 1, backgroundColor: '#222' },
  nftImage: { width: '100%', height: '100%' },
  nftImagePlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  nftInfo: { padding: 12 },
  nftName: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  nftAmount: { color: '#888', fontSize: 12 },
});