# Poker GTO Simulator

Texas Hold'emの意思決定を練習するための静的Webアプリです。

## 使い方

```bash
python3 -m http.server 4173
```

ブラウザで http://localhost:4173 を開きます。

## 現在の仕様

- Heroの2枚、Board、ポット、コール額、スタック、ベットサイズを入力
- 相手レンジを Tight / Standard / Wide / Any two から選択
- Monte CarloでHero equityを近似計算
- Equity、pot odds、SPR、ポジション補正から Raise / Call / Fold の頻度を提示
- プリフロップレンジマトリクスを表示

これは厳密なGTOソルバーではありません。CFRなどでゲーム木を解く代わりに、GTO学習用の近似ロジックとして実装しています。
