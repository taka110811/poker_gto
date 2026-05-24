(function () {
  const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
  const RANK_VALUES = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    T: 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
  };
  const SUITS = ["s", "h", "d", "c"];
  const RANGE_PERCENTILE = { tight: 0.18, standard: 0.3, wide: 0.45, any: 1 };
  const RANGE_LABELS = {
    tight: "Tight 18%",
    standard: "Standard 30%",
    wide: "Wide 45%",
    any: "Any two",
  };
  const RANGE_STEPS = [0, 0.25, 0.5, 0.75, 1];

  function deck() {
    return RANKS.slice()
      .reverse()
      .flatMap((rank) => SUITS.map((suit) => `${rank}${suit}`));
  }

  function choose(items, size) {
    const result = [];
    function walk(start, combo) {
      if (combo.length === size) {
        result.push(combo.slice());
        return;
      }
      for (let i = start; i < items.length; i += 1) {
        combo.push(items[i]);
        walk(i + 1, combo);
        combo.pop();
      }
    }
    walk(0, []);
    return result;
  }

  function allStartingHands() {
    const hands = [];
    RANKS.forEach((first, i) => {
      RANKS.forEach((second, j) => {
        if (j < i) return;
        if (i === j) {
          hands.push({ code: `${first}${second}`, score: startingHandScore(`${first}s`, `${second}h`) });
        } else {
          hands.push({ code: `${first}${second}s`, score: startingHandScore(`${first}s`, `${second}s`) });
          hands.push({ code: `${first}${second}o`, score: startingHandScore(`${first}s`, `${second}h`) - 2 });
        }
      });
    });
    return hands;
  }

  function makePresetRange(rangeName) {
    const threshold = RANGE_PERCENTILE[rangeName];
    const hands = allStartingHands().sort((a, b) => b.score - a.score);
    const cutoff = Math.ceil(hands.length * threshold);
    return hands.reduce((acc, hand, index) => {
      acc[hand.code] = index < cutoff ? 1 : 0;
      return acc;
    }, {});
  }

  function comboCountFor(code) {
    if (code.length === 2) return 6;
    return code.endsWith("s") ? 4 : 12;
  }

  function handCode(a, b) {
    const first = a[0];
    const second = b[0];
    if (first === second) return `${first}${second}`;
    const ordered = [first, second].sort((x, y) => RANK_VALUES[y] - RANK_VALUES[x]);
    return `${ordered[0]}${ordered[1]}${a[1] === b[1] ? "s" : "o"}`;
  }

  function startingHandScore(a, b) {
    const high = Math.max(RANK_VALUES[a[0]], RANK_VALUES[b[0]]);
    const low = Math.min(RANK_VALUES[a[0]], RANK_VALUES[b[0]]);
    const pair = a[0] === b[0];
    const suited = a[1] === b[1];
    const gap = Math.max(0, high - low - 1);
    let score = high * 2 + low;
    if (pair) score += 35 + high;
    if (suited) score += 5;
    if (gap === 0) score += 4;
    if (gap === 1) score += 2;
    if (gap >= 4) score -= 5;
    if (high >= 12 && low >= 10) score += 6;
    return score;
  }

  function compactRangeKey(range) {
    return Object.keys(range)
      .sort()
      .filter((code) => range[code] > 0)
      .map((code) => `${code}:${range[code]}`)
      .join(",");
  }

  function rangeCombos(range, board, comboLimit = 40) {
    const blocked = new Set(board);
    return choose(
      deck().filter((card) => !blocked.has(card)),
      2
    )
      .map((cards) => ({
        cards,
        frequency: range[handCode(cards[0], cards[1])] || 0,
        key: cards.join(""),
        score: startingHandScore(cards[0], cards[1]),
      }))
      .filter((combo) => combo.frequency > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, comboLimit);
  }

  window.PokerGtoRanges = {
    RANGE_LABELS,
    RANGE_STEPS,
    comboCountFor,
    compactRangeKey,
    handCode,
    makePresetRange,
    rangeCombos,
  };
})();
