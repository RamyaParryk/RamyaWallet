import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native'; // ★ アニメーション用
import { X } from 'lucide-react-native';

const { width } = Dimensions.get('window');

// ■ 確認用ダイアログ（スワップしますか？）
export const ConfirmModal = ({ visible, title, message, onCancel, onConfirm, confirmText, cancelText }: any) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelText || "Cancel"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={styles.confirmText}>{confirmText || "Confirm"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ■ 成功用アニメーション（ボタンなし・自動クローズ）
export const SuccessModal = ({ visible, message, onDone }: any) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { alignItems: 'center', paddingVertical: 30 }]}>
          
          <View style={{ width: 240, height: 240, marginBottom: 10 }}>
            {visible && (
              <LottieView
                source={require('../../assets/success.json')}
                autoPlay
                loop={false}
                speed={1.0}
                style={{ 
                  width: '100%', 
                  height: '100%',
                  backgroundColor: 'transparent'
                }}
                onAnimationFinish={onDone}
              />
            )}
          </View>

          <Text style={[styles.title, { color: '#22c55e', fontSize: 24 }]}>Success!</Text>
          <Text style={[styles.message, { textAlign: 'center', marginTop: 10, fontSize: 18 }]}>{message}</Text>
          
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)', // 背景を暗くする
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: width * 0.85,
    backgroundColor: '#1e1e1e', // ダークモード背景
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12, // ボタン同士の間隔
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  confirmBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#a855f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: '#ccc',
    fontWeight: 'bold',
    fontSize: 16,
  },
  confirmText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});