// src/components/ActionModals.tsx

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

// ■ 成功用アニメーション（Backpack風チェックマーク）
export const SuccessModal = ({ visible, message, onDone }: any) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { alignItems: 'center', paddingVertical: 40 }]}>
          {/* Lottieアニメーション */}
          <View style={{ width: 120, height: 120, marginBottom: 20 }}>
            {visible && (
              <LottieView
                source={require('../../assets/success.json')} // ★ assetsに置いたファイルを指定
                autoPlay
                loop={false}
                style={{ width: '100%', height: '100%' }}
                onAnimationFinish={onDone} // アニメが終わったら閉じる場合はこれを使う
              />
            )}
          </View>
          <Text style={[styles.title, { color: '#22c55e', fontSize: 22 }]}>Success!</Text>
          <Text style={[styles.message, { textAlign: 'center', marginTop: 10 }]}>{message}</Text>
          
          <TouchableOpacity style={[styles.confirmBtn, { marginTop: 20, width: '80%' }]} onPress={onDone}>
            <Text style={styles.confirmText}>Close</Text>
          </TouchableOpacity>
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
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#a855f7', // メインカラー
    alignItems: 'center',
  },
  cancelText: { color: 'white', fontWeight: 'bold' },
  confirmText: { color: 'white', fontWeight: 'bold' },
});