import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import LottieView from 'lottie-react-native';
import { X, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');

// 1. シンプルな通知/エラー用 (OKボタンのみ)
export const SimpleAlertModal = ({ visible, title, message, onClose, type = 'error' }: any) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            {type === 'success' ? <CheckCircle2 size={50} color="#22c55e" /> : <AlertCircle size={50} color="#ef4444" />}
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          {/* ★修正: flex: 0 を追加して、文字が消えるのを防ぐ */}
          <TouchableOpacity 
            style={[
              styles.confirmBtn, 
              { width: '100%', backgroundColor: type === 'success' ? '#22c55e' : '#ef4444', flex: 0 }
            ]} 
            onPress={onClose}
          >
            <Text style={styles.confirmText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// 2. 確認用 (Yes/No)
export const ConfirmModal = ({ visible, title, message, onCancel, onConfirm, confirmText = "Confirm", cancelText = "Cancel" }: any) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}><Text style={styles.cancelText}>{cancelText}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}><Text style={styles.confirmText}>{confirmText}</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// 3. 選択用 (Buy画面などのリスト選択)
export const SelectionModal = ({ visible, title, options, onCancel }: any) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:15, width:'100%'}}>
             <Text style={styles.title}>{title}</Text>
             <TouchableOpacity onPress={onCancel}><X size={24} color="#666"/></TouchableOpacity>
          </View>
          <ScrollView style={{maxHeight: 300, width:'100%'}}>
            {options.map((opt:any, i:number) => (
              <TouchableOpacity key={i} style={styles.optionItem} onPress={() => { onCancel(); opt.onPress(); }}>
                <Text style={styles.optionText}>{opt.label}</Text>
                <ChevronRight size={20} color="#444" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// 4. 成功アニメーション
export const SuccessModal = ({ visible, message, onDone }: any) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { alignItems: 'center', paddingVertical: 30 }]}>
          <View style={{ width: 150, height: 150, marginBottom: 10 }}>
            {visible && <LottieView source={require('../../assets/success.json')} autoPlay loop={false} style={{ width: '100%', height: '100%' }} onAnimationFinish={onDone} />}
          </View>
          <Text style={[styles.title, { color: '#22c55e' }]}>Success!</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  card: { width: width * 0.85, backgroundColor: '#1e1e1e', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#333', alignItems:'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: 'white', marginBottom: 10, textAlign: 'center' },
  message: { fontSize: 16, color: '#ccc', marginBottom: 20, textAlign: 'center', lineHeight: 22 },
  btnRow: { flexDirection: 'row', gap: 12, width:'100%' },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#333', alignItems: 'center', borderWidth: 1, borderColor: '#444' },
  confirmBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#a855f7', alignItems: 'center' },
  cancelText: { color: '#ccc', fontWeight: 'bold' },
  confirmText: { color: 'white', fontWeight: 'bold' },
  optionItem: { flexDirection:'row', justifyContent:'space-between', paddingVertical:16, borderBottomWidth:1, borderBottomColor:'#333', width:'100%' },
  optionText: { color:'white', fontSize:16 }
});