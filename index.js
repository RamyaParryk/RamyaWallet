/**
 * @format
 */

// ▼ 1. 乱数生成
import 'react-native-get-random-values';
// ▼ 2. URLなどのポリフィル
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

// ▼ 3. プロセス情報のポリフィル（★これが足りていませんでした！）
import process from 'process';
global.process = process;

// ▼ 4. アプリ本体の読み込み
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);