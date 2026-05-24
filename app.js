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
const suitSymbols = { s: "♠", h: "♥", d: "♦", c: "♣" };
const rangePercentile = { tight: 0.18, standard: 0.3, wide: 0.45, any: 1 };
const rangeLabels = {
  tight: "Tight 18%",
  standard: "Standard 30%",
  wide: "Wide 45%",
  any: "Any two",
};
const rangeSteps = [0, 0.25, 0.5, 0.75, 1];
const rangeState = {
  activeSide: "oop",
  oop: {},
  ip: {},
};
const betTreeState = {
  activeSizes: new Set(["0.33", "0.75"]),
};
const solverSettings = {
  iterations: new URLSearchParams(window.location.search).get("testMode") === "1" ? 6 : 30,
  comboLimit: 40,
  turnComboLimit: 16,
  turnRunoutLimit: new URLSearchParams(window.location.search).get("testMode") === "1" ? 4 : 8,
  flopComboLimit: 24,
  flopTurnLimit: new URLSearchParams(window.location.search).get("testMode") === "1" ? 4 : 8,
  version: "river-v1",
};
const solverCache = new Map();
const pendingRiverSolves = new Map();
const riverWorker = createRiverWorker();
const precomputedStore = createSqlitePrecomputedStore("./data/precomputed_spots.sqlite");
let riverRequestId = 0;
let turnRequestId = 0;
let solverRequestId = 0;

const els = {
  position: document.querySelector("#position"),
  villainRange: document.querySelector("#villainRange"),
  pot: document.querySelector("#pot"),
  toCall: document.querySelector("#toCall"),
  stack: document.querySelector("#stack"),
  betSize: document.querySelector("#betSize"),
  heroCards: document.querySelector("#heroCards"),
  boardCards: document.querySelector("#boardCards"),
  heroDisplay: document.querySelector("#heroDisplay"),
  boardDisplay: document.querySelector("#boardDisplay"),
  rangeLabel: document.querySelector("#rangeLabel"),
  potDisplay: document.querySelector("#potDisplay"),
  rangeMatrix: document.querySelector("#rangeMatrix"),
  comboCount: document.querySelector("#comboCount"),
  oopRangeTab: document.querySelector("#oopRangeTab"),
  ipRangeTab: document.querySelector("#ipRangeTab"),
  oopPreset: document.querySelector("#oopPreset"),
  ipPreset: document.querySelector("#ipPreset"),
  actionLabel: document.querySelector("#actionLabel"),
  actionFrequency: document.querySelector("#actionFrequency"),
  equity: document.querySelector("#equity"),
  potOdds: document.querySelector("#potOdds"),
  spr: document.querySelector("#spr"),
  samples: document.querySelector("#samples"),
  reasoning: document.querySelector("#reasoning"),
  raiseBar: document.querySelector("#raiseBar"),
  callBar: document.querySelector("#callBar"),
  foldBar: document.querySelector("#foldBar"),
  raisePct: document.querySelector("#raisePct"),
  callPct: document.querySelector("#callPct"),
  foldPct: document.querySelector("#foldPct"),
  riverStatus: document.querySelector("#riverStatus"),
  oopBetFreq: document.querySelector("#oopBetFreq"),
  oopCheckFreq: document.querySelector("#oopCheckFreq"),
  ipCallFreq: document.querySelector("#ipCallFreq"),
  ipProbeFreq: document.querySelector("#ipProbeFreq"),
  oopCallFreq: document.querySelector("#oopCallFreq"),
  riverEv: document.querySelector("#riverEv"),
  turnStatus: document.querySelector("#turnStatus"),
  turnRunouts: document.querySelector("#turnRunouts"),
  turnOopBetFreq: document.querySelector("#turnOopBetFreq"),
  turnOopCheckFreq: document.querySelector("#turnOopCheckFreq"),
  turnIpCallFreq: document.querySelector("#turnIpCallFreq"),
  turnIpProbeFreq: document.querySelector("#turnIpProbeFreq"),
  turnOopCallFreq: document.querySelector("#turnOopCallFreq"),
  turnEv: document.querySelector("#turnEv"),
  turnBestRiver: document.querySelector("#turnBestRiver"),
  turnRangeCap: document.querySelector("#turnRangeCap"),
  turnSolverSettings: document.querySelector("#turnSolverSettings"),
  turnCalcTime: document.querySelector("#turnCalcTime"),
  turnAccuracy: document.querySelector("#turnAccuracy"),
  turnRunoutRows: document.querySelector("#turnRunoutRows"),
  flopStatus: document.querySelector("#flopStatus"),
  flopTexture: document.querySelector("#flopTexture"),
  flopOopScore: document.querySelector("#flopOopScore"),
  flopIpScore: document.querySelector("#flopIpScore"),
  flopRangeAdvantage: document.querySelector("#flopRangeAdvantage"),
  flopTurnSamples: document.querySelector("#flopTurnSamples"),
  flopAccuracy: document.querySelector("#flopAccuracy"),
  flopTurnRows: document.querySelector("#flopTurnRows"),
  sizeButtons: document.querySelectorAll(".size-button"),
  sizeResults: document.querySelector("#sizeResults"),
  runSimulation: document.querySelector("#runSimulation"),
  randomDeal: document.querySelector("#randomDeal"),
  clearCards: document.querySelector("#clearCards"),
  precomputedStatus: document.querySelector("#precomputedStatus"),
  precomputedRecord: document.querySelector("#precomputedRecord"),
  precomputedSpot: document.querySelector("#precomputedSpot"),
  precomputedSolver: document.querySelector("#precomputedSolver"),
  precomputedDbStats: document.querySelector("#precomputedDbStats"),
  precomputedActions: document.querySelector("#precomputedActions"),
  precomputedActionRows: document.querySelector("#precomputedActionRows"),
};

function deck() {
  return ranks
    .slice()
    .reverse()
    .flatMap((rank) => suits.map((suit) => `${rank}${suit}`));
}

function makeCardSelect(id) {
  const select = document.createElement("select");
  select.id = id;
  select.className = "card-select";
  select.innerHTML = `<option value="">--</option>${deck()
    .map((card) => `<option value="${card}">${formatCard(card)}</option>`)
    .join("")}`;
  select.addEventListener("change", () => {
    invalidateSolverCache();
    sync();
  });
  return select;
}

function formatCard(card) {
  if (!card) return "";
  return `${card[0]}${suitSymbols[card[1]]}`;
}

function boardKey(board) {
  return board.slice().sort().join(" ");
}

function boardClass(board) {
  if (board.length !== 5) return "River board required";

  const rankCounts = board.reduce((counts, card) => {
    counts[card[0]] = (counts[card[0]] || 0) + 1;
    return counts;
  }, {});
  const suitCounts = board.reduce((counts, card) => {
    counts[card[1]] = (counts[card[1]] || 0) + 1;
    return counts;
  }, {});
  const highRank = board
    .map((card) => card[0])
    .sort((a, b) => rankValues[b] - rankValues[a])[0];
  const suitPattern = Object.keys(suitCounts).length === 1 ? "monotone" : Math.max(...Object.values(suitCounts)) >= 3 ? "two-tone" : "rainbow";
  const values = [...new Set(board.map((card) => rankValues[card[0]]))].sort((a, b) => a - b);
  const connected = values.some((value, index) => values[index + 3] - value <= 4);
  const paired = Object.values(rankCounts).some((count) => count > 1);
  const texture = paired ? "paired" : connected ? "connected" : "dry";

  return `${highRank}-high ${suitPattern} ${texture}`;
}

function currentBetTreeKey() {
  const keys = [...betTreeState.activeSizes]
    .map((size) => (size === "allin" ? "allin" : String(Math.round(Number(size) * 100))))
    .sort((a, b) => {
      if (a === "allin") return 1;
      if (b === "allin") return -1;
      return Number(a) - Number(b);
    });
  return `river-no-raise-${keys.join("-")}`;
}

function currentPrecomputedQuery(board) {
  return {
    board,
    board_class: boardClass(board),
    bet_tree_key: currentBetTreeKey(),
    effective_stack_bb: Number(els.stack.value || 0),
    positions: `${els.position.value} vs BB`,
    pot_bb: Number(els.pot.value || 0),
    pot_type: "SRP",
    street: "river",
  };
}

function selectedCards() {
  const hero = [...els.heroCards.querySelectorAll("select")].map((select) => select.value);
  const board = [...els.boardCards.querySelectorAll("select")].map((select) => select.value);
  return { hero, board, all: [...hero, ...board].filter(Boolean) };
}

function sync() {
  const { hero, board, all } = selectedCards();
  const duplicates = new Set();
  all.forEach((card, index) => {
    if (all.indexOf(card) !== index) duplicates.add(card);
  });

  document.querySelectorAll(".card-select option").forEach((option) => {
    if (!option.value) return;
    option.disabled = all.includes(option.value) && !option.selected;
  });

  els.potDisplay.textContent = Number(els.pot.value || 0).toFixed(0);
  els.rangeLabel.textContent = `IP ${rangeLabels[els.ipPreset.value]}`;
  renderCards(els.heroDisplay, hero.filter(Boolean), duplicates);
  renderCards(els.boardDisplay, board.filter(Boolean), duplicates);
  renderMatrix();
  renderPrecomputedReference(board.filter(Boolean));
  if (board.filter(Boolean).length !== 5) resetRiverSolver("Board 5枚で有効");
  if (board.filter(Boolean).length !== 4) resetTurnSolver("Board 4枚で有効");
  if (board.filter(Boolean).length !== 3) resetFlopSolver("Board 3枚で有効");
}

function invalidateSolverCache() {
  solverCache.clear();
  solverRequestId += 1;
  riverRequestId = solverRequestId;
  turnRequestId = solverRequestId;
}

function renderCards(container, cards, duplicates = new Set()) {
  container.innerHTML = "";
  cards.forEach((card) => {
    const node = document.createElement("div");
    node.className = `playing-card ${["h", "d"].includes(card[1]) ? "red" : ""}`;
    node.textContent = formatCard(card);
    if (duplicates.has(card)) node.style.outline = "3px solid var(--red)";
    container.appendChild(node);
  });
}

function renderMatrix() {
  const { hero } = selectedCards();
  const heroHand = hero[0] && hero[1] ? handCode(hero[0], hero[1]) : "";
  const activeRange = rangeState[rangeState.activeSide];

  els.rangeMatrix.innerHTML = "";
  let comboCount = 0;
  ranks.forEach((rowRank, row) => {
    ranks.forEach((colRank, col) => {
      const code =
        row === col
          ? `${rowRank}${colRank}`
          : row < col
            ? `${rowRank}${colRank}s`
            : `${colRank}${rowRank}o`;
      const cell = document.createElement("div");
      cell.className = "range-cell";
      const frequency = activeRange[code] || 0;
      if (frequency > 0) {
        cell.classList.add("in-range");
        cell.style.opacity = String(0.35 + frequency * 0.65);
        comboCount += comboCountFor(code) * frequency;
      }
      if (code === heroHand) cell.classList.add("hero-hand");
      cell.dataset.code = code;
      cell.innerHTML = `${code}<small>${Math.round(frequency * 100)}%</small>`;
      cell.addEventListener("click", () => cycleRangeFrequency(code));
      els.rangeMatrix.appendChild(cell);
    });
  });
  els.comboCount.textContent = `${rangeState.activeSide.toUpperCase()} ${comboCount.toFixed(0)} combos`;
}

function cycleRangeFrequency(code) {
  const range = rangeState[rangeState.activeSide];
  const current = range[code] || 0;
  const nextIndex = (rangeSteps.indexOf(current) + 1) % rangeSteps.length;
  range[code] = rangeSteps[nextIndex];
  invalidateSolverCache();
  renderMatrix();
  resetRiverSolver("Solveで再計算");
}

function toggleBetSize(size) {
  if (betTreeState.activeSizes.has(size)) {
    if (betTreeState.activeSizes.size === 1) return;
    betTreeState.activeSizes.delete(size);
  } else {
    betTreeState.activeSizes.add(size);
  }
  renderBetSizeButtons();
  resetRiverSolver("Solveで再計算");
}

function renderBetSizeButtons() {
  els.sizeButtons.forEach((button) => {
    button.classList.toggle("active", betTreeState.activeSizes.has(button.dataset.size));
  });
}

function allStartingHands() {
  const hands = [];
  ranks.forEach((first, i) => {
    ranks.forEach((second, j) => {
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
  const threshold = rangePercentile[rangeName];
  const hands = allStartingHands().sort((a, b) => b.score - a.score);
  const cutoff = Math.ceil(hands.length * threshold);
  return hands.reduce((acc, hand, index) => {
    acc[hand.code] = index < cutoff ? 1 : 0;
    return acc;
  }, {});
}

function applyPreset(side, presetName) {
  rangeState[side] = makePresetRange(presetName);
  invalidateSolverCache();
  renderMatrix();
  resetRiverSolver("Solveで再計算");
}

function setActiveRange(side) {
  rangeState.activeSide = side;
  els.oopRangeTab.classList.toggle("active", side === "oop");
  els.ipRangeTab.classList.toggle("active", side === "ip");
  renderMatrix();
}

function comboCountFor(code) {
  if (code.length === 2) return 6;
  return code.endsWith("s") ? 4 : 12;
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

function villainHandFromRange(available) {
  const candidates = choose(available, 2)
    .map((cards) => ({ cards, frequency: rangeState.ip[handCode(cards[0], cards[1])] || 0 }))
    .filter((combo) => combo.frequency > 0);
  if (!candidates.length) return choose(available, 2)[0];
  const total = candidates.reduce((sum, combo) => sum + combo.frequency, 0);
  let roll = Math.random() * total;
  for (const combo of candidates) {
    roll -= combo.frequency;
    if (roll <= 0) return combo.cards;
  }
  return candidates[candidates.length - 1].cards;
}

function simulate() {
  const { hero, board, all } = selectedCards();
  if (hero.filter(Boolean).length !== 2) {
    setReason("Hero cardsを2枚選択してください。");
    return;
  }
  if (new Set(all).size !== all.length) {
    setReason("同じカードが複数選択されています。");
    return;
  }

  const knownBoard = board.filter(Boolean);
  const samples = knownBoard.length >= 3 ? 5000 : 3500;
  let wins = 0;
  let ties = 0;
  const baseDeck = deck().filter((card) => !all.includes(card));

  for (let i = 0; i < samples; i += 1) {
    const available = shuffle(baseDeck.slice());
    const villain = villainHandFromRange(available);
    const afterVillain = available.filter((card) => !villain.includes(card));
    const runout = knownBoard.concat(afterVillain.slice(0, 5 - knownBoard.length));
    const heroValue = evaluateSeven(hero.concat(runout));
    const villainValue = evaluateSeven(villain.concat(runout));
    const result = compareHands(heroValue, villainValue);
    if (result > 0) wins += 1;
    if (result === 0) ties += 1;
  }

  const equity = (wins + ties * 0.5) / samples;
  const decision = decide(equity);
  renderDecision(equity, decision, samples);
  renderRiverSolver(board.filter(Boolean));
  renderTurnSolver(board.filter(Boolean), all);
  renderFlopSolver(board.filter(Boolean), all);
  renderPrecomputedReference(board.filter(Boolean));
}

function decide(equity) {
  const pot = Number(els.pot.value || 0);
  const toCall = Number(els.toCall.value || 0);
  const stack = Number(els.stack.value || 1);
  const betSize = Number(els.betSize.value || 1);
  const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;
  const spr = stack / Math.max(1, pot);
  const positionBonus = { BTN: 0.035, CO: 0.02, HJ: 0.005, UTG: -0.02, BB: -0.005, SB: -0.025 }[
    els.position.value
  ];
  const pressure = betSize / Math.max(1, pot);
  const adjusted = equity + positionBonus - Math.max(0, pressure - 0.75) * 0.04;
  const edge = adjusted - potOdds;

  let raise = clamp((edge - 0.13) * 2.4 + (spr < 4 ? 0.08 : 0), 0, 0.82);
  let call = clamp((edge + 0.08) * 2.1, 0, 0.9);
  if (equity > 0.62 && spr <= 6) raise = Math.max(raise, 0.42);
  if (equity < potOdds - 0.06) call *= 0.35;
  call = Math.min(call, 1 - raise);
  const fold = clamp(1 - raise - call, 0, 1);
  const total = raise + call + fold || 1;

  return {
    raise: raise / total,
    call: call / total,
    fold: fold / total,
    potOdds,
    spr,
    adjusted,
  };
}

function renderDecision(equityValue, decision, sampleCount) {
  const entries = [
    ["Raise", decision.raise],
    ["Call", decision.call],
    ["Fold", decision.fold],
  ].sort((a, b) => b[1] - a[1]);
  els.actionLabel.textContent = "Highest frequency action";
  els.actionFrequency.textContent = `${entries[0][0]} ${pct(entries[0][1])}`;
  els.equity.textContent = pct(equityValue);
  els.potOdds.textContent = pct(decision.potOdds);
  els.spr.textContent = decision.spr.toFixed(1);
  els.samples.textContent = sampleCount.toLocaleString();
  setBars(decision);
  setReason(
    `エクイティ ${pct(equityValue)}、必要勝率 ${pct(decision.potOdds)}。` +
      ` ポジションとSPRを補正したChip EV近似では ${entries[0][0]} の頻度が最も高いです。`
  );
}

function setBars(decision) {
  [
    [els.raiseBar, els.raisePct, decision.raise],
    [els.callBar, els.callPct, decision.call],
    [els.foldBar, els.foldPct, decision.fold],
  ].forEach(([bar, label, value]) => {
    bar.style.width = pct(value);
    label.textContent = pct(value);
  });
}

function setReason(message) {
  els.reasoning.textContent = message;
}

async function loadPrecomputedSpots() {
  try {
    await precomputedStore.load();
    renderPrecomputedReference(selectedCards().board.filter(Boolean));
  } catch (error) {
    resetPrecomputedReference("Reference DB unavailable");
    console.warn(error);
  }
}

function createSqlitePrecomputedStore(sourceUrl) {
  let loaded = false;
  let db = null;
  let stats = {
    loadMs: 0,
    sizeKb: 0,
    spotCount: 0,
  };

  return {
    get loaded() {
      return loaded;
    },
    get stats() {
      return stats;
    },
    async load() {
      if (loaded) return;
      if (!window.initSqlJs) throw new Error("sql.js runtime unavailable");

      const start = performance.now();
      const SQL = await window.initSqlJs({
        locateFile: (file) => `./vendor/sql.js/${file}`,
      });
      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error(`Reference DB HTTP ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      db = new SQL.Database(bytes);
      stats = {
        loadMs: Math.round(performance.now() - start),
        sizeKb: Math.round(bytes.byteLength / 1024),
        spotCount: selectPrecomputedSpotCount(db),
      };
      loaded = true;
    },
    find(query) {
      if (!db) return null;
      const spots = selectPrecomputedSpots(db);
      const ranked = spots
        .map((spot) => ({ spot, score: precomputedMatchScore(query, spot) }))
        .sort((a, b) => b.score - a.score);
      const best = ranked[0]?.spot;
      if (!best) return null;

      const reasons = precomputedMatchReasons(query, best);
      return { exact: reasons.length === 0, reasons, spot: best };
    },
  };
}

function selectPrecomputedSpotCount(db) {
  const result = db.exec("SELECT COUNT(*) AS count FROM spots");
  return result[0]?.values[0]?.[0] || 0;
}

function selectPrecomputedSpots(db) {
  const result = db.exec(`
    SELECT
      id,
      street,
      positions,
      pot_type,
      effective_stack_bb,
      pot_bb,
      board,
      board_class,
      bet_tree_key,
      solver_name,
      solver_version
    FROM spots
  `);
  if (!result.length) return [];

  return result[0].values.map((row) => {
    const spot = Object.fromEntries(result[0].columns.map((column, index) => [column, row[index]]));
    return {
      ...spot,
      board: spot.board.split(" "),
      actions: selectPrecomputedActions(db, spot.id),
    };
  });
}

function selectPrecomputedActions(db, spotId) {
  const statement = db.prepare(`
    SELECT hand_code, action, frequency, ev, equity
    FROM spot_actions
    WHERE spot_id = :spot_id
    ORDER BY ev DESC, hand_code ASC
  `);
  statement.bind({ ":spot_id": spotId });

  const actions = [];
  while (statement.step()) actions.push(statement.getAsObject());
  statement.free();
  return actions;
}

function resetPrecomputedReference(status) {
  els.precomputedStatus.textContent = status;
  els.precomputedRecord.textContent = "--";
  els.precomputedSpot.textContent = "--";
  els.precomputedSolver.textContent = "--";
  els.precomputedDbStats.textContent = "--";
  els.precomputedActions.textContent = "--";
  renderPrecomputedActionRows([]);
}

function renderPrecomputedReference(board) {
  if (!precomputedStore.loaded) {
    resetPrecomputedReference("Loading reference DB");
    return;
  }

  if (board.length !== 5) {
    resetPrecomputedReference("Board 5枚で参照");
    return;
  }

  const match = precomputedStore.find(currentPrecomputedQuery(board));
  if (!match) {
    resetPrecomputedReference("No solved spot available");
    return;
  }

  const spot = match.spot;
  els.precomputedStatus.textContent = match.exact ? "Exact precomputed spot" : `Approx: ${match.reasons.join("; ")}`;
  els.precomputedRecord.textContent = spot.id;
  els.precomputedSpot.textContent =
    `${spot.positions} / ${spot.pot_type} / ${spot.effective_stack_bb}bb / ` +
    `${spot.pot_bb}bb pot / ${spot.bet_tree_key} / ${spot.board_class}`;
  els.precomputedSolver.textContent = `${spot.solver_name} ${spot.solver_version}`;
  els.precomputedDbStats.textContent =
    `${precomputedStore.stats.spotCount} spots / ${precomputedStore.stats.sizeKb} KB / ${precomputedStore.stats.loadMs} ms`;
  els.precomputedActions.textContent = spot.actions
    .slice(0, 3)
    .map((action) => `${action.hand_code} ${action.action} ${pct(action.frequency)}`)
    .join(" / ");
  renderPrecomputedActionRows(spot.actions);
}

function renderPrecomputedActionRows(actions) {
  els.precomputedActionRows.innerHTML = "";
  actions.forEach((action) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${action.hand_code}</td>
      <td>${action.action}</td>
      <td>${pct(action.frequency)}</td>
      <td>${action.ev.toFixed(1)}</td>
      <td>${pct(action.equity)}</td>
    `;
    els.precomputedActionRows.appendChild(row);
  });
}

function precomputedMatchScore(query, spot) {
  let score = 0;
  if (spot.street === query.street) score += 40;
  if (spot.positions === query.positions) score += 30;
  if (spot.pot_type === query.pot_type) score += 20;
  if (spot.bet_tree_key === query.bet_tree_key) score += 15;
  if (boardKey(spot.board) === boardKey(query.board)) score += 100;
  else if (spot.board_class === query.board_class) score += 45;
  score -= Math.abs(spot.effective_stack_bb - query.effective_stack_bb) * 0.25;
  score -= Math.abs(spot.pot_bb - query.pot_bb) * 0.5;
  return score;
}

function precomputedMatchReasons(query, spot) {
  const reasons = [];
  if (spot.positions !== query.positions) reasons.push(`positions rounded to ${spot.positions}`);
  if (spot.pot_type !== query.pot_type) reasons.push(`pot type rounded to ${spot.pot_type}`);
  if (spot.effective_stack_bb !== query.effective_stack_bb) {
    reasons.push(`stack rounded ${query.effective_stack_bb}bb -> ${spot.effective_stack_bb}bb`);
  }
  if (spot.board_class !== query.board_class || boardKey(spot.board) !== boardKey(query.board)) {
    reasons.push(`board rounded to ${spot.board_class}`);
  }
  if (spot.bet_tree_key !== query.bet_tree_key) reasons.push(`bet tree rounded to ${spot.bet_tree_key}`);
  if (spot.pot_bb !== query.pot_bb) reasons.push(`pot rounded ${query.pot_bb}bb -> ${spot.pot_bb}bb`);
  return reasons;
}

function renderRiverSolver(board) {
  const requestId = solverRequestId + 1;
  solverRequestId = requestId;
  riverRequestId = requestId;
  void renderRiverSolverAsync(board, requestId);
}

function renderTurnSolver(board, deadCards) {
  const requestId = solverRequestId + 1;
  solverRequestId = requestId;
  turnRequestId = requestId;
  void renderTurnSolverAsync(board, deadCards, requestId);
}

function renderFlopSolver(board, deadCards) {
  if (board.length !== 3) {
    resetFlopSolver("Board 3枚で有効");
    return;
  }

  const oopScore = flopRangeScore(rangeState.oop, board);
  const ipScore = flopRangeScore(rangeState.ip, board);
  const turnCards = flopTurnCards(deadCards, solverSettings.flopTurnLimit);
  const turnRows = turnCards.map((turnCard) => {
    const turnBoard = board.concat(turnCard);
    const turnOopScore = flopRangeScore(rangeState.oop, turnBoard);
    const turnIpScore = flopRangeScore(rangeState.ip, turnBoard);
    return {
      advantage: rangeAdvantageLabel(turnOopScore, turnIpScore),
      ipScore: turnIpScore,
      oopScore: turnOopScore,
      texture: turnBoardTexture(turnBoard),
      turnCard,
    };
  });

  els.flopStatus.textContent = `${turnCards.length} turn samples / ${solverSettings.flopComboLimit} combo cap`;
  els.flopTexture.textContent = flopBoardTexture(board);
  els.flopOopScore.textContent = oopScore.toFixed(2);
  els.flopIpScore.textContent = ipScore.toFixed(2);
  els.flopRangeAdvantage.textContent = rangeAdvantageLabel(oopScore, ipScore);
  els.flopTurnSamples.textContent = String(turnCards.length);
  els.flopAccuracy.textContent = `Lite: texture scan, ${solverSettings.flopTurnLimit} turn cap, ${solverSettings.flopComboLimit} combo cap`;
  renderFlopTurnRows(turnRows);
}

async function renderRiverSolverAsync(board, requestId) {
  if (board.length !== 5) {
    resetRiverSolver("Board 5枚で有効");
    return;
  }

  const pot = Number(els.pot.value || 0);
  const stack = Number(els.stack.value || 0);
  els.riverStatus.textContent = "Calculating...";

  let solved;
  try {
    solved = await solveRiverCandidates({
      board,
      pot,
      stack,
    });
  } catch (error) {
    if (requestId !== riverRequestId) return;
    console.error(error);
    resetRiverSolver("Solver error");
    return;
  }

  if (requestId !== riverRequestId) return;

  const { results, cacheHits } = solved;

  if (!results.length) {
    resetRiverSolver("レンジ不足");
    return;
  }

  const best = results.slice().sort((a, b) => b.result.oopEv - a.result.oopEv)[0];
  const result = best.result;
  els.riverStatus.textContent = `${result.oopCombos} OOP combos / ${result.ipCombos} IP combos / ${cacheHits} cached`;
  els.oopBetFreq.textContent = pct(result.oopBet);
  els.oopCheckFreq.textContent = pct(1 - result.oopBet);
  els.ipCallFreq.textContent = pct(result.ipCall);
  els.ipProbeFreq.textContent = pct(result.ipProbe);
  els.oopCallFreq.textContent = pct(result.oopCall);
  els.riverEv.textContent = result.oopEv.toFixed(1);
  renderSizeResults(results, best.label);
}

async function renderTurnSolverAsync(board, deadCards, requestId) {
  if (board.length !== 4) {
    resetTurnSolver("Board 4枚で有効");
    return;
  }

  const pot = Number(els.pot.value || 0);
  const stack = Number(els.stack.value || 0);
  const start = performance.now();
  els.turnStatus.textContent = "Calculating runouts...";

  let solved;
  try {
    solved = await solveTurnRunouts({
      board,
      deadCards,
      pot,
      stack,
    });
  } catch (error) {
    if (requestId !== turnRequestId) return;
    console.error(error);
    resetTurnSolver("Solver error");
    return;
  }

  if (requestId !== turnRequestId) return;

  const { results, cacheHits, runoutCount } = solved;
  if (!results.length) {
    resetTurnSolver("レンジ不足");
    return;
  }

  const average = averageTurnResults(results);
  const best = results.slice().sort((a, b) => b.result.oopEv - a.result.oopEv)[0];
  const elapsedMs = Math.round(performance.now() - start);
  els.turnStatus.textContent =
    `${runoutCount} runouts / ${solverSettings.iterations} iterations / ` +
    `${solverSettings.turnComboLimit} combo cap / ${elapsedMs} ms / ${cacheHits} cached`;
  els.turnRunouts.textContent = String(runoutCount);
  els.turnOopBetFreq.textContent = pct(average.oopBet);
  els.turnOopCheckFreq.textContent = pct(1 - average.oopBet);
  els.turnIpCallFreq.textContent = pct(average.ipCall);
  els.turnIpProbeFreq.textContent = pct(average.ipProbe);
  els.turnOopCallFreq.textContent = pct(average.oopCall);
  els.turnEv.textContent = average.oopEv.toFixed(1);
  els.turnBestRiver.textContent = formatCard(best.riverCard);
  els.turnRangeCap.textContent = `${solverSettings.turnComboLimit} combos`;
  els.turnSolverSettings.textContent =
    `${solverSettings.iterations} iter / ${solverSettings.turnRunoutLimit} runouts / ` +
    `${solverSettings.turnComboLimit} combos`;
  els.turnCalcTime.textContent = `${elapsedMs} ms`;
  els.turnAccuracy.textContent = `Lite: ${runoutCount}/${solverSettings.turnRunoutLimit} runouts, ${solverSettings.turnComboLimit} combo cap`;
  renderTurnRunoutRows(results);
}

function createRiverWorker() {
  if (!("Worker" in window)) return null;

  try {
    const worker = new Worker("./solver.worker.js");
    worker.onmessage = (event) => {
      const { id, type, results, cacheHits, runoutCount, message } = event.data || {};
      const pending = pendingRiverSolves.get(id);
      if (!pending) return;

      pendingRiverSolves.delete(id);
      if (type === "river-error") {
        pending.reject(new Error(message || "Worker solver failed"));
        return;
      }

      pending.resolve({ results, cacheHits, runoutCount });
    };
    worker.onerror = (error) => {
      pendingRiverSolves.forEach(({ reject }) => reject(error));
      pendingRiverSolves.clear();
    };
    return worker;
  } catch (error) {
    console.warn("River solver worker unavailable; falling back to main thread.", error);
    return null;
  }
}

function solveRiverCandidates({ board, pot, stack }) {
  const payload = {
    board,
    pot,
    candidates: selectedBetSizes(pot, stack),
    oopRange: rangeState.oop,
    ipRange: rangeState.ip,
    iterations: solverSettings.iterations,
    comboLimit: solverSettings.comboLimit,
    version: solverSettings.version,
  };

  if (riverWorker) return solveRiverCandidatesWithWorker(payload);
  return Promise.resolve(solveRiverCandidatesLocally(payload));
}

function solveTurnRunouts({ board, deadCards, pot, stack }) {
  const payload = {
    board,
    pot,
    candidates: selectedBetSizes(pot, stack),
    deadCards,
    oopRange: rangeState.oop,
    ipRange: rangeState.ip,
    iterations: solverSettings.iterations,
    comboLimit: solverSettings.turnComboLimit,
    runoutLimit: solverSettings.turnRunoutLimit,
    version: solverSettings.version,
  };

  if (riverWorker) return solveTurnRunoutsWithWorker(payload);
  return Promise.resolve(solveTurnRunoutsLocally(payload));
}

function solveRiverCandidatesWithWorker(payload) {
  const id = riverRequestId;
  return new Promise((resolve, reject) => {
    pendingRiverSolves.set(id, { resolve, reject });
    riverWorker.postMessage({ id, payload, type: "solve-river" });
  });
}

function solveTurnRunoutsWithWorker(payload) {
  const id = turnRequestId;
  return new Promise((resolve, reject) => {
    pendingRiverSolves.set(id, { resolve, reject });
    riverWorker.postMessage({ id, payload, type: "solve-turn" });
  });
}

function solveRiverCandidatesLocally(payload) {
  let cacheHits = 0;
  const results = payload.candidates
    .map((candidate) => {
      const solved = solveRiverSpotCached({
        board: payload.board,
        pot: payload.pot,
        betSize: candidate.amount,
        ipRange: payload.ipRange,
        iterations: payload.iterations,
        oopRange: payload.oopRange,
        comboLimit: payload.comboLimit,
        version: payload.version,
      });
      if (solved.cacheHit) cacheHits += 1;
      return { ...candidate, result: solved.result };
    })
    .filter((candidate) => candidate.result);

  return { results, cacheHits };
}

function solveTurnRunoutsLocally(payload) {
  let cacheHits = 0;
  const runouts = turnRunoutCards(payload.deadCards, payload.runoutLimit);
  const results = [];

  runouts.forEach((riverCard) => {
    const riverBoard = payload.board.concat(riverCard);
    const best = payload.candidates
      .map((candidate) => {
        const solved = solveRiverSpotCached({
          board: riverBoard,
          pot: payload.pot,
          betSize: candidate.amount,
          ipRange: payload.ipRange,
          iterations: payload.iterations,
          oopRange: payload.oopRange,
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

function solveRiverSpotCached(input) {
  const key = solverCacheKey(input);
  if (solverCache.has(key)) return { result: solverCache.get(key), cacheHit: true };
  const result = solveRiverSpot(input);
  if (result) solverCache.set(key, result);
  return { result, cacheHit: false };
}

function solverCacheKey({
  board,
  pot,
  betSize,
  iterations = solverSettings.iterations,
  comboLimit = solverSettings.comboLimit,
  version = solverSettings.version,
  oopRange = rangeState.oop,
  ipRange = rangeState.ip,
}) {
  return JSON.stringify({
    version,
    board: board.slice().sort(),
    pot,
    betSize,
    iterations,
    comboLimit,
    oop: compactRangeKey(oopRange),
    ip: compactRangeKey(ipRange),
  });
}

function compactRangeKey(range) {
  return Object.keys(range)
    .sort()
    .filter((code) => range[code] > 0)
    .map((code) => `${code}:${range[code]}`)
    .join(",");
}

function resetRiverSolver(status) {
  els.riverStatus.textContent = status;
  [els.oopBetFreq, els.oopCheckFreq, els.ipCallFreq, els.ipProbeFreq, els.oopCallFreq, els.riverEv].forEach(
    (el) => {
      el.textContent = "--";
    }
  );
  els.sizeResults.innerHTML = "";
}

function resetTurnSolver(status) {
  els.turnStatus.textContent = status;
  [
    els.turnRunouts,
    els.turnOopBetFreq,
    els.turnOopCheckFreq,
    els.turnIpCallFreq,
    els.turnIpProbeFreq,
    els.turnOopCallFreq,
    els.turnEv,
    els.turnBestRiver,
    els.turnRangeCap,
    els.turnSolverSettings,
    els.turnCalcTime,
    els.turnAccuracy,
  ].forEach((el) => {
    el.textContent = "--";
  });
  els.turnRunoutRows.innerHTML = "";
}

function resetFlopSolver(status) {
  els.flopStatus.textContent = status;
  [
    els.flopTexture,
    els.flopOopScore,
    els.flopIpScore,
    els.flopRangeAdvantage,
    els.flopTurnSamples,
    els.flopAccuracy,
  ].forEach((el) => {
    el.textContent = "--";
  });
  els.flopTurnRows.innerHTML = "";
}

function turnRunoutCards(deadCards, limit) {
  const blocked = new Set(deadCards.filter(Boolean));
  return deck()
    .filter((card) => !blocked.has(card))
    .slice(0, limit);
}

function flopTurnCards(deadCards, limit) {
  return turnRunoutCards(deadCards, limit);
}

function selectedBetSizes(pot, stack) {
  return [...betTreeState.activeSizes]
    .map((size) => {
      if (size === "allin") return { key: size, label: "All-in", amount: Math.max(1, stack) };
      const ratio = Number(size);
      return {
        key: size,
        label: `${Math.round(ratio * 100)}% pot`,
        amount: Math.max(1, pot * ratio),
      };
    })
    .sort((a, b) => a.amount - b.amount);
}

function renderSizeResults(results, bestLabel) {
  els.sizeResults.innerHTML = "";
  results.forEach(({ label, result }) => {
    const row = document.createElement("tr");
    if (label === bestLabel) row.classList.add("best-size");
    row.innerHTML = `
      <td>${label}</td>
      <td>${pct(result.oopBet)}</td>
      <td>${pct(result.ipCall)}</td>
      <td>${result.oopEv.toFixed(1)}</td>
    `;
    els.sizeResults.appendChild(row);
  });
}

function averageTurnResults(results) {
  const total = results.length || 1;
  return results.reduce(
    (acc, { result }) => ({
      ipCall: acc.ipCall + result.ipCall / total,
      ipProbe: acc.ipProbe + result.ipProbe / total,
      oopCall: acc.oopCall + result.oopCall / total,
      oopBet: acc.oopBet + result.oopBet / total,
      oopEv: acc.oopEv + result.oopEv / total,
    }),
    { ipCall: 0, ipProbe: 0, oopCall: 0, oopBet: 0, oopEv: 0 }
  );
}

function renderTurnRunoutRows(results) {
  els.turnRunoutRows.innerHTML = "";
  results.forEach(({ riverCard, result }) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatCard(riverCard)}</td>
      <td>${pct(result.oopBet)}</td>
      <td>${pct(1 - result.oopBet)}</td>
      <td>${pct(result.ipCall)}</td>
      <td>${pct(result.ipProbe)}</td>
      <td>${pct(result.oopCall)}</td>
      <td>${result.oopEv.toFixed(1)}</td>
    `;
    els.turnRunoutRows.appendChild(row);
  });
}

function flopBoardTexture(board) {
  return boardTexture(board);
}

function turnBoardTexture(board) {
  return boardTexture(board);
}

function boardTexture(board) {
  const ranksOnBoard = board.map((card) => card[0]);
  const values = [...new Set(ranksOnBoard.map((rank) => rankValues[rank]))].sort((a, b) => a - b);
  const rankCounts = countBy(ranksOnBoard);
  const suitCounts = countBy(board.map((card) => card[1]));
  const highRank = ranksOnBoard.sort((a, b) => rankValues[b] - rankValues[a])[0];
  const paired = Object.values(rankCounts).some((count) => count > 1);
  const connected = values.length >= 3 && values.some((value, index) => index + 2 < values.length && values[index + 2] - value <= 4);
  const suitPattern = Object.keys(suitCounts).length === 1 ? "monotone" : Math.max(...Object.values(suitCounts)) >= 2 ? "two-tone" : "rainbow";
  const texture = paired ? "paired" : connected ? "connected" : "dry";
  return `${highRank}-high ${suitPattern} ${texture}`;
}

function flopRangeScore(range, board) {
  const combos = rangeCombos(range, board, solverSettings.flopComboLimit);
  const totalWeight = combos.reduce((sum, combo) => sum + combo.frequency, 0) || 1;
  const total = combos.reduce((sum, combo) => {
    const madeHand = evaluateKnownCards(combo.cards.concat(board))[0];
    return sum + (madeHand + 1) * combo.frequency;
  }, 0);
  return total / totalWeight;
}

function evaluateKnownCards(cards) {
  if (cards.length >= 6) return evaluateSeven(cards);
  return evaluateFive(cards);
}

function rangeAdvantageLabel(oopScore, ipScore) {
  const diff = oopScore - ipScore;
  if (Math.abs(diff) < 0.08) return "Neutral";
  return diff > 0 ? "OOP" : "IP";
}

function renderFlopTurnRows(rows) {
  els.flopTurnRows.innerHTML = "";
  rows.forEach((rowResult) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatCard(rowResult.turnCard)}</td>
      <td>${rowResult.texture}</td>
      <td>${rowResult.oopScore.toFixed(2)}</td>
      <td>${rowResult.ipScore.toFixed(2)}</td>
      <td>${rowResult.advantage}</td>
    `;
    els.flopTurnRows.appendChild(row);
  });
}

function solveRiverSpot({
  board,
  pot,
  betSize,
  oopRange = rangeState.oop,
  ipRange = rangeState.ip,
  iterations = solverSettings.iterations,
  comboLimit = solverSettings.comboLimit,
}) {
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

function rangeCombos(range, board, comboLimit = solverSettings.comboLimit) {
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

function pct(value) {
  return `${Math.round(value * 100)}%`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function randomDeal() {
  const cards = shuffle(deck());
  const selects = [...els.heroCards.querySelectorAll("select"), ...els.boardCards.querySelectorAll("select")];
  selects.forEach((select, index) => {
    select.value = cards[index];
  });
  sync();
}

function clearCards() {
  document.querySelectorAll(".card-select").forEach((select) => {
    select.value = "";
  });
  sync();
}

function init() {
  for (let i = 0; i < 2; i += 1) els.heroCards.appendChild(makeCardSelect(`hero-${i}`));
  for (let i = 0; i < 5; i += 1) els.boardCards.appendChild(makeCardSelect(`board-${i}`));
  [els.position, els.villainRange, els.pot, els.toCall, els.stack, els.betSize].forEach((el) => {
    el.addEventListener("input", () => {
      invalidateSolverCache();
      sync();
    });
    el.addEventListener("change", () => {
      invalidateSolverCache();
      sync();
    });
  });
  els.oopRangeTab.addEventListener("click", () => setActiveRange("oop"));
  els.ipRangeTab.addEventListener("click", () => setActiveRange("ip"));
  els.oopPreset.addEventListener("change", () => applyPreset("oop", els.oopPreset.value));
  els.ipPreset.addEventListener("change", () => {
    applyPreset("ip", els.ipPreset.value);
    els.villainRange.value = els.ipPreset.value;
    sync();
  });
  els.villainRange.addEventListener("change", () => {
    els.ipPreset.value = els.villainRange.value;
    applyPreset("ip", els.villainRange.value);
  });
  els.sizeButtons.forEach((button) => {
    button.addEventListener("click", () => toggleBetSize(button.dataset.size));
  });
  els.runSimulation.addEventListener("click", simulate);
  els.randomDeal.addEventListener("click", randomDeal);
  els.clearCards.addEventListener("click", clearCards);
  rangeState.oop = makePresetRange(els.oopPreset.value);
  rangeState.ip = makePresetRange(els.ipPreset.value);
  renderBetSizeButtons();
  void loadPrecomputedSpots();
  sync();
}

init();
