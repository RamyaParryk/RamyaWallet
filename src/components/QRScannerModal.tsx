import React from 'react';
import { View, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { X } from 'lucide-react-native';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
}

export const QRScannerModal = ({ visible, onClose, onScan }: QRScannerModalProps) => {
  const device = useCameraDevice('back');

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && codes[0].value) {
        onScan(codes[0].value); // 読み取った文字列を親画面に返す
      }
    }
  });

  if (!device) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={visible}
          codeScanner={codeScanner}
        />
        {/* シンプルな閉じるボタン */}
        <View style={{ position: 'absolute', top: 50, left: 20, zIndex: 10 }}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        {/* スキャン用のターゲット枠 */}
        <View style={styles.targetBox} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  closeBtn: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 20 },
  targetBox: { position: 'absolute', top: '25%', bottom: '25%', left: '15%', right: '15%', borderWidth: 2, borderColor: '#a855f7', borderRadius: 16 }
});