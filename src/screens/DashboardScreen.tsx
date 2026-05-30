import React, { useState, useEffect } from 'react';
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
  DeviceEventEmitter
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
  ExternalLink,
  Trash2,
  Eye 
} from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Camera } from 'react-native-vision-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [isBuyModalVisible, setIsBuyModalVisible] = useState(false);
  
  // 🌟 モーダルと非表示状態の管理ステート
  const [isTrashModalVisible, setIsTrashModalVisible] = useState(false);
  const [hiddenMints, setHiddenMints] = useState<string[]>([]);

  const loadHiddenAssets = async () => {
    try {
      const stored = await AsyncStorage.getItem('hidden_assets');
      if (stored) setHiddenMints(JSON.parse(stored));
    } catch(e) {}
  };

  useEffect(() => {
    loadHiddenAssets();
    const subscription = DeviceEventEmitter.addListener('hiddenAssetsChanged', loadHiddenAssets);
    return () => subscription.remove();
  }, []);

  // 🌟 スパム解除（ゴミ箱から元に戻す）処理
  const handleUnhideAsset = async (mint: string) => {
    try {
      const stored = await AsyncStorage.getItem('hidden_assets');
      if (stored) {
        let list = JSON.parse(stored);
        list = list.filter((m: string) => m !== mint);
        await AsyncStorage.setItem('hidden_assets', JSON.stringify(list));
        setHiddenMints(list);
      }
    } catch(e) {}
  };

  const stakedAssets = assets.filter((a: any) => isStakedAsset(a.mint) && a.amount > 0);

  const tokens = assets.filter((a: any) =>
    !isStakedAsset(a.mint) &&
    a.decimals > 0 &&
    a.amount > 0 &&
    !hiddenMints.includes(a.mint)
  );

  const nfts = assets.filter((a: any) =>
    !isStakedAsset(a.mint) &&
    a.decimals === 0 &&
    a.amount > 0 &&
    !hiddenMints.includes(a.mint)
  );

  // 🌟 ゴミ箱に入っているNFTのみを抽出
  const hiddenNfts = assets.filter((a: any) =>
    a.decimals === 0 &&
    hiddenMints.includes(a.mint)
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

        {/* 🌟 NFTsタブがアクティブのときだけ、右上に可愛い小さなゴミ箱ボタンを表示 */}
        {activeTab === 'nfts' && (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, marginBottom: 12 }}>
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1a1a1a', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#333' }}
              onPress={() => setIsTrashModalVisible(true)}
            >
              <Trash2 size={15} color="#888" />
              <Text style={{ color: '#888', fontSize: 13, fontWeight: 'bold' }}>
                {t('trash_bin') || 'Trash'} ({hiddenNfts.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}

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

      {/* 購入方法選択ポップアップ */}
      <Modal
        visible={isBuyModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsBuyModalVisible(false)}
      >
        <TouchableOpacity 
          style={globalStyles.bottomSheetOverlay} 
          activeOpacity={1} 
          onPress={() => setIsBuyModalVisible(false)}
        >
          <View style={globalStyles.bottomSheetContent}>
            <View style={globalStyles.bottomSheetHeader}>
              <Text style={globalStyles.modalTitle}>{t('buy_crypto') || 'Buy Crypto'}</Text>
              <TouchableOpacity onPress={() => setIsBuyModalVisible(false)}>
                <X size={24} color="#888" />
              </TouchableOpacity>
            </View>
            
            <Text style={[globalStyles.descTextSmall, { marginBottom: 24 }]}>
              {t('buy_select_provider') || 'Please select a payment provider or exchange'}
            </Text>

            <TouchableOpacity style={[globalStyles.settingItem, { justifyContent: 'space-between' }]} onPress={() => openBuyLink('https://moonpay.com')}>
              <View style={{ flex: 1 }}>
                <Text style={globalStyles.settingText}>MoonPay</Text>
                <Text style={globalStyles.descTextSmall}>{t('buy_desc_applepay') || 'Credit Card / Apple Pay'}</Text>
              </View>
              <ExternalLink size={20} color="#888" />
            </TouchableOpacity>

            <TouchableOpacity style={[globalStyles.settingItem, { justifyContent: 'space-between' }]} onPress={() => openBuyLink('https://global.transak.com')}>
              <View style={{ flex: 1 }}>
                <Text style={globalStyles.settingText}>Transak</Text>
                <Text style={globalStyles.descTextSmall}>{t('buy_desc_bank') || 'Credit Card / Bank Transfer'}</Text>
              </View>
              <ExternalLink size={20} color="#888" />
            </TouchableOpacity>

            <TouchableOpacity style={[globalStyles.settingItem, { justifyContent: 'space-between', borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.05)' }]} onPress={() => openBuyLink(MEXC_REFERRAL_URL)}>
              <View style={{ flex: 1 }}>
                <Text style={globalStyles.settingText}>MEXC Global (Exchange)</Text>
                <Text style={globalStyles.descTextSmall}>{t('buy_desc_mexc') || 'Low fees & Highly recommended'}</Text>
              </View>
              <ExternalLink size={20} color="#3b82f6" />
            </TouchableOpacity>

            <TouchableOpacity style={[globalStyles.settingItem, { justifyContent: 'space-between', borderColor: '#a855f7', backgroundColor: 'rgba(168, 85, 247, 0.05)' }]} onPress={() => openBuyLink(GATEIO_REFERRAL_URL)}>
              <View style={{ flex: 1 }}>
                <Text style={globalStyles.settingText}>Gate.io (Exchange)</Text>
                <Text style={globalStyles.descTextSmall}>{t('buy_desc_gateio') || 'Wide range of altcoins'}</Text>
              </View>
              <ExternalLink size={20} color="#a855f7" />
            </TouchableOpacity>

          </View>
        </TouchableOpacity>
      </Modal>

      {/* 🌟 ゴミ箱（非表示NFT一覧）ポップアップ */}
      <Modal
        visible={isTrashModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsTrashModalVisible(false)}
      >
        <TouchableOpacity 
          style={globalStyles.bottomSheetOverlay} 
          activeOpacity={1} 
          onPress={() => setIsTrashModalVisible(false)}
        >
          <View style={globalStyles.bottomSheetContent}>
            <View style={globalStyles.bottomSheetHeader}>
              <Text style={globalStyles.modalTitle}>{t('trash_bin') || 'Trash Bin'}</Text>
              <TouchableOpacity onPress={() => setIsTrashModalVisible(false)}>
                <X size={24} color="#888" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
              {hiddenNfts.length === 0 ? (
                <Text style={{ color: '#666', textAlign: 'center', paddingVertical: 40 }}>
                  {t('no_spam_assets') || 'Trash is empty'}
                </Text>
              ) : (
                hiddenNfts.map((nft: any, index: number) => (
                  <View key={nft.mint || index} style={[globalStyles.settingItem, { justifyContent: 'space-between', marginBottom: 8 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      {nft.logoURI ? (
                        <Image source={{ uri: nft.logoURI }} style={{ width: 40, height: 40, borderRadius: 8 }} />
                      ) : (
                        <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }}>
                          <ImageIcon size={20} color="#555" />
                        </View>
                      )}
                      <Text style={[globalStyles.settingText, { fontSize: 15, flexShrink: 1 }]} numberOfLines={1}>
                        {nft.name}
                      </Text>
                    </View>
                    
                    {/* スパム解除（元に戻す）ボタン */}
                    <TouchableOpacity 
                      style={{ padding: 10, backgroundColor: 'rgba(168, 85, 247, 0.1)', borderRadius: 10 }}
                      onPress={() => handleUnhideAsset(nft.mint)}
                    >
                      <Eye size={18} color="#a855f7" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
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
});