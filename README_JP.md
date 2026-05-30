# 💎 RamyaWallet

**[🇺🇸 English Version](./README.md)** | **🇯🇵 日本語版**

![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS-lightgrey.svg)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=flat&logo=react&logoColor=61DAFB)
![Solana](https://img.shields.io/badge/Solana-14F195?style=flat&logo=solana&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green.svg)

**React Native製の、安全・爆速・シンプルな Solana ウォレット**

RamyaWallet（ラミャ・ウォレット）は、Solanaブロックチェーン向けに設計された**非カストディアル（自己管理型）**の暗号資産ウォレットです。
ユーザーのプライバシーとセキュリティ、そして圧倒的な動作速度を最優先に設計されています。

🔗 **公式サイト:** [https://RamyaParryk.github.io/RamyaWallet/](https://RamyaParryk.github.io/RamyaWallet/)

---

## 📱 スクリーンショット
<p align="center">
  <img style="width: 100%; max-width: 1200px; height: 100%; max-height: 600px;" alt="RamyaWallet_dApp" src="https://github.com/user-attachments/assets/74053a9f-bdcf-4d20-ba11-91fc65666669" />
</p>

---

## 🚀 主な機能

* **⚡ 爆速・軽量化:** 動作を不安定にする重いチャート機能を排除し、スピードを極限まで最適化。API制限を気にすることなく、ポートフォリオの確認、送金、スワップが一瞬で完了します。
* **💳 暗号資産の購入 (Buy Crypto):** MoonPayやTransakを使ったクレジットカード決済のほか、手数料のお得な取引所（MEXC, Gate.io）へスムーズにアクセスし、簡単に資産を追加できます。
* **🔗 WalletConnect & QR対応:** 内蔵のQRスキャナーを使って、PCや他のデバイス上のdApps（分散型アプリ）と安全に接続・連携できます。
* **🔥 強力なBurn（焼却）機能:** ウォレットのお掃除に最適！しつこいスパムNFTや空のトークンアカウントを安全に焼却し、SOL（アカウントの家賃）を回収できます（特殊なcNFTには分かりやすい警告を表示）。
* **🔄 安全なスワップ:** **Jupiter Aggregator** を搭載。
    * **支払い (From):** Jupiterが対応するあらゆるトークンを使用可能です。
    * **受取り (To):** 安全性を確保するため、**厳選された44種類の優良トークンへのみ**交換可能に制限しています。
* **🥩 リキッドステーキング:** **Jito** と直接統合。アプリ内で簡単にSOLをステークして JitoSOL の報酬を得られます。
* **🛡️ 非カストディアル:** 秘密鍵はあなたのものです。端末内で暗号化して保存され、外部に送信されることはありません。
* **🕵️ プライバシー重視:** 追跡なし、アカウント登録なし。個人情報は収集しません。
* **📲 NFCタッチ決済 (Android限定):** RamyaWalletが入ったスマホ同士をかざすだけで、アドレス入力なしで瞬時にSOLやトークンを送受信できます。暗号資産を使った、まるで電子マネーのような日常的な決済体験を実現しました。

## 🛠️ 技術スタック

* **フレームワーク:** React Native (TypeScript)
* **ブロックチェーン:** Solana (Web3.js)
* **主要連携API:** Jupiter Aggregator, Helius, WalletConnect

---

## 📜 ライセンス・規約

* **プライバシーポリシー:** [英語](./privacy_en.md) / [日本語](./privacy_jp.md)
* **Copyright:** (C) 2026 RATO LAB.
