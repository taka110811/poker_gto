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
  runSimulation: document.querySelector("#runSimulation"),
  randomDeal: document.querySelector("#randomDeal"),
  clearCards: document.querySelector("#clearCards"),
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
  select.addEventListener("change", sync);
  return select;
}

function formatCard(card) {
  if (!card) return "";
  return `${card[0]}${suitSymbols[card[1]]}`;
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
  els.rangeLabel.textContent = rangeLabels[els.villainRange.value];
  renderCards(els.heroDisplay, hero.filter(Boolean), duplicates);
  renderCards(els.boardDisplay, board.filter(Boolean), duplicates);
  renderMatrix();
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
  const threshold = rangePercentile[els.villainRange.value];
  const { hero } = selectedCards();
  const heroHand = hero[0] && hero[1] ? handCode(hero[0], hero[1]) : "";
  const hands = allStartingHands().sort((a, b) => b.score - a.score);
  const cutoff = Math.ceil(hands.length * threshold);
  const inRange = new Set(hands.slice(0, cutoff).map((hand) => hand.code));

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
      if (inRange.has(code)) {
        cell.classList.add("in-range");
        comboCount += comboCountFor(code);
      }
      if (code === heroHand) cell.classList.add("hero-hand");
      cell.textContent = code;
      els.rangeMatrix.appendChild(cell);
    });
  });
  els.comboCount.textContent = `${comboCount} combos`;
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
  const threshold = rangePercentile[els.villainRange.value];
  const hands = allStartingHands().sort((a, b) => b.score - a.score);
  const allowed = new Set(hands.slice(0, Math.ceil(hands.length * threshold)).map((hand) => hand.code));
  const candidates = choose(available, 2).filter(([a, b]) => allowed.has(handCode(a, b)));
  return candidates[Math.floor(Math.random() * candidates.length)] || choose(available, 2)[0];
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
  els.actionLabel.textContent = "Recommended action";
  els.actionFrequency.textContent = `${entries[0][0]} ${pct(entries[0][1])}`;
  els.equity.textContent = pct(equityValue);
  els.potOdds.textContent = pct(decision.potOdds);
  els.spr.textContent = decision.spr.toFixed(1);
  els.samples.textContent = sampleCount.toLocaleString();
  setBars(decision);
  setReason(
    `エクイティ ${pct(equityValue)}、必要勝率 ${pct(decision.potOdds)}。` +
      ` ポジションとSPRを補正した近似値では ${entries[0][0]} の頻度が最も高いです。`
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
    select.value = index < 5 ? cards[index] : "";
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
    el.addEventListener("input", sync);
    el.addEventListener("change", sync);
  });
  els.runSimulation.addEventListener("click", simulate);
  els.randomDeal.addEventListener("click", randomDeal);
  els.clearCards.addEventListener("click", clearCards);
  sync();
}

init();
