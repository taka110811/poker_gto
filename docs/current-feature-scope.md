# 現状機能とUI整理

## 目的

このドキュメントは、Phase 5完了時点のアプリ機能、UI構成、実装上の境界、現時点のUI課題を整理する。

このアプリは、GTO Wizard風の学習体験に段階的に近づけるための静的Webアプリである。
ただし、現時点では完全なGTOソルバーではなく、近似計算、River限定CFR風計算、Turn/FlopのLite表示、事前計算済みDB参照を組み合わせた学習用プロトタイプとして扱う。

## 現在のユーザー導線

1. Hero cards、Board、Pot、To call、Effective stack、Bet size、Positionを入力する。
2. OOP/IPのレンジをプリセットまたは13x13マトリクスで調整する。
3. `Solve Spot` を押す。
4. Board枚数に応じて、対応する出力を見る。
   - Board 3枚: Flop Solver Lite
   - Board 4枚: Turn Solver Lite
   - Board 5枚: River Mini Solver と Solved Spot Reference
5. 近似EV、レンジ優位、アクション頻度、事前計算済みspot参照を確認する。

## 現在の機能

### Solver Setup

#### できること

- Hero positionを選択できる。
- Villain rangeを Tight / Standard / Wide / Any two から選択できる。
- Pot、To call、Effective stack、Bet sizeを入力できる。
- Hero cardsを2枚選択できる。
- Board cardsを最大5枚選択できる。
- `Random spot` でカードを自動入力できる。
- `Clear spot` でカード入力をリセットできる。

#### UI上の役割

Solver全体の入力パネル。
現状では、Preflop / Flop / Turn / Riverの入力が同じBoard入力欄に集約されている。
Board枚数によって、Flop / Turn / Riverのどのパネルが有効になるかが変わる。

### Poker Table表示

#### できること

- Hero cardsとBoard cardsをテーブル風に表示する。
- Potを中央に表示する。
- IP rangeラベルをVillain側に表示する。
- 重複カードがある場合はカード表示に警告が出る。

#### UI上の役割

入力されたspotを視覚的に確認するための表示エリア。
計算結果そのものではなく、現在選択中の状態確認に使う。

### Approx EV / Strategy Output

#### できること

- Monte CarloでHero equityを近似計算する。
- Pot odds、SPRを表示する。
- PositionやSPRを加味した簡易ロジックで Raise / Call / Fold の頻度を表示する。
- reasoningとして、なぜそのアクション頻度になったかを短く表示する。

#### 実装の境界

これはGTO solverの出力ではない。
Hero hand単体の近似判断であり、range vs rangeの厳密な均衡戦略ではない。

### Solved Spot Reference

#### できること

- `data/precomputed_spots.sqlite` をブラウザ上で読み込む。
- `sql.js` を使ってSQLite artifactを直接参照する。
- 入力spotに近い事前計算済みspotを検索する。
- Exact / Approx の一致状態を表示する。
- Approxの場合、stack、board、bet treeなど、どの条件を丸めたかを表示する。
- record id、spot情報、solver名/version、DB stats、action rowsを表示する。

#### 実装の境界

- 現在のサンプルDBは小規模。
- 参照できるspotは主にRiver向け。
- 事前計算済みDBの値は、UIと検索体験の検証用データとして扱う。
- データが大きくなった場合、モバイルやTailscale経由での読み込み時間を継続確認する必要がある。

### Range Builder

#### できること

- OOP / IPを切り替えてレンジ編集できる。
- 13x13のハンドマトリクスを表示する。
- 各ハンドを 0% / 25% / 50% / 75% / 100% で設定できる。
- OOP / IPそれぞれにプリセットを適用できる。
- 編集したレンジは、Approx EV、River Mini Solver、Turn Solver Lite、Flop Solver Liteの入力に反映される。

#### 実装の境界

- 現在のレンジプリセットは簡易的なhand strength順。
- GTO Wizardのような実戦ポジション別プリフロップレンジではない。
- Combo数は目安であり、詳細なカード除去や頻度分布の可視化はまだ限定的。

### River Mini Solver

#### できること

- Board 5枚のときに有効になる。
- Heads-up / no-rake / no-raise / fixed bet size候補のRiver spotを扱う。
- Bet size候補を切り替えられる。
  - 33% pot
  - 75% pot
  - 125% pot
  - All-in
- Web Worker上でRiver計算を実行する。
- 同じ入力ではsolver cacheを再利用する。
- OOP bet / check、IP call vs bet、IP bet vs check、OOP call vs probe、OOP EVを表示する。
- Bet sizeごとの比較表を表示する。

#### 実装の境界

RiverだけがCFR風のaction treeを持つ。
ただし、完全な商用GTO solver相当ではなく、ブラウザで動く小規模・近似のRiver solverとして扱う。

### Turn Solver Lite

#### できること

- Board 4枚のときに有効になる。
- 未使用カードからRiver runoutを上限付きで列挙する。
- 各River runoutについて、既存のRiver Mini Solverを呼び出す。
- 平均OOP bet / check、平均IP call、平均IP bet vs check、平均OOP call vs probe、平均OOP EVを表示する。
- best sampled riverを表示する。
- 計算時間、iteration数、runout cap、combo cap、accuracy labelを表示する。
- Riverごとの結果行を表示する。

#### 実装の境界

Turn streetの完全なCFR game treeはまだ解いていない。
Turn Solver Liteは、Turn入力からRiver候補をサンプルし、River solver結果を平均する近似レイヤーである。
本格的なTurn CFRは #40 に切り出している。

### Flop Solver Lite

#### できること

- Board 3枚のときに有効になる。
- Flop textureを分類する。
- OOP/IPのrange scoreを計算する。
- Range advantageを表示する。
- capped Turn samplesを列挙する。
- Turn sampleごとのtexture、OOP/IP score、advantageを表示する。
- Runout volatilityを表示する。
- 軽量heuristic strategyとして、OOP c-bet、OOP check、IP continueを表示する。

#### 実装の境界

Flop Solver LiteはCFRではない。
Range advantage、board texture、turn sampleの変動から、学習用の簡易strategy mixを出す。
本格的なFlop CFR、turn/river rolloutの厳密抽象化、solver精度検証は今後の別作業として扱う。

### Testing / CI

#### できること

- `npm run check` でJavaScript構文チェックを実行できる。
- `npm run db:validate` でseed JSON、SQLite、browser artifactの整合性を確認できる。
- `npm run test:db` でSQLite queryのunit testを実行できる。
- `npm run test:e2e` でPlaywright smoke testを実行できる。
- GitHub ActionsでPRとmain push時にチェックが走る。

## 現在できないこと

- 完全なGTO solverとして、preflopからriverまでの大きなgame treeを解くこと。
- Turn streetの厳密なCFR計算。
- Flop streetの厳密なCFR計算。
- 実戦的なGTO Wizard相当の巨大precomputed solution browser。
- プリフロップspot選択から、range / pot / stack / positionを自動prefillすること。
- ハンド履歴を読み込み、実プレイとsolver推奨を比較すること。
- EV lossやstudy reportを出すこと。

## UIの現状課題

### 1. 入力と出力の対応が分かりにくい

Board入力は1つだが、Board枚数によってFlop / Turn / Riverの有効パネルが切り替わる。
慣れれば効率的だが、初見では「なぜこのパネルが有効/無効なのか」が分かりにくい。

改善候補:

- Board枚数に応じて現在のstreetを明示する。
- Flop / Turn / Riverの各パネルに「このパネルが有効になる条件」を短く表示する。
- 無効パネルを折りたたむ、または薄く表示する。

### 2. 出力パネルが増えて情報量が多い

現在はStrategy Output、Solved Spot Reference、Range Builder、River Mini Solver、Turn Solver Lite、Flop Solver Liteが縦に並ぶ。
機能確認には便利だが、実際に学習するUIとしてはスクロール量が多い。

改善候補:

- Street別タブを導入する。
- `Overview / Flop / Turn / River / Reference DB` のように表示を分ける。
- Solve後に該当streetの結果へ自動スクロールする。

### 3. Lite実装とsolver実装の違いがUI上で混ざりやすい

RiverはCFR風、TurnはRiver rollout、Flopはheuristic strategyであり、計算の性質が違う。
Accuracy labelはあるが、ユーザーが数値を同列に比較してしまう可能性がある。

改善候補:

- 各パネルに `Live CFR`, `Rollout Lite`, `Heuristic Lite`, `Precomputed DB` のようなsource badgeをより強調する。
- 各結果に「精度・用途」の短い説明を添える。
- 本格solverではない出力には、Liteであることを常に表示する。

### 4. Range Builderが下にあり、編集と結果確認が離れている

Range Builderは重要な入力だが、画面下部にある。
レンジを変更したあとに上部の結果へ戻る必要があり、作業の往復が多い。

改善候補:

- Range Builderをサイドパネル化する。
- OOP/IP range summaryをSolver Setup付近に表示する。
- Range編集後に再計算が必要なことを明示する。

### 5. Precomputed DB ReferenceがRiver中心であることが分かりにくい

Reference DBは現状River spot中心だが、Flop/Turnパネルと同じ画面にあるため、全streetの参照DBのように見える可能性がある。

改善候補:

- Reference DBに `River solved spot reference` と明記する。
- Boardが3枚/4枚のときは、River referenceがまだ対象外であることを表示する。
- 将来的にFlop/Turn precomputed dataを追加する場合はstreet別に分ける。

### 6. モバイルでは情報密度が高い

レスポンシブ対応はあるが、Range Matrix、複数solverパネル、table表示が多く、スマホでの視認性はまだ重い。

改善候補:

- モバイルではパネルをaccordion化する。
- tableは重要列だけに絞る。
- Range Matrixは拡大/縮小または別画面に分ける。

### 7. 用語が英語中心で、日本語ユーザーには少し説明不足

UIには `OOP`, `IP`, `Probe`, `Runout volatility`, `Accuracy` などの専門語が多い。
学習ツールとしては自然だが、初心者には意味が分かりにくい。

改善候補:

- tooltipまたは短い補助テキストを追加する。
- 日本語UIラベルに寄せるか、英語ラベル + 日本語説明にする。
- `Probe` などの用語は「IP bet vs check」のように行動ベースで統一する。

## #8へ進む前の整理ポイント

Preflop Spot Browserへ進む前に、以下を前提として明確にする。

- 現状の強い計算ロジックはRiver Mini Solver。
- TurnとFlopはLite近似であり、本格solverではない。
- Precomputed DBはRiver中心の小規模サンプル。
- #8では、代表的なプリフロップspotからrange / pot / stack / positionをprefillすることを主目的にする。
- #8では、全spotに完全なGTO solutionがあるように見せないUIにする。
