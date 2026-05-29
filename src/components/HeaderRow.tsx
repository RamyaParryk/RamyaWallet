import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

export const HeaderRow = ({ title, onBack, rightIcon }: any) => (
  <View style={localStyles.headerRow}>
    
    {/* 左側：戻るボタン（ボタンがない時でもレイアウトを崩さないための固定幅） */}
    <View style={localStyles.sideContainer}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={localStyles.iconButton}>
          <ChevronLeft size={28} color="#aaa" />
        </TouchableOpacity>
      )}
    </View>

    {/* 中央：タイトル */}
    <Text style={localStyles.headerTitle} numberOfLines={1}>
      {title}
    </Text>

    {/* 右側：追加アイコンなど（無い時でもレイアウトを崩さない） */}
    <View style={[localStyles.sideContainer, { alignItems: 'flex-end' }]}>
      {rightIcon}
    </View>

  </View>
);

const localStyles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  sideContainer: {
    width: 50, // 🌟 左右の幅を同じに固定することで、タイトルが絶対に中央になる
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
});