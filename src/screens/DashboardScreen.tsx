import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet, Image, Dimensions } from 'react-native';
import { RefreshCw, Copy, ArrowDownLeft, Send, CreditCard, TrendingUp, BadgeCheck, Lock, Image as ImageIcon, QrCode } from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Camera } from 'react-native-vision-camera'; 
import { useWalletConnectStore } from '../state/walletConnectStore';
import { useAssetStore } from '../state/assetStore';
import { styles } from '../styles/globalStyles';
import { shortenAddress } from '../utils/solanaUtils';
import { TokenIcon } from '../components/TokenIcon';
import { SelectionModal } from '../components/ActionModals';
import { QRScannerModal } from '../components/QRScannerModal';

const { width } = Dimensions.get('window');

const ActionButton = ({ icon: Icon, label, onPress, color = '#1a1a1a' }: any) => (
  <TouchableOpacity onPress={onPress} style={{ alignItems: 'center', gap: 5 }}>
    <View style={[styles.actionCircle, { backgroundColor: color }]}>
      <Icon size={24} color="#fff" />
    </View>
    <Text style={styles.label}>{label}</Text>
  </TouchableOpacity>
);

type AssetItemProps = { asset: any; onNavigate: any; };

const AssetItem: React.FC<AssetItemProps> = ({ asset, onNavigate }) => {
  const { mint, symbol, name, amount, price, logoURI, status } = asset;
  if (status === 'suspicious') return null;
  const isUnknown = status === 'unknown';

  return (
    <TouchableOpacity 
      style={[styles.assetRow, isUnknown && { opacity: 0.6 }]}
      onPress={() => onNavigate('asset-detail', { asset })}
      activeOpacity={0.7}
    >
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
    </TouchableOpacity>
  );
};

// SKRステーキング（本物）用の青色ハイライトデザイン
const StakedAssetCard = ({ asset }: { asset: any }) => {
  const isSkr = asset.mint === 'staked-skr';

  return (
    <View style={[localStyles.stakedCard, isSkr && localStyles.skrHighlight]}>
      <View style={localStyles.stakedHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <TokenIcon uri={asset.logoURI} symbol={asset.symbol} size={24} />
          <Text style={localStyles.stakedName} numberOfLines={1}>
            {asset.symbol} {isSkr && '(Guardian)'}
          </Text>
        </View>
        {isSkr ? <BadgeCheck size={16} color="#3b82f6" /> : <Lock size={14} color="#888" />}
      </View>
      <Text style={localStyles.stakedAmount}>
        {asset.amount.toLocaleString()} {asset.symbol}
      </Text>
      <Text style={localStyles.stakedValue}>
        ${((asset.amount || 0) * (asset.price || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </Text>
    </View>
  );
};

const NftCard = ({ asset, onNavigate }: { asset: any, onNavigate: any }) => (
  <TouchableOpacity 
    style={localStyles.nftCard} 
    activeOpacity={0.8}
    onPress={() => onNavigate('asset-detail', { asset })}
  >
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

let lastActiveTab: 'tokens' | 'nfts' = 'tokens';

export const DashboardScreen = ({ t, wallet, assets, totalValue, onNav, notify, onRefresh, onNavigate }: any) => {
  const [buyModalVisible, setBuyModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'tokens' | 'nfts'>(lastActiveTab);

  const [isScanning, setIsScanning] = useState(false);

  const switchTab = (tab: 'tokens' | 'nfts') => {
    setActiveTab(tab);
    lastActiveTab = tab;
  };

  const handleUniversalScan = (scannedValue: string) => {
    setIsScanning(false);
    
    if (scannedValue.startsWith('wc:')) {
      notify(t('processing') || 'Connecting to dApp...');
      useWalletConnectStore.getState().pair(scannedValue).catch(e => console.log('WC Pair error', e));
      return;
    } 
    
    if (scannedValue.startsWith('solana:')) {
      const urlStr = scannedValue.replace('solana:', '');
      const [addressPart, queryPart] = urlStr.split('?');
      
      let amount = '';
      let splToken = '';

      if (queryPart) {
        const params = new URLSearchParams(queryPart);
        amount = params.get('amount') || '';
        splToken = params.get('spl-token') || '';
      }

      let passedAsset = null;
      if (splToken) {
        const currentAssets = useAssetStore.getState().assets;
        passedAsset = currentAssets.find((a: any) => a.mint === splToken);
      }

      onNavigate('send', { 
        preSelectedAddress: addressPart, 
        preSelectedAmount: amount, 
        preSelectedAsset: passedAsset 
      });
      return;
    }

    onNavigate('send', { preSelectedAddress: scannedValue });
  };

  const handleOpenScanner = async () => {
    const permission = await Camera.requestCameraPermission();
    if (permission === 'granted') {
      setIsScanning(true);
    } else {
      notify(t('camera_permission_denied') || 'Camera permission denied');
    }
  };

  // LSTは通常のトークンとし、Native StakeとSKRステーキングのみを特別枠に
  const isStaked = useCallback((mint: string) => 
    mint === 'native-stake' || mint === 'staked-skr'
  , []);

  const stakedAssets = assets?.filter((a: any) => isStaked(a.mint)) || [];
  const liquidAssets = assets?.filter((a: any) => !isStaked(a.mint) && a.decimals > 0) || [];
  const nftAssets = assets?.filter((a: any) => !isStaked(a.mint) && a.decimals === 0) || [];

  return (
    <>
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

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleOpenScanner}>
              <QrCode size={20} color="#888" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => { notify(t('processing')); onRefresh?.(); }}>
              <RefreshCw size={20} color="#888" />
            </TouchableOpacity>
          </View>
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

        <View style={localStyles.tabContainer}>
          <TouchableOpacity 
            style={[localStyles.tabButton, activeTab === 'tokens' && localStyles.activeTab]} 
            onPress={() => switchTab('tokens')}
          >
            <Text style={[localStyles.tabText, activeTab === 'tokens' && localStyles.activeTabText]}>Tokens</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[localStyles.tabButton, activeTab === 'nfts' && localStyles.activeTab]} 
            onPress={() => switchTab('nfts')}
          >
            <Text style={[localStyles.tabText, activeTab === 'nfts' && localStyles.activeTabText]}>NFTs ({nftAssets.length})</Text>
          </TouchableOpacity>
        </View>

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
                <AssetItem key={asset.mint} asset={asset} onNavigate={onNavigate} />
              ))
            )}
          </View>
        ) : (
          <View style={localStyles.nftGrid}>
            {(!nftAssets || nftAssets.length === 0) ? (
              <Text style={{ color: '#666', textAlign: 'center', width: '100%', marginTop: 40 }}>No NFTs found</Text>
            ) : (
              nftAssets.map((asset: any) => (
                <NftCard key={asset.mint} asset={asset} onNavigate={onNavigate} />
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
      <QRScannerModal visible={isScanning} onClose={() => setIsScanning(false)} onScan={handleUniversalScan} />
    </>
  );
};

const localStyles = StyleSheet.create({
  stakedContainer: { marginTop: 10, marginBottom: 10 },
  stakedTitle: { fontSize: 16, fontWeight: 'bold', color: '#aaa', marginBottom: 12 },
  stakedCard: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderRadius: 16, padding: 16, width: 170 },
  // SKR用の青枠ハイライトを再定義
  skrHighlight: { borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.05)' },
  stakedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  stakedName: { color: '#fff', fontWeight: 'bold', fontSize: 14, flexShrink: 1 },
  stakedAmount: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  stakedValue: { color: '#22c55e', fontSize: 13, marginTop: 4, fontWeight: '600' },
  
  tabContainer: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 12, padding: 4, marginVertical: 16 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#2a2a2a' },
  tabText: { color: '#888', fontWeight: 'bold', fontSize: 15 },
  activeTabText: { color: '#fff' },

  nftGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  nftCard: { 
    width: (width - 40 - 12) / 2,
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