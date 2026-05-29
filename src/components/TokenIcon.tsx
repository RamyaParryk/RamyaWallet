import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { resolveTokenIcon } from '../services/logoResolver';

interface TokenIconProps {
  uri?: string;
  symbol: string;
  mint?: string;
  size?: number;
  forceRetry?: boolean;

  // 画像が壊れてたら親に知らせる（mint単位でブラックリスト化できる）
  onBadIcon?: (mint: string, uri: string) => void;
}

const FAIL_TTL_MS = 1000 * 60 * 10;
const failedUrlCache = new Map<string, number>();
const loggedOnce = new Set<string>();

function normalizeUri(uri?: string): string {
  if (!uri) return '';
  let s = String(uri).trim();
  if (!s) return '';

  if (s.startsWith('ipfs://')) {
    const cid = s.replace('ipfs://', '');
    s = `https://cloudflare-ipfs.com/ipfs/${cid}`;
  }

  const lower = s.toLowerCase();
  if (lower.endsWith('.svg')) return '';
  if (lower.startsWith('data:image/svg')) return '';

  return s;
}

function shouldSkip(url: string) {
  const t = failedUrlCache.get(url);
  if (!t) return false;
  return Date.now() - t < FAIL_TTL_MS;
}

export const TokenIcon: React.FC<TokenIconProps> = ({
  uri,
  symbol,
  mint,
  size = 40,
  forceRetry = false,
  onBadIcon,
}) => {
  const [hasError, setHasError] = useState(false);
  const [resolved, setResolved] = useState<string>('');

  useEffect(() => {
    setHasError(false);
    setResolved('');
  }, [uri, mint]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const direct = normalizeUri(uri);
      if (direct) {
        if (!cancelled) setResolved(direct);
        return;
      }

      if (!mint) {
        if (!cancelled) setResolved('');
        return;
      }

      const out = await resolveTokenIcon(mint, uri);
      if (!cancelled) setResolved(normalizeUri(out));
    };

    run().catch(() => {
      if (!cancelled) setResolved('');
    });

    return () => {
      cancelled = true;
    };
  }, [uri, mint]);

  const normalizedUri = useMemo(() => normalizeUri(resolved), [resolved]);

  const skipImage = useMemo(() => {
    if (!normalizedUri) return true;
    if (forceRetry) return false;
    return shouldSkip(normalizedUri);
  }, [normalizedUri, forceRetry]);

  const onError = useCallback(() => {
    if (normalizedUri) {
      failedUrlCache.set(normalizedUri, Date.now());

      if (!loggedOnce.has(normalizedUri)) {
        loggedOnce.add(normalizedUri);
        console.warn(`[ICON] failed: ${symbol}`);
      }

      // ★ 親に報告（mintがある場合だけ）
      if (mint && onBadIcon) {
        onBadIcon(mint, normalizedUri);
      }
    }
    setHasError(true);
  }, [normalizedUri, symbol, mint, onBadIcon]);

  const renderFallback = () => (
    <View style={[styles.fallbackCircle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.fallbackText, { fontSize: Math.max(12, size * 0.4) }]}>
        {(symbol || '?').substring(0, 1).toUpperCase()}
      </Text>
    </View>
  );

  if (!normalizedUri || hasError || skipImage) return renderFallback();

  return (
    <Image
      source={{ uri: normalizedUri }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      onError={onError}
      resizeMode="cover"
    />
  );
};

const styles = StyleSheet.create({
  fallbackCircle: {
    backgroundColor: '#4B0082',
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
