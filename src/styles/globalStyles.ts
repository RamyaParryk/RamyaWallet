// --- Styles ---
import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  content: { flex: 1, padding: 20 },
  scrollContent: { paddingBottom: 100 },
  logoBox: { width: 80, height: 80, borderRadius: 25, backgroundColor: '#9333ea', alignItems:'center', justifyContent:'center', marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: 'white', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 40 },
  screenTitle: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 20 },
  primaryButton: { backgroundColor: 'white', padding: 16, borderRadius: 16, width: '100%', alignItems: 'center', marginTop: 20 },
  primaryButtonText: { color: 'black', fontWeight: 'bold', fontSize: 16 },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, padding: 10 },
  secondaryButtonText: { color: '#a855f7', fontWeight: 'bold', fontSize: 14 },
  descText: { color: '#aaa', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 30 },
  label: { color: '#888', fontSize: 14, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  actionCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  navBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10, flex: 1 },
  navText: { fontSize: 12, color: '#666', marginTop: 4, fontWeight: '600' },
  bottomNav: { flexDirection: 'row', backgroundColor: '#111', paddingBottom: Platform.OS === 'ios' ? 24 : 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#222' },
  tokenItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  tokenSym: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  tokenName: { color: '#888', fontSize: 14 },
  tokenBal: { color: 'white', fontWeight: 'bold', fontSize: 16, textAlign: 'right' },
  tokenVal: { color: '#22c55e', fontSize: 14, textAlign: 'right' },
  input: { backgroundColor: '#1a1a1a', color: 'white', padding: 16, borderRadius: 16, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  
  // PIN関連
  pinContainer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 20 },
  pinTitle: { fontSize: 24, color: '#fff', fontWeight: 'bold', marginBottom: 40 },
  pinDesc: { color: '#aaa', fontSize: 16, textAlign: 'center', marginBottom: 40 }, 
  pinDots: { flexDirection: 'row', gap: 20, marginBottom: 60 },
  dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#333' },
  dotActive: { backgroundColor: '#a855f7' },
  numPad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: 280, gap: 20 },
  numBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333' },
  numBtnPlaceholder: { width: 70, height: 70 },
  numText: { fontSize: 28, color: '#fff', fontWeight: 'bold' },
  
  notification: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 20, right: 20, backgroundColor: '#22c55e', padding: 16, borderRadius: 12, alignItems: 'center', zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  notificationText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  wordTag: { backgroundColor: '#1a1a1a', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, flexDirection: 'row', width: '48%', marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  wordNum: { color: '#666', marginRight: 8, fontSize: 14, width: 20 },
  wordText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  mnemonicContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  warningBox: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  warningText: { color: '#ef4444', marginLeft: 12, flex: 1, fontSize: 14, lineHeight: 20 },
  closeButton: { position: 'absolute', top: Platform.OS === 'android' ? 60 : 50, right: 30, padding: 10 },
  mnemonicInput: { backgroundColor: '#1a1a1a', color: 'white', padding: 15, borderRadius: 12, fontSize: 16, height: 120, textAlignVertical: 'top', marginBottom: 20 },
  inputField: { backgroundColor:'#222', color:'white', padding:16, borderRadius:12, fontSize:16, marginBottom:16 },
  
  // ヘルプ関連
  helpItemContainer: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  helpHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  helpIconBadge: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center' },
  helpTitle: { color: 'white', fontWeight: 'bold', fontSize: 15, flex: 1 },
  helpDesc: { color: '#aaa', fontSize: 13, lineHeight: 20, marginLeft: 38 },
  modalTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },

  // モーダル全体関連 (🌟 今回追加)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
    width: '100%',
  },

  // アドレス帳・リスト関連
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#1a1a1a', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  settingText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  descTextSmall: { color: '#888', fontSize: 13 },

  // 🌟 1. 共通カードレイアウト (Card)
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardLabel: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },

  // 🌟 2. 金額入力フィールド（大文字）
  amountInputLarge: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'right',
    padding: 0,
  },

  // 🌟 3. パーセントボタン（10%, 50%, MAX）
  percentRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  percentBtn: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  percentText: {
    color: '#a855f7',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // 🌟 4. セクションタイトル
  sectionTitle: {
    color: '#888',
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 16,
  },

  // 🌟 5. 下部固定広告コンテナ
  bannerContainerFixed: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
});