/**
 * @format
 */

// ▼▼▼ ここから追加・修正 ▼▼▼
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;
// ▲▲▲ ここまで追加 ▲▲▲

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
