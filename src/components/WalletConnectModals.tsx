import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Image } from 'react-native';
import { ShieldCheck, PenTool } from 'lucide-react-native';
import { useTranslation } from '../constants/translations';
import { useSettingsStore } from '../state/settingsStore';
import { useWalletConnectStore } from '../state/walletConnectStore';
import { useWalletStore } from '../state/walletStore';

export const WalletConnectModals = () => {
  // ストアから必要な機能とデータを取得
  const { 
    pendingSessionProposals, 
    pendingRequests, 
    approveSession, 
    rejectSession, 
    approveRequest, 
    rejectRequest 
  } = useWalletConnectStore();
  
  const wallet = useWalletStore(s => s.wallet);
  
  // ★ 言語設定を取得して翻訳関数(t)を準備
  const lang = useSettingsStore(s => s.lang);
  const t = useTranslation(lang);

  const proposal = pendingSessionProposals[0];
  const request = pendingRequests[0];

  if (!wallet) return null;

  return (
    <>
      {/* 1. 接続許可 (Session Proposal) のモーダル */}
      <Modal visible={!!proposal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <ShieldCheck size={24} color="#a855f7" />
              <Text style={styles.title}>{t('wc_conn_title') || 'Connection Request'}</Text>
            </View>
            
            <View style={styles.appInfo}>
              {proposal?.params?.proposer?.metadata?.icons?.[0] && (
                <Image 
                  source={{ uri: proposal.params.proposer.metadata.icons[0] }} 
                  style={styles.appIcon} 
                />
              )}
              <Text style={styles.appName}>{proposal?.params?.proposer?.metadata?.name || 'Unknown dApp'}</Text>
              <Text style={styles.appUrl}>{proposal?.params?.proposer?.metadata?.url}</Text>
            </View>

            <Text style={styles.warningText}>
              {t('wc_conn_desc') || 'This app wants to connect to your wallet.'}
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectSession(proposal)}>
                <Text style={styles.rejectBtnText}>{t('reject') || 'Reject'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.approveBtn} onPress={() => approveSession(proposal, wallet.address)}>
                <Text style={styles.approveBtnText}>{t('connect') || 'Connect'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. 署名許可 (Session Request) のモーダル */}
      <Modal visible={!!request} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <PenTool size={24} color="#22c55e" />
              <Text style={styles.title}>{t('wc_sign_title') || 'Sign Message'}</Text>
            </View>
            
            <Text style={styles.warningText}>
              {t('wc_sign_desc') || 'This app is asking you to sign a message to prove you own this wallet.'}
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectRequest(request)}>
                <Text style={styles.rejectBtnText}>{t('reject') || 'Reject'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.approveBtn, { backgroundColor: '#22c55e' }]} 
                onPress={() => approveRequest(request, wallet.secretKey)}
              >
                <Text style={styles.approveBtnText}>{t('sign') || 'Sign'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  appInfo: { alignItems: 'center', backgroundColor: '#111', padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  appIcon: { width: 60, height: 60, borderRadius: 16, marginBottom: 12 },
  appName: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  appUrl: { fontSize: 14, color: '#888', marginTop: 4 },
  warningText: { color: '#aaa', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  rejectBtn: { flex: 1, backgroundColor: '#333', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  rejectBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  approveBtn: { flex: 1, backgroundColor: '#a855f7', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});