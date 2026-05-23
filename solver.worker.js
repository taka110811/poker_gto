const ranks = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const rankValues = {
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
const suits = ["s", "h", "d", "c"];
const solverCache = new Map();

self.onmessage = (event) => {
  const { id, payload, type } = event.data || {};

  try {
    if (type === "solve-turn") {
      self.postMessage({ id, ...solveTurnRunouts(payload), type: "turn-result" });
      return;
    }

    if (type !== "solve-river") return;

    let cacheHits = 0;
    const results = payload.candidates
      .map((candidate) => {
        const solved = solveRiverSpotCached({
          betSize: candidate.amount,
          board: payload.board,
          ipRange: payload.ipRange,
          iterations: payload.iterations,
          oopRange: payload.oopRange,
          pot: payload.pot,
          comboLimit: payload.comboLimit,
          version: payload.version,
        });
        if (solved.cacheHit) cacheHits += 1;
        return { ...candidate, result: solved.result };
      })
      .filter((candidate) => candidate.result);

    self.postMessage({ id, results, cacheHits, type: "river-result" });
  } catch (error) {
    self.postMessage({ id, message: error.message || String(error), type: "river-error" });
  }
};

function solveTurnRunouts(payload) {
  let cacheHits = 0;
  const runouts = turnRunoutCards(payload.deadCards, payload.runoutLimit);
  const results = [];

  runouts.forEach((riverCard) => {
    const riverBoard = payload.board.concat(riverCard);
    const best = payload.candidates
      .map((candidate) => {
        const solved = solveRiverSpotCached({
          betSize: candidate.amount,
          board: riverBoard,
          ipRange: payload.ipRange,
          iterations: payload.iterations,
          oopRange: payload.oopRange,
          pot: payload.pot,
          comboLimit: payload.comboLimit,
          version: payload.version,
        });
        if (solved.cacheHit) cacheHits += 1;
        return { ...candidate, result: solved.result };
      })
      .filter((candidate) => candidate.result)
      .sort((a, b) => b.result.oopEv - a.result.oopEv)[0];

    if (best) results.push({ riverCard, result: best.result });
  });

  return { results, cacheHits, runoutCount: runouts.length };
}

function turnRunoutCards(deadCards, limit) {
  const blocked = new Set((deadCards || []).filter(Boolean));
  return deck()
    .filter((card) => !blocked.has(card))
    .slice(0, limit);
}

function solveRiverSpotCached(input) {
  const key = solverCacheKey(input);
  if (solverCache.has(key)) return { result: solverCache.get(key), cacheHit: true };
  const result = solveRiverSpot(input);
  if (result) solverCache.set(key, result);
  return { result, cacheHit: false };
}

function solverCacheKey({ board, pot, betSize, iterations, comboLimit, version, oopRange, ipRange }) {
  return JSON.stringify({
    betSize,
    board: board.slice().sort(),
    comboLimit,
    ip: compactRangeKey(ipRange),
    iterations,
    oop: compactRangeKey(oopRange),
    pot,
    version,
  });
}

function compactRangeKey(range) {
  return Object.keys(range)
    .sort()
    .filter((code) => range[code] > 0)
    .map((code) => `${code}:${range[code]}`)
    .join(",");
}

function solveRiverSpot({ board, pot, betSize, oopRange, ipRange, iterations, comboLimit }) {
  const oopCombos = rangeCombos(oopRange, board, comboLimit);
  const ipCombos = rangeCombos(ipRange, board, comboLimit);
  const pairs = [];

  oopCombos.forEach((oop) => {
    ipCombos.forEach((ip) => {
      if (!oop.cards.some((card) => ip.cards.includes(card))) pairs.push({ oop, ip, weight: oop.frequency * ip.frequency });
    });
  });

  if (!pairs.length || pot <= 0 || betSize <= 0) return null;

  const infosets = new Map();
  for (let i = 0; i < iterations; i += 1) {
    pairs.forEach(({ oop, ip, weight }) => {
      riverCfr("", oop, ip, board, pot, betSize, infosets, weight, weight);
    });
  }

  const root = aggregateStrategy(infosets, pairs, "oop", "root", "oop");
  const ipCall = aggregateStrategy(infosets, pairs, "ip", "vs-oop-bet", "ip");
  const ipProbe = aggregateStrategy(infosets, pairs, "ip", "after-oop-check", "ip");
  const oopCall = aggregateStrategy(infosets, pairs, "oop", "vs-ip-bet", "oop");

  return {
    oopBet: root[1],
    ipCall: ipCall[1],
    ipProbe: ipProbe[1],
    oopCall: oopCall[1],
    oopEv: averageRiverEv(pairs, board, pot, betSize, infosets),
    oopCombos: oopCombos.length,
    ipCombos: ipCombos.length,
  };
}

function rangeCombos(range, board, comboLimit) {
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

function deck() {
  return ranks
    .slice()
    .reverse()
    .flatMap((rank) => suits.map((suit) => `${rank}${suit}`));
}

function handCode(a, b) {
  const first = a[0];
  const second = b[0];
  if (first === second) return `${first}${second}`;
  const ordered = [first, second].sort((x, y) => rankValues[y] - rankValues[x]);
  return `${ordered[0]}${ordered[1]}${a[1] === b[1] ? "s" : "o"}`;
}

function startingHandScore(a, b) {
  const high = Math.max(rankValues[a[0]], rankValues[b[0]]);
  const low = Math.min(rankValues[a[0]], rankValues[b[0]]);
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

function riverCfr(history, oop, ip, board, pot, betSize, infosets, oopReach, ipReach) {
  if (isRiverTerminal(history)) return riverUtility(history, oop.cards, ip.cards, board, pot, betSize);

  const player = riverPlayer(history);
  const actions = riverActions(history);
  const combo = player === "oop" ? oop : ip;
  const infoset = getInfoset(infosets, player, riverNodeName(history), combo.key, actions.length);
  const strategy = currentStrategy(infoset, player === "oop" ? oopReach : ipReach);
  const values = actions.map((action, index) =>
    riverCfr(
      history + action,
      oop,
      ip,
      board,
      pot,
      betSize,
      infosets,
      player === "oop" ? oopReach * strategy[index] : oopReach,
      player === "ip" ? ipReach * strategy[index] : ipReach
    )
  );
  const nodeValue = values.reduce((sum, value, index) => sum + strategy[index] * value, 0);

  values.forEach((value, index) => {
    const regret = player === "oop" ? value - nodeValue : nodeValue - value;
    infoset.regrets[index] += (player === "oop" ? ipReach : oopReach) * regret;
  });

  return nodeValue;
}

function isRiverTerminal(history) {
  return ["XK", "XBF", "XBC", "BF", "BC"].includes(history);
}

function riverPlayer(history) {
  if (history === "" || history === "XB") return "oop";
  return "ip";
}

function riverNodeName(history) {
  return { "": "root", X: "after-oop-check", XB: "vs-ip-bet", B: "vs-oop-bet" }[history];
}

function riverActions(history) {
  if (history === "") return ["X", "B"];
  if (history === "X") return ["K", "B"];
  return ["F", "C"];
}

function riverUtility(history, oopCards, ipCards, board, pot, betSize) {
  if (history === "BF") return pot;
  if (history === "XBF") return 0;
  if (history === "XK") return showdownEv(oopCards, ipCards, board, pot, 0);
  return showdownEv(oopCards, ipCards, board, pot, betSize);
}

function showdownEv(oopCards, ipCards, board, pot, betSize) {
  const result = compareHands(evaluateSeven(oopCards.concat(board)), evaluateSeven(ipCards.concat(board)));
  if (result > 0) return pot + betSize;
  if (result < 0) return -betSize;
  return pot / 2;
}

function evaluateSeven(cards) {
  const combos = choose(cards, 5);
  return combos.reduce((best, hand) => {
    const value = evaluateFive(hand);
    return compareHands(value, best) > 0 ? value : best;
  }, [0]);
}

function evaluateFive(cards) {
  const values = cards.map((card) => rankValues[card[0]]).sort((a, b) => b - a);
  const suitsInHand = cards.map((card) => card[1]);
  const counts = countBy(values);
  const groups = Object.entries(counts)
    .map(([value, count]) => ({ value: Number(value), count }))
    .sort((a, b) => b.count - a.count || b.value - a.value);
  const flush = suitsInHand.every((suit) => suit === suitsInHand[0]);
  const straightHigh = getStraightHigh(values);

  if (flush && straightHigh) return [8, straightHigh];
  if (groups[0].count === 4) return [7, groups[0].value, kicker(values, [groups[0].value])[0]];
  if (groups[0].count === 3 && groups[1].count === 2) return [6, groups[0].value, groups[1].value];
  if (flush) return [5, ...values];
  if (straightHigh) return [4, straightHigh];
  if (groups[0].count === 3) return [3, groups[0].value, ...kicker(values, [groups[0].value])];
  if (groups[0].count === 2 && groups[1].count === 2) {
    const pairs = groups
      .filter((group) => group.count === 2)
      .map((group) => group.value)
      .sort((a, b) => b - a);
    return [2, ...pairs, ...kicker(values, pairs)];
  }
  if (groups[0].count === 2) return [1, groups[0].value, ...kicker(values, [groups[0].value])];
  return [0, ...values];
}

function countBy(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function getStraightHigh(values) {
  const unique = [...new Set(values)];
  if (unique.includes(14)) unique.push(1);
  for (let i = 0; i <= unique.length - 5; i += 1) {
    const run = unique.slice(i, i + 5);
    if (run[0] - run[4] === 4) return run[0];
  }
  return 0;
}

function kicker(values, used) {
  return values.filter((value) => !used.includes(value));
}

function compareHands(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
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

function getInfoset(infosets, player, node, comboKey, actionCount) {
  const key = `${player}:${node}:${comboKey}`;
  if (!infosets.has(key)) {
    infosets.set(key, {
      regrets: Array(actionCount).fill(0),
      strategySum: Array(actionCount).fill(0),
    });
  }
  return infosets.get(key);
}

function currentStrategy(infoset, reach) {
  const positives = infoset.regrets.map((regret) => Math.max(0, regret));
  const total = positives.reduce((sum, regret) => sum + regret, 0);
  const strategy = total > 0 ? positives.map((regret) => regret / total) : positives.map(() => 1 / positives.length);
  strategy.forEach((value, index) => (infoset.strategySum[index] += reach * value));
  return strategy;
}

function averageStrategy(infoset) {
  const total = infoset.strategySum.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return infoset.strategySum.map(() => 1 / infoset.strategySum.length);
  return infoset.strategySum.map((value) => value / total);
}

function aggregateStrategy(infosets, pairs, player, node, side) {
  const totals = [0, 0];
  let weight = 0;
  pairs.forEach(({ oop, ip }) => {
    const combo = side === "oop" ? oop : ip;
    const infoset = infosets.get(`${player}:${node}:${combo.key}`);
    if (!infoset) return;
    const strategy = averageStrategy(infoset);
    const comboWeight = combo.frequency || 1;
    totals[0] += strategy[0] * comboWeight;
    totals[1] += strategy[1] * comboWeight;
    weight += comboWeight;
  });
  return weight > 0 ? totals.map((value) => value / weight) : [0.5, 0.5];
}

function averageRiverEv(pairs, board, pot, betSize, infosets) {
  const totalWeight = pairs.reduce((sum, pair) => sum + pair.weight, 0);
  const total = pairs.reduce(
    (sum, { oop, ip, weight }) => sum + riverAverageUtility("", oop, ip, board, pot, betSize, infosets) * weight,
    0
  );
  return total / totalWeight;
}

function riverAverageUtility(history, oop, ip, board, pot, betSize, infosets) {
  if (isRiverTerminal(history)) return riverUtility(history, oop.cards, ip.cards, board, pot, betSize);
  const player = riverPlayer(history);
  const node = riverNodeName(history);
  const combo = player === "oop" ? oop : ip;
  const strategy = averageStrategy(infosets.get(`${player}:${node}:${combo.key}`));
  return riverActions(history).reduce(
    (sum, action, index) => sum + strategy[index] * riverAverageUtility(history + action, oop, ip, board, pot, betSize, infosets),
    0
  );
}
