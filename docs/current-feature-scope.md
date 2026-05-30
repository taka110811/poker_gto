# 現状機能とUI整理

## 目的

このドキュメントは、現在のアプリ機能、UI構成、実装上の境界、完了済みのUI改善、残っているUI課題を整理する。

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
6. Recent Solvesで直近のSolve結果を見返す。
   - `Apply` で履歴のspot入力を再適用する。
   - `Clear` でセッション内の履歴だけを消す。

## 現在の機能

### Solver Setup

#### できること

- Hero positionを選択できる。
- Villain rangeを Tight / Standard / Wide / Any two から選択できる。
- Pot、To call、Effective stack、Bet sizeを入力できる。
- Preflop Spot Browserから代表的なプリフロップspotのposition、range、pot、stackを反映できる。
- Hero cardsを2枚選択できる。
- Board cardsを最大5枚選択できる。
- `Random spot` でカードを自動入力できる。
- `Clear spot` でカード入力をリセットできる。

#### UI上の役割

Solver全体の入力パネル。
現状では、Preflop / Flop / Turn / Riverの入力が同じBoard入力欄に集約されている。
Board枚数によって、Flop / Turn / Riverのどのパネルが有効になるかが変わる。
Preflop Spot Browserはsetup presetであり、プリフロップのGTO solutionを表示するものではない。

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
- UI上ではRiver中心のReference DBであることを明示する。

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
- Solver Setup付近にOOP/IPのrange summaryを表示する。
- Range編集後はSolveで再計算が必要であることを表示する。

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
- OOP bet / check、IP call vs bet、IP bet vs check、OOP call vs IP bet、OOP EVを表示する。
- Bet sizeごとの比較表を表示する。
- `Live CFR` source badgeと短い用語説明を表示する。

#### 実装の境界

RiverだけがCFR風のaction treeを持つ。
ただし、完全な商用GTO solver相当ではなく、ブラウザで動く小規模・近似のRiver solverとして扱う。

### Turn Solver Lite

#### できること

- Board 4枚のときに有効になる。
- 未使用カードからRiver runoutを上限付きで列挙する。
- 各River runoutについて、既存のRiver Mini Solverを呼び出す。
- 平均OOP bet / check、平均IP call、平均IP bet vs check、平均OOP call vs IP bet、平均OOP EVを表示する。
- best sampled riverを表示する。
- 計算時間、iteration数、runout cap、combo cap、accuracy labelを表示する。
- Riverごとの結果行を表示する。
- `Rollout Lite` source badgeと短い用語説明を表示する。

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
- `Heuristic Lite` source badgeと短い用語説明を表示する。

#### 実装の境界

Flop Solver LiteはCFRではない。
Range advantage、board texture、turn sampleの変動から、学習用の簡易strategy mixを出す。
本格的なFlop CFR、turn/river rolloutの厳密抽象化、solver精度検証は今後の別作業として扱う。

### Results Navigation / Recent Solves

#### できること

- Resultsには `Overview / Flop / Turn / River / Reference DB` のタブがある。
- Board枚数に応じて該当streetタブとsolverパネルを有効化する。
- Solve後、該当streetの結果へ自動スクロールする。
- モバイル幅ではアクティブなstreet結果パネルをCollapse / Expandできる。
- Recent Solvesに直近5件のSolve結果をセッション内で保持する。
- Recent Solvesの各行はstreet、hero、board、推奨アクション、equity、SPR、source labelを表示する。
- `Apply` で履歴の入力snapshotを復元できる。
- `Clear` で履歴だけを空にできる。

#### 実装の境界

- Recent Solvesはブラウザセッション内のメモリ保持のみで、LocalStorageや外部保存はしない。
- `Apply` は入力値とrange presetを復元するが、Solve結果は再利用せず、該当streetを再計算待ちに戻す。
- 実プレイ履歴のインポート、EV loss、study reportは未対応。

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
- プリフロップspotごとのGTO solutionを表示すること。
- ハンド履歴を読み込み、実プレイとsolver推奨を比較すること。
- EV lossやstudy reportを出すこと。

## UIの現状課題

### 完了済みのUI改善

- Board枚数に応じたstreet summaryと有効solverパネル表示。
- Flop / Turn / River / Reference DBのResultsタブ。
- Solve後の該当street結果への自動スクロール。
- Solver source badgeと、Lite / DB / Live CFRの短い説明。
- Range summaryと、Range変更後にSolveが必要であることの表示。
- River中心のReference DBであることの明示。
- OOP / IP / Probe / EV / SPR / Accuracy / Runout volatilityなどの短い用語説明。
- モバイル幅でのstreet結果パネルCollapse / Expand。
- Recent Solvesの表示、Apply、Clear。

### 1. 入力と出力の対応は改善したが、入力欄はまだ集約されている

Board入力は1つだが、Board枚数によってFlop / Turn / Riverの有効パネルが切り替わる。
street summaryや有効パネル表示で改善済みだが、初見ではBoard欄が全street共通であることを理解する必要がある。

改善候補:

- Street別の入力プリセットや、Flop / Turn / Riverごとの入力補助を追加する。
- Board枚数不足時の入力ガイドをさらに具体化する。

### 2. 出力パネルは整理したが、情報量はまだ多い

Resultsタブ、source badge、モバイルCollapseで改善済み。
ただし、Strategy Output、Reference DB、Range Builder、各street solverを同一ページに置いているため、学習用途ではまだ情報量が多い。

改善候補:

- 学習モードと検証モードで表示密度を切り替える。
- tableの表示列を用途別に絞る。
- Range Builderを別ビューまたは固定サイドパネルに分ける。

### 3. Lite実装とsolver実装の違いは明示したが、数値比較には注意が必要

RiverはCFR風、TurnはRiver rollout、Flopはheuristic strategyであり、計算の性質が違う。
source badge、scope note、Accuracy label、用語説明で改善済み。
それでも、ユーザーがFlop / Turn / Riverの数値を同じ精度のsolver出力として比較する可能性は残る。

改善候補:

- Lite出力の背景色や枠をさらに分ける。
- Accuracyの説明をクリック/展開で詳しく表示する。
- Flop / Turn / Riverの計算方式比較をヘルプとして追加する。

### 4. Range Builderは重要だが、編集と結果確認はまだ離れている

Range Builderは重要な入力だが、画面下部にある。
summaryと再計算表示は追加済みだが、詳細編集と結果確認の往復はまだ多い。

改善候補:

- Range Builderをサイドパネル化する。
- Range Builderを別ビューに分ける。
- Range変更差分をRecent SolvesやPractice Recommendationに残す。

### 5. Precomputed DB ReferenceはRiver中心として明示済み

Reference DBはRiver中心であることをUI上で明記済み。
今後Flop/Turn precomputed dataを追加する場合は、street別のデータ境界を保つ必要がある。

改善候補:

- 将来的にFlop/Turn precomputed dataを追加する場合はstreet別に分ける。
- DB source、solver version、spot schemaをユーザーが比較しやすい形式にする。

### 6. モバイルは改善済みだが、Range Matrixはまだ重い

モバイル幅でのstreet結果Collapse / Expandは追加済み。
ただし、13x13 Range Matrixとtable表示はまだスマホでは重い。

改善候補:

- tableは重要列だけに絞る。
- Range Matrixは拡大/縮小または別画面に分ける。

### 7. 用語説明は追加済みだが、ヘルプとしてはまだ軽い

UIには `OOP`, `IP`, `Probe`, `Runout volatility`, `Accuracy` などの専門語が多い。
短い説明は追加済みだが、初心者向けの詳細なヘルプや例はまだない。

改善候補:

- 詳細ヘルプや例を折りたたみで追加する。
- 用語集ページを作る。
- 日本語UIラベルと英語GTO用語の対応表を追加する。

## #8以降の整理ポイント

Preflop Spot Browserでは、以下を前提として明確にする。

- 現状の強い計算ロジックはRiver Mini Solver。
- TurnとFlopはLite近似であり、本格solverではない。
- Precomputed DBはRiver中心の小規模サンプル。
- 代表的なプリフロップspotからrange / pot / stack / positionをprefillすることを主目的にする。
- 全spotに完全なGTO solutionがあるように見せないUIにする。
