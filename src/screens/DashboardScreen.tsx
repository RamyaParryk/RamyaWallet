import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Image,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import {
  Copy,
  ArrowDownLeft,
  Send,
  CreditCard,
  TrendingUp,
  Image as ImageIcon,
  QrCode,
  RefreshCw,
  BadgeCheck,
  Lock,
  X,
  ExternalLink
} from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Camera } from 'react-native-vision-camera';

import { useWalletConnectStore } from '../state/walletConnectStore';
import { styles as globalStyles } from '../styles/globalStyles';
import { shortenAddress } from '../utils/solanaUtils';
import { TokenIcon } from '../components/TokenIcon';
import { QRScannerModal } from '../components/QRScannerModal';
import { MEXC_REFERRAL_URL, GATEIO_REFERRAL_URL } from '../constants/config';

const { width } = Dimensions.get('window');

const ActionButton = ({ icon: Icon, label, onPress, color = '#1a1a1a' }: any) => (
  <TouchableOpacity onPress={onPress} style={{ alignItems: 'center', gap: 5 }}>
    <View style={[globalStyles.actionCircle, { backgroundColor: color }]}>
      <Icon size={24} color="#fff" />
    </View>
    <Text style={globalStyles.label}>{label}</Text>
  </TouchableOpacity>
);

const isStakedAsset = (mint: string) => {
  return mint === 'native-stake' || mint === 'staked-skr';
};

const StakedAssetCard = ({ asset }: { asset: any }) => {
  const isSkr = asset.mint === 'staked-skr';

  return (
    <View style={[localStyles.stakedCard, isSkr && localStyles.skrHighlight]}>
      <View style={localStyles.stakedHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <TokenIcon uri={asset.logoURI} symbol={asset.symbol} mint={asset.mint} size={24} />
          <Text style={localStyles.stakedName} numberOfLines={1}>
            {asset.symbol} {isSkr ? '(Guardian)' : ''}
          </Text>
        </View>
        {isSkr ? <BadgeCheck size={16} color="#3b82f6" /> : <Lock size={14} color="#888" />}
      </View>

      <Text style={localStyles.stakedAmount}>
        {Number(asset.amount || 0).toLocaleString()} {asset.symbol}
      </Text>

      <Text style={localStyles.stakedValue}>
        $ {(asset.value ?? (asset.amount || 0) * (asset.price || 0)).toFixed(2)}
      </Text>
    </View>
  );
};

export const DashboardScreen = ({ t, onNavigate, wallet, assets = [], totalValue, onRefresh }: any) => {
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'tokens' | 'nfts'>('tokens');
  
  // 🌟 購入方法選択ポップアップの表示ステート
  const [isBuyModalVisible, setIsBuyModalVisible] = useState(false);

  const stakedAssets = assets.filter((a: any) => isStakedAsset(a.mint) && a.amount > 0);

  const tokens = assets.filter((a: any) =>
    !isStakedAsset(a.mint) &&
    a.decimals > 0 &&
    a.amount > 0
  );

  const nfts = assets.filter((a: any) =>
    !isStakedAsset(a.mint) &&
    a.decimals === 0 &&
    a.amount > 0
  );

  const handleCopy = () => {
    if (wallet?.address) Clipboard.setString(wallet.address);
  };

  const handleScan = (data: string) => {
    setIsScanning(false);
    if (data.startsWith('wc:')) {
      useWalletConnectStore.getState().pair(data).catch(() => {});
    } else {
      onNavigate('send', { preSelectedAddress: data });
    }
  };

  const handleOpenScanner = async () => {
    const permission = await Camera.requestCameraPermission();
    if (permission === 'granted') {
      setIsScanning(true);
    } else {
      Alert.alert(
        t('error') || 'Error',
        t('camera_permission_denied') || 'Camera permission denied.'
      );
    }
  };

  // 🌟 購入リンクを開く処理
  const openBuyLink = (url: string) => {
    Linking.openURL(url);
    setIsBuyModalVisible(false);
  };

  return (
    <View style={globalStyles.container}>
      <ScrollView contentContainerStyle={globalStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={localStyles.header}>
          <TouchableOpacity style={localStyles.walletPill} onPress={handleCopy}>
            <View style={localStyles.avatar} />
            <Text style={localStyles.walletAddress}>{shortenAddress(wallet?.address)}</Text>
            <Copy size={14} color="#888" />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <TouchableOpacity onPress={onRefresh}>
              <RefreshCw size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleOpenScanner}>
              <QrCode size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={localStyles.balanceSection}>
          <Text style={localStyles.totalValueLabel}>{t('total_assets') || 'Total Assets (USD)'}</Text>
          <Text style={localStyles.totalValue}>
            $ {Number(totalValue || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>

        <View style={localStyles.actionRow}>
          <ActionButton icon={ArrowDownLeft} label={t('receive') || 'Receive'} color="#3b82f6" onPress={() => onNavigate('receive')} />
          <ActionButton icon={Send} label={t('send') || 'Send'} color="#a855f7" onPress={() => onNavigate('send')} />
          
          {/* 🌟 買うボタンの挙動をポップアップ表示に変更 */}
          <ActionButton icon={CreditCard} label={t('buy') || 'Buy'} color="#22c55e" onPress={() => setIsBuyModalVisible(true)} />
          
          <ActionButton icon={TrendingUp} label={t('stake') || 'Stake'} color="#f59e0b" onPress={() => onNavigate('stake')} />
        </View>

        {stakedAssets.length > 0 && (
          <View style={localStyles.stakedContainer}>
            <Text style={localStyles.stakedTitle}>Staked / DeFi Positions</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
              {stakedAssets.map((asset: any) => (
                <StakedAssetCard key={asset.mint} asset={asset} />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={localStyles.tabContainer}>
          <TouchableOpacity style={[localStyles.tabButton, activeTab === 'tokens' && localStyles.activeTab]} onPress={() => setActiveTab('tokens')}>
            <Text style={[localStyles.tabText, activeTab === 'tokens' && localStyles.activeTabText]}>
              {t('assets') || 'Assets'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[localStyles.tabButton, activeTab === 'nfts' && localStyles.activeTab]} onPress={() => setActiveTab('nfts')}>
            <Text style={[localStyles.tabText, activeTab === 'nfts' && localStyles.activeTabText]}>
              NFTs
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'tokens' && (
          <View style={globalStyles.card}>
            {tokens.length === 0 ? (
              <Text style={{ color: '#666', textAlign: 'center', paddingVertical: 30 }}>
                {t('no_assets') || 'No Assets'}
              </Text>
            ) : (
              tokens.map((asset: any, index: number) => (
                <TouchableOpacity
                  key={asset.mint || index}
                  style={[
                    globalStyles.tokenItem,
                    {
                      borderWidth: 0,
                      paddingHorizontal: 0,
                      paddingVertical: 12,
                      marginBottom: 0,
                      borderBottomWidth: index === tokens.length - 1 ? 0 : 1,
                    },
                  ]}
                  onPress={() => onNavigate('asset-detail', { asset })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TokenIcon uri={asset.logoURI} symbol={asset.symbol} mint={asset.mint} size={40} />
                    <View>
                      <Text style={globalStyles.tokenSym}>{asset.name}</Text>
                      <Text style={globalStyles.tokenName}>
                        {asset.amount} {asset.symbol}
                      </Text>
                    </View>
                  </View>

                  <View>
                    <Text style={globalStyles.tokenBal}>
                      $ {(asset.value || 0).toFixed(2)}
                    </Text>
                    <Text style={globalStyles.tokenVal}>
                      {asset.price ? `$${asset.price.toFixed(2)}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === 'nfts' && (
          <View style={localStyles.nftGrid}>
            {nfts.map((nft: any, index: number) => (
              <TouchableOpacity key={nft.mint || index} style={localStyles.nftCard} onPress={() => onNavigate('asset-detail', { asset: nft })}>
                {nft.logoURI ? (
                  <Image source={{ uri: nft.logoURI }} style={localStyles.nftImage} />
                ) : (
                  <View style={[localStyles.nftImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#222' }]}>
                    <ImageIcon size={32} color="#555" />
                  </View>
                )}
                <Text style={localStyles.nftName} numberOfLines={1}>{nft.name}</Text>
              </TouchableOpacity>
            ))}

            {nfts.length === 0 && (
              <Text style={{ color: '#666', textAlign: 'center', width: '100%', paddingVertical: 40 }}>
                {t('no_assets') || 'No Assets'}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {isScanning && (
        <QRScannerModal visible={isScanning} onClose={() => setIsScanning(false)} onScan={handleScan} />
      )}

      {/* 🌟 購入方法選択ポップアップ */}
      <Modal
        visible={isBuyModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsBuyModalVisible(false)}
      >
        <TouchableOpacity 
          style={localStyles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsBuyModalVisible(false)}
        >
          <View style={localStyles.modalContent}>
            <View style={localStyles.modalHeader}>
              <Text style={localStyles.modalTitle}>{t('buy_crypto') || 'Buy Crypto'}</Text>
              <TouchableOpacity onPress={() => setIsBuyModalVisible(false)}>
                <X size={24} color="#888" />
              </TouchableOpacity>
            </View>
            
            <Text style={localStyles.modalSubTitle}>
              決済プロバイダーまたは取引所を選択してください
            </Text>

            {/* クレカ決済プロバイダー */}
            <TouchableOpacity style={localStyles.providerButton} onPress={() => openBuyLink('https://moonpay.com')}>
              <View style={localStyles.providerInfo}>
                <Text style={localStyles.providerName}>MoonPay</Text>
                <Text style={localStyles.providerDesc}>クレジットカード・Apple Pay</Text>
              </View>
              <ExternalLink size={20} color="#888" />
            </TouchableOpacity>

            <TouchableOpacity style={localStyles.providerButton} onPress={() => openBuyLink('https://global.transak.com')}>
              <View style={localStyles.providerInfo}>
                <Text style={localStyles.providerName}>Transak</Text>
                <Text style={localStyles.providerDesc}>クレジットカード・銀行振込</Text>
              </View>
              <ExternalLink size={20} color="#888" />
            </TouchableOpacity>

            {/* 🌟 マネタイズ用：Mexcリファラルリンク */}
            <TouchableOpacity style={[localStyles.providerButton, { borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.05)' }]} onPress={() => openBuyLink('https://promote.mexc.com/r/2UFnLGg35l')}>
              <View style={localStyles.providerInfo}>
                <Text style={localStyles.providerName}>MEXC Global (Exchange)</Text>
                <Text style={localStyles.providerDesc}>Low fees & Highly recommended</Text>
              </View>
              <ExternalLink size={20} color="#3b82f6" />
            </TouchableOpacity>

            {/* 🌟 マネタイズ用：Gate.ioリファラルリンク */}
            <TouchableOpacity style={[localStyles.providerButton, { borderColor: '#a855f7', backgroundColor: 'rgba(168, 85, 247, 0.05)' }]} onPress={() => openBuyLink('https://www.gate.io/signup/BFZAVA9d')}>
              <View style={localStyles.providerInfo}>
                <Text style={localStyles.providerName}>Gate.io (Exchange)</Text>
                <Text style={localStyles.providerDesc}>Wide range of altcoins</Text>
              </View>
              <ExternalLink size={20} color="#a855f7" />
            </TouchableOpacity>

          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
};

const localStyles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16 },
  walletPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#333', gap: 8 },
  avatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#a855f7' },
  walletAddress: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  balanceSection: { alignItems: 'center', paddingVertical: 30 },
  totalValueLabel: { color: '#888', fontSize: 14, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  totalValue: { color: '#fff', fontSize: 48, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, marginBottom: 24 },

  stakedContainer: { marginBottom: 20 },
  stakedTitle: { color: '#aaa', fontSize: 16, fontWeight: 'bold', marginBottom: 12, paddingHorizontal: 16 },
  stakedCard: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderRadius: 16, padding: 16, width: 170 },
  skrHighlight: { borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.05)' },
  stakedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  stakedName: { color: '#fff', fontWeight: 'bold', fontSize: 14, flexShrink: 1 },
  stakedAmount: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  stakedValue: { color: '#22c55e', fontSize: 13, marginTop: 4, fontWeight: '600' },

  tabContainer: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 12, padding: 4, marginHorizontal: 16, marginBottom: 16 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#2a2a2a' },
  tabText: { color: '#888', fontWeight: 'bold', fontSize: 15 },
  activeTabText: { color: '#fff' },

  nftGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16, gap: 12 },
  nftCard: { width: (width - 44) / 2, backgroundColor: '#1a1a1a', borderRadius: 16, borderWidth: 1, borderColor: '#333', overflow: 'hidden', paddingBottom: 12 },
  nftImage: { width: '100%', aspectRatio: 1 },
  nftName: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginTop: 12, paddingHorizontal: 12 },

  // 🌟 Modal用スタイル
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  modalSubTitle: { color: '#888', fontSize: 14, marginBottom: 24 },
  providerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#222', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  providerInfo: { flex: 1 },
  providerName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  providerDesc: { color: '#888', fontSize: 13 },
});