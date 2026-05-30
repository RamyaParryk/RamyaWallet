import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

export const HeaderRow = ({ title, onBack, rightIcon }: any) => (
  <View style={localStyles.headerRow}>
    
    {/* 左側：戻るボタン（固定幅をなくし、自然に配置） */}
    {onBack && (
      <View style={localStyles.sideContainer}>
        <TouchableOpacity onPress={onBack} style={localStyles.iconButton}>
          <ChevronLeft size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    )}

    {/* 左寄せの大きなタイトル */}
    <Text style={localStyles.headerTitle} numberOfLines={1}>
      {title}
    </Text>

    {/* 右側：追加アイコンなど */}
    <View style={localStyles.rightContainer}>
      {rightIcon}
    </View>

  </View>
);

const localStyles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  sideContainer: {
    marginRight: 4, // タイトルとの間に少しだけ余白
    justifyContent: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    fontSize: 24, // スワップ画面等と統一
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'left',
  },
  rightContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  }
});