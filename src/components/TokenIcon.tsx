import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface TokenIconProps {
  uri?: string;
  symbol: string;
  size?: number;
}

export const TokenIcon: React.FC<TokenIconProps> = ({ uri, symbol, size = 40 }) => {
  const [hasError, setHasError] = useState(false);

  // フォールバック用の「頭文字アイコン」
  const renderFallback = () => (
    <View style={[styles.fallbackCircle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.fallbackText, { fontSize: size * 0.4 }]}>
        {symbol.substring(0, 1).toUpperCase()}
      </Text>
    </View>
  );

  // 画像がない、または読み込みエラー時にフォールバックを表示
  if (!uri || uri === "" || hasError) {
    return renderFallback();
  }

  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      onError={() => {
        console.warn(`[ICON] 404: ${symbol}`);
        setHasError(true);
      }}
    />
  );
};

const styles = StyleSheet.create({
  fallbackCircle: {
    backgroundColor: '#4B0082', // インディゴ（Phantom風の深みのある色）
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  fallbackText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});