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
- Preflop Spot Browserで代表的なプリフロップspotの入力をprefill
- River Mini Solver、Turn Solver Lite、Flop Solver Liteを表示
- SQLiteの事前計算済みspotをブラウザで参照
- Recent Solvesで直近のSolve結果を確認、再適用、クリア

これは厳密なGTOソルバーではありません。CFRなどでゲーム木を解く代わりに、GTO学習用の近似ロジックとして実装しています。

詳しい現状機能、UI構成、実装の境界、現在のUI課題は [docs/current-feature-scope.md](docs/current-feature-scope.md) を参照してください。
