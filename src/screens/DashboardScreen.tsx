import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet, Image, Dimensions } from 'react-native';
import { Copy, ArrowDownLeft, Send, CreditCard, TrendingUp, Image as ImageIcon, QrCode, RefreshCw } from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import { useWalletConnectStore } from '../state/walletConnectStore';
import { styles as globalStyles } from '../styles/globalStyles';
import { shortenAddress } from '../utils/solanaUtils';
import { TokenIcon } from '../components/TokenIcon';
import { QRScannerModal } from '../components/QRScannerModal';

const { width } = Dimensions.get('window');

const ActionButton = ({ icon: Icon, label, onPress, color = '#1a1a1a' }: any) => (
  <TouchableOpacity onPress={onPress} style={{ alignItems: 'center', gap: 5 }}>
    <View style={[globalStyles.actionCircle, { backgroundColor: color }]}>
      <Icon size={24} color="#fff" />
    </View>
    <Text style={globalStyles.label}>{label}</Text>
  </TouchableOpacity>
);

// 🌟 onRefresh を受け取る
export const DashboardScreen = ({ t, onNavigate, wallet, assets, totalValue, onRefresh }: any) => {
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'tokens' | 'nfts'>('tokens');
  
  const tokens = assets.filter((a: any) => a.decimals > 0 && a.amount > 0);
  const nfts = assets.filter((a: any) => a.decimals === 0 && a.amount > 0);

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

  return (
    <View style={globalStyles.container}>
      <ScrollView contentContainerStyle={globalStyles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ヘッダー＆ウォレット情報 */}
        <View style={localStyles.header}>
          <TouchableOpacity style={localStyles.walletPill} onPress={handleCopy}>
            <View style={localStyles.avatar} />
            <Text style={localStyles.walletAddress}>{shortenAddress(wallet?.address)}</Text>
            <Copy size={14} color="#888" />
          </TouchableOpacity>
          
          {/* 🌟 更新ボタンとQRスキャンボタンを横並びに配置 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <TouchableOpacity onPress={onRefresh}>
              <RefreshCw size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsScanning(true)}>
              <QrCode size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={localStyles.balanceSection}>
          <Text style={localStyles.totalValueLabel}>{t('total_assets') || 'Total Assets (USD)'}</Text>
          <Text style={localStyles.totalValue}>$ {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        </View>

        {/* アクションボタン */}
        <View style={localStyles.actionRow}>
          <ActionButton icon={ArrowDownLeft} label={t('receive') || 'Receive'} color="#3b82f6" onPress={() => onNavigate('receive')} />
          <ActionButton icon={Send} label={t('send') || 'Send'} color="#a855f7" onPress={() => onNavigate('send')} />
          <ActionButton icon={CreditCard} label={t('buy') || 'Buy'} color="#22c55e" onPress={() => Linking.openURL('https://moonpay.com')} />
          <ActionButton icon={TrendingUp} label={t('stake') || 'Stake'} color="#f59e0b" onPress={() => onNavigate('stake')} />
        </View>

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

        {/* トークンリスト */}
        {activeTab === 'tokens' && (
          <View style={globalStyles.card}>
            {tokens.map((asset: any, index: number) => (
              <TouchableOpacity 
                key={index} 
                style={[globalStyles.tokenItem, { borderWidth: 0, paddingHorizontal: 0, paddingVertical: 12, marginBottom: 0, borderBottomWidth: index === tokens.length - 1 ? 0 : 1 }]} 
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
                  <Text style={globalStyles.tokenBal}>$ {(asset.value || 0).toFixed(2)}</Text>
                  <Text style={globalStyles.tokenVal}>{asset.price ? `$${asset.price.toFixed(2)}` : ''}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* NFTグリッド */}
        {activeTab === 'nfts' && (
          <View style={localStyles.nftGrid}>
            {nfts.map((nft: any, index: number) => (
              <TouchableOpacity key={index} style={localStyles.nftCard} onPress={() => onNavigate('asset-detail', { asset: nft })}>
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
      <QRScannerModal visible={isScanning} onClose={() => setIsScanning(false)} onScan={handleScan} />
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