// --- Styles ---
import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
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
  descText: { color: '#888', marginBottom: 20, lineHeight: 20, fontSize: 16 }, // 文字サイズUP
  infoCard: { backgroundColor: '#1a1a1a', padding: 15, borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  label: { color: '#666', fontSize: 14, marginBottom: 8 }, // 文字サイズUP
  valueText: { color: 'white', fontFamily: 'monospace', fontSize: 13 },
  secretText: { color: '#eab308', fontFamily: 'monospace', fontSize: 12, lineHeight: 16 },
  hiddenText: { color: '#444', fontStyle: 'italic', fontSize: 12 },
  warningBox: { flexDirection:'row', gap:10, backgroundColor:'#422006', padding:15, borderRadius:12, alignItems:'center', marginBottom:20 },
  warningText: { color:'#fcd34d', fontSize:12, flex:1 },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 15, backgroundColor: '#111', borderTopWidth: 1, borderTopColor: '#222' },
  navBtn: { alignItems: 'center' },
  navText: { fontSize: 12, color: '#666', marginTop: 4, fontWeight:'bold' }, // 文字サイズUP
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: Platform.OS === 'android' ? 50 : 20, alignItems:'center' },
  headerTitle: { color:'white', fontSize:20, fontWeight:'bold', textAlign:'center', flex:1 }, // 文字サイズUP
  addressPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 8, borderRadius: 20, gap: 8 },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  addressText: { color: '#ccc', fontSize: 12, fontFamily: 'monospace' },
  iconBtn: { padding: 8, backgroundColor: '#1a1a1a', borderRadius: 20 },
  balanceSection: { alignItems: 'center', paddingVertical: 20 },
  bigBalance: { color: 'white', fontSize: 48, fontWeight: 'bold', marginVertical: 10 }, // 文字サイズ大幅UP
  actionRow: { flexDirection: 'row', gap: 30, marginTop: 20 },
  actionCircle: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#1a1a1a', alignItems:'center', justifyContent:'center' },
  assetsCard: { backgroundColor: '#111', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, minHeight: 400, marginTop: 20 },
  assetsHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  sectionTitle: { color: '#888', fontWeight: 'bold' },
  linkText: { color: '#a855f7', fontWeight: 'bold' },
  assetRow: { flexDirection:'row', justifyContent:'space-between', paddingVertical: 15, borderBottomWidth:1, borderBottomColor:'#1a1a1a' },
  coinIcon: { width:40, height:40, borderRadius:20, alignItems:'center', justifyContent:'center' },
  assetSym: { color:'white', fontWeight:'bold', fontSize: 16 }, // 文字サイズUP
  assetAmt: { color:'#666', fontSize:14 }, // 文字サイズUP
  assetVal: { color:'white', fontWeight:'bold', fontSize: 16 }, // 文字サイズUP
  swapCard: { backgroundColor: '#1a1a1a', padding: 20, borderRadius: 24, gap: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems:'center' },
  input: { fontSize: 32, fontWeight: 'bold', color: 'white', padding: 0 },
  balanceText: { color: '#666', fontSize: 12, textAlign: 'right' },
  arrowCircle: { backgroundColor: '#222', padding: 8, borderRadius: 12, borderWidth: 4, borderColor: 'black' },
  tokenBtn: { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:'#333', paddingHorizontal:12, paddingVertical:6, borderRadius:20 },
  tokenBtnText: { color:'white', fontWeight:'bold' },
  infoBox: { backgroundColor: '#3b0764', padding: 15, borderRadius: 12, marginVertical: 15 },
  infoText: { color: '#d8b4fe', fontSize: 14 }, // 文字サイズUP
  modalOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a1a', height: '60%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  tokenItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#333' },
  tokenSym: { color: 'white', fontWeight: 'bold' },
  tokenName: { color: '#666', fontSize: 12 },
  sectionHeader: { color: '#666', fontSize: 12, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
  settingItem: { flexDirection:'row', alignItems:'center', paddingVertical:16, borderBottomWidth:1, borderBottomColor:'#222', gap:15 },
  settingIcon: { width:32, height:32, borderRadius:8, backgroundColor:'#222', alignItems:'center', justifyContent:'center' },
  settingText: { color:'white', fontSize:18, flex:1 }, // 文字サイズUP
  settingGroup: { backgroundColor:'#1a1a1a', borderRadius:16, paddingHorizontal:15 },
  versionText: { textAlign:'center', color:'#444', fontSize:12, marginTop:40 },
  networkItem: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:15, borderBottomWidth:1, borderBottomColor:'#222' },
  networkItemActive: {  },
  descTextSmall: { color:'#666', fontSize:14 }, // 文字サイズUP
  notification: { position: 'absolute', top: Platform.OS === 'android' ? 60 : 50, alignSelf: 'center', backgroundColor: '#333', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, zIndex: 100 },
  notificationText: { color: 'white', fontWeight: 'bold' },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  mnemonicContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  wordTag: { flexDirection: 'row', backgroundColor: '#1a1a1a', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, gap: 6 },
  wordNum: { color: '#666', fontSize: 12 },
  wordText: { color: 'white', fontWeight: 'bold' },
  pinContainer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  pinTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  pinDesc: { color: '#888', marginBottom: 40 },
  pinDots: { flexDirection: 'row', gap: 20, marginBottom: 60 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: '#666' },
  dotActive: { backgroundColor: '#a855f7', borderColor: '#a855f7' },
  numPad: { flexDirection: 'row', flexWrap: 'wrap', width: 300, justifyContent: 'center', gap: 20 },
  numBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  numText: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  numBtnPlaceholder: { width: 70, height: 70 },
  closeButton: { position: 'absolute', top: Platform.OS === 'android' ? 60 : 50, right: 30, padding: 10 },
  mnemonicInput: { backgroundColor: '#1a1a1a', color: 'white', padding: 15, borderRadius: 12, fontSize: 16, height: 120, textAlignVertical: 'top', marginBottom: 20 },
  inputField: { backgroundColor:'#222', color:'white', padding:16, borderRadius:12, fontSize:16, marginBottom:16 },
  
  // ヘルプ画面用スタイル
  helpItemContainer: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  helpHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  helpIconBadge: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center' },
  helpTitle: { color: 'white', fontWeight: 'bold', fontSize: 15, flex: 1 },
  helpDesc: { color: '#aaa', fontSize: 13, lineHeight: 20, marginLeft: 38 },

  // 利用規約モーダル用
  //rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  termTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginTop: 15, marginBottom: 5 },
  termText: { color: '#ccc', fontSize: 14, lineHeight: 20, marginBottom: 10 },

  // Jito Badge
  jitoBadge: { backgroundColor:'#a855f7', borderRadius:4, paddingHorizontal:4, marginLeft: 6, flexDirection:'row', alignItems:'center' }, 
  jitoText: { color:'white', fontSize:10, marginLeft: 2 } 
});