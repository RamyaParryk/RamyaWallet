const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // 1. スマホで使えない機能を、使えるライブラリに置き換える（ポリフィル）
    extraNodeModules: {
      crypto: require.resolve('react-native-crypto'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
      events: require.resolve('events'),
      process: require.resolve('process/browser'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);