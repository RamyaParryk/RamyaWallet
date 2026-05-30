import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Dimensions, DeviceEventEmitter, ActivityIndicator } from 'react-native';
import { ChevronLeft, AlertTriangle, Image as ImageIcon, Flame, RefreshCw, ArrowUpRight, Trash2, EyeOff } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PublicKey, Transaction, Keypair, ComputeBudgetProgram, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { createBurnInstruction, createCloseAccountInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { createBurnNftInstruction } from '@metaplex-foundation/mpl-token-metadata';
import { styles as globalStyles } from '../styles/globalStyles';
import { HeaderRow } from '../components/HeaderRow';
import { useWalletStore } from '../state/walletStore';
import { useConnectionStore } from '../state/connectionStore';
import { ConfirmModal, SimpleAlertModal, SuccessModal } from '../components/ActionModals';
import { SOL_MINT } from '../constants/config';
import { refreshAssetsService } from '../services/refreshAssets';
import { signWithSeedVault } from '../utils/solanaUtils'; 

const { width } = Dimensions.get('window');

const MAJOR_TOKENS = [
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
];

export const AssetDetailScreen = ({ t, asset, onBack, onNavigate }: any) => {
  const wallet = useWalletStore((s) => s.wallet);
  const connection = useConnectionStore((s) => s.connection);
  
  const [burnConfirm, setBurnConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'error' });
  const [showSuccess, setShowSuccess] = useState(false);

  const [description, setDescription] = useState<string | null>(null);
  const [descLoading, setDescLoading] = useState(false);
  const [currentSkin, setCurrentSkin] = useState<string | null>(null);

  if (!asset) return null;

  const isToken = asset.decimals > 0 && asset.mint !== 'native-stake';
  const assetValue = (asset.amount || 0) * (asset.price || 0);
  const isNative = asset.mint === SOL_MINT || asset.mint === 'native-stake';
  const isMajor = MAJOR_TOKENS.includes(asset.mint);
  const isEmpty = asset.amount === 0;
  const isNFT = asset.decimals === 0 && asset.amount === 1;

  const showBurnButton = !isNative && (asset.possibleSpam || !isToken || isEmpty || (!isMajor && assetValue < 0.1));
  const showSkinButton = !isToken;
  const isCurrentSkin = currentSkin === asset.logoURI;

  useEffect(() => {
    AsyncStorage.getItem('wallet_skin').then(setCurrentSkin);

    const fetchDescription = async () => {
      if (isNFT) {
        if (asset.description) setDescription(asset.description);
        return;
      }
      if (isToken) {
        try {
          setDescLoading(true);
          setDescription(null);
          const actualMint = asset.mint === 'native' || asset.mint === SOL_MINT ? 'So11111111111111111111111111111111111111112' : asset.mint;
          const res = await fetch(`https://tokens.jup.ag/token/${actualMint}`);
          if (!res.ok) throw new Error("Metadata API Error");
          const json = await res.json();
          if (json && json.summary) setDescription(json.summary.trim());
        } catch (error) {
        } finally {
          setDescLoading(false);
        }
      }
    };
    fetchDescription();
  }, [asset.mint, isToken, isNFT, asset.description]);

  const handleToggleSkin = async () => {
    if (!asset.logoURI) return;
    try {
      if (isCurrentSkin) {
        await AsyncStorage.removeItem('wallet_skin');
        DeviceEventEmitter.emit('skinChanged', null);
        setCurrentSkin(null);
      } else {
        await AsyncStorage.setItem('wallet_skin', asset.logoURI);
        DeviceEventEmitter.emit('skinChanged', asset.logoURI);
        setCurrentSkin(asset.logoURI);
      }
    } catch (e) {}
  };

  const handleHideAsset = async () => {
    try {
      const stored = await AsyncStorage.getItem('hidden_assets');
      const hiddenList = stored ? JSON.parse(stored) : [];
      if (!hiddenList.includes(asset.mint)) {
        hiddenList.push(asset.mint);
        await AsyncStorage.setItem('hidden_assets', JSON.stringify(hiddenList));
      }
      DeviceEventEmitter.emit('hiddenAssetsChanged');
      onBack();
    } catch(e) {}
  };

  const handleBurn = async () => {
    if (!wallet || !connection) return;
    setBurnConfirm(false);
    setLoading(true);

    try {
      const userPubkey = new PublicKey(wallet.address);
      const mintPubkey = new PublicKey(asset.mint);
      
      const mintInfo = await connection.getAccountInfo(mintPubkey);
      if (!mintInfo) throw new Error("CNFT_UNSUPPORTED");
      
      const programId = mintInfo.owner;
      const tokenAccount = await getAssociatedTokenAddress(mintPubkey, userPubkey, false, programId);
      const tx = new Transaction();

      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }));
      tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 2_000_000 }));

      const multiplier = Math.pow(10, asset.decimals || 0);
      const rawAmount = asset.decimals === 0 ? 1 : Math.floor(asset.amount * multiplier);

      if (rawAmount > 0) {
        if (isNFT) {
          const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
          const [metadataPDA] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mintPubkey.toBuffer()], METADATA_PROGRAM_ID);
          const [editionPDA] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mintPubkey.toBuffer(), Buffer.from("edition")], METADATA_PROGRAM_ID);

          tx.add(createBurnNftInstruction({ metadata: metadataPDA, owner: userPubkey, mint: mintPubkey, tokenAccount: tokenAccount, masterEditionAccount: editionPDA, splTokenProgram: TOKEN_PROGRAM_ID }));
        } else {
          tx.add(createBurnInstruction(tokenAccount, mintPubkey, userPubkey, rawAmount, [], programId));
        }
      }
      
      tx.add(createCloseAccountInstruction(tokenAccount, userPubkey, userPubkey, [], programId));

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = userPubkey;

      let signature = '';

      if (wallet.walletType === 'seed-vault') {
        const messageV0 = new TransactionMessage({ payerKey: userPubkey, recentBlockhash: blockhash, instructions: tx.instructions }).compileToV0Message();
        const vTx = new VersionedTransaction(messageV0);
        const signedTxBytes = await signWithSeedVault(vTx.serialize(), wallet);
        signature = await connection.sendRawTransaction(signedTxBytes, { skipPreflight: false, preflightCommitment: 'confirmed' });
      } else {
        if (!wallet.secretKey) throw new Error("シークレットキーがありません");
        const keypair = Keypair.fromSecretKey(wallet.secretKey);
        signature = await connection.sendTransaction(tx, [keypair]);
      }
      
      const confirmation = await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, 'confirmed');
      if (confirmation.value.err) throw new Error(JSON.stringify(confirmation.value.err));

      refreshAssetsService({ force: true });
      setShowSuccess(true);

    } catch (error: any) {
      let errorTitle = t('error') || 'Failed';
      let errorMessage = error.message;

      if (errorMessage === "CNFT_UNSUPPORTED") {
        errorMessage = t('cnft_burn_error') || "This asset uses a special standard (e.g., spam) and cannot be burned.";
      } else if (errorMessage.includes("timed out")) {
        errorMessage = t('err_timeout') || "Network is busy. Timeout occurred.";
      } else if (errorMessage.includes("429")) {
        errorMessage = "RPC rate limit exceeded. Try again later.";
      }

      setAlert({ visible: true, title: errorTitle, message: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={globalStyles.container}>
      <HeaderRow title={asset.name} onBack={onBack} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        
        {asset.possibleSpam && (
          <View style={[globalStyles.warningBox, { marginHorizontal: 16 }]}>
            <AlertTriangle size={20} color="#ef4444" />
            <Text style={globalStyles.warningText}>{t('spam_warning') || 'This asset was marked as possible spam.'}</Text>
          </View>
        )}

        {isToken ? (
          <View style={localStyles.tokenHeaderContainer}>
            <View style={localStyles.tokenIconWrapper}>
              {asset.logoURI ? (
                <Image source={{ uri: asset.logoURI }} style={localStyles.mainImage} resizeMode="cover" />
              ) : (
                <ImageIcon size={32} color="#444" />
              )}
            </View>
            <Text style={localStyles.balanceAmount}>
              {asset.amount} <Text style={{ color: '#888', fontSize: 20 }}>{asset.symbol}</Text>
            </Text>
            
            <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 20 }}>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
                $ { (asset.price || 0).toLocaleString(undefined, { maximumFractionDigits: (asset.price || 0) < 0.01 ? 6 : 2 }) }
              </Text>
              <Text style={localStyles.balanceFiat}>
                $ { assetValue.toLocaleString(undefined, { maximumFractionDigits: 2 }) }
              </Text>
            </View>
          </View>
        ) : (
          <View style={localStyles.nftImageContainer}>
            {asset.logoURI ? (
              <Image source={{ uri: asset.logoURI }} style={localStyles.mainImage} resizeMode="cover" />
            ) : (
              <View style={localStyles.imagePlaceholder}>
                <ImageIcon size={64} color="#444" />
              </View>
            )}
          </View>
        )}

        {!isToken && (
          <View style={{ padding: 16 }}>
            <Text style={{ color: '#888', fontSize: 14 }}>{t('your_balance') || 'Your Balance'}</Text>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: 4 }}>
              {asset.amount} {asset.symbol}
            </Text>
          </View>
        )}

        <View style={localStyles.mainActionRow}>
          {isToken && (
            <TouchableOpacity 
              style={[localStyles.tradeBtn, { backgroundColor: '#a855f7' }]}
              onPress={() => onNavigate('swap_standalone', { asset })}
            >
              <RefreshCw size={20} color="#fff" style={{ marginRight: 8 }}/>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{t('swap') || 'Swap'}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[localStyles.tradeBtn, { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333' }]}
            onPress={() => onNavigate('send', { preSelectedAsset: asset, asset: asset })}
          >
            <ArrowUpRight size={20} color="#fff" style={{ marginRight: 8 }}/>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{t('send') || 'Send'}</Text>
          </TouchableOpacity>
        </View>

        {(description || descLoading) && (
          <View style={{ paddingHorizontal: 16, marginBottom: 32 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>{t('description') || 'Description'}</Text>
            {descLoading ? (
              <ActivityIndicator size="small" color="#555" style={{ alignSelf: 'flex-start', marginTop: 10 }} />
            ) : (
              <Text style={{ color: '#aaa', fontSize: 14, lineHeight: 22 }}>{description}</Text>
            )}
          </View>
        )}

        {(showSkinButton || showBurnButton) && (
          <>
            <Text style={globalStyles.sectionTitle}>{t('advanced_options') || 'Advanced Options'}</Text>
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              
              {showSkinButton && (
                <TouchableOpacity 
                  style={[localStyles.secondaryBtn, (!asset.logoURI || loading) && { opacity: 0.5 }]} 
                  onPress={handleToggleSkin}
                  disabled={!asset.logoURI || loading}
                >
                  <ImageIcon size={20} color={isCurrentSkin ? "#a855f7" : "#fff"} style={{ marginRight: 12 }} />
                  <Text style={[localStyles.secondaryBtnText, isCurrentSkin && { color: '#a855f7' }]}>
                    {isCurrentSkin ? (t('remove_skin') || 'Remove Background Skin') : (t('set_as_skin') || 'Set as Background Skin')}
                  </Text>
                </TouchableOpacity>
              )}

              {showBurnButton && (
                <TouchableOpacity style={localStyles.secondaryBtn} onPress={handleHideAsset}>
                  <EyeOff size={20} color="#fff" style={{ marginRight: 12 }} />
                  <Text style={localStyles.secondaryBtnText}>{t('hide_asset') || 'Hide (Move to Trash)'}</Text>
                </TouchableOpacity>
              )}

              {showBurnButton && (
                <TouchableOpacity 
                  style={[localStyles.burnBtn, loading && { opacity: 0.5 }]} 
                  onPress={() => setBurnConfirm(true)}
                  disabled={loading}
                >
                  {isEmpty ? <Trash2 size={20} color="#ef4444" style={{ marginRight: 12 }} /> : <Flame size={20} color="#ef4444" style={{ marginRight: 12 }} />}
                  <Text style={localStyles.burnBtnText}>
                    {loading ? (t('processing') || "Processing...") : (isEmpty ? (t('clean_up_empty') || "Clean up empty account (~0.002 SOL)") : (t('burn_asset') || "Burn (Reclaim ~0.002 SOL)"))}
                  </Text>
                </TouchableOpacity>
              )}

            </View>
          </>
        )}

      </ScrollView>

      <ConfirmModal visible={burnConfirm} title={isEmpty ? (t('clean_up_title') || "Clean Up?") : (t('burn_confirm_title') || "Burn Asset?")} message={isEmpty ? (t('clean_up_msg') || "This will close the empty token account and reclaim the storage rent.") : (t('burn_confirm_msg') || "This action cannot be undone. The asset will be permanently destroyed.")} confirmText={isEmpty ? (t('clean_up_btn_confirm') || "Clean Up 🧹") : (t('burn_btn_confirm') || "Burn 🔥")} cancelText={t('cancel') || "Cancel"} onCancel={() => setBurnConfirm(false)} onConfirm={handleBurn} />
      <SimpleAlertModal visible={alert.visible} title={alert.title} message={alert.message} type={alert.type} onClose={() => setAlert({ ...alert, visible: false })} />
      <SuccessModal visible={showSuccess} message={isEmpty ? (t('clean_up_success') || "Cleaned up!") : (t('burn_success') || "Asset Burned!")} onDone={() => { setShowSuccess(false); onBack(); }} />
    </View>
  );
};

const localStyles = StyleSheet.create({
  tokenHeaderContainer: { alignItems: 'center', paddingTop: 32, paddingBottom: 16, overflow: 'hidden' },
  tokenIconWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#333' },
  balanceAmount: { color: '#fff', fontSize: 36, fontWeight: 'bold', textAlign: 'center' },
  balanceFiat: { color: '#22c55e', fontSize: 18, fontWeight: '600', marginTop: 4 },
  nftImageContainer: { width: width, height: width, backgroundColor: 'rgba(17, 17, 17, 0.5)', justifyContent: 'center', alignItems: 'center' },
  mainImage: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  mainActionRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 32 },
  tradeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 },
  secondaryBtn: { flexDirection: 'row', backgroundColor: 'rgba(26, 26, 26, 0.8)', paddingVertical: 16, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  secondaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  burnBtn: { flexDirection: 'row', backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingVertical: 16, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.4)' },
  burnBtnText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});