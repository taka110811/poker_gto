const {
  RANKS: ranks,
  RANK_VALUES: rankValues,
  activeStreetKey,
  boardClass,
  boardTexture,
  deck,
  formatCard,
  riverRunoutCategory,
  setupStatusLabel,
  streetLabel,
} = window.PokerGtoCards;
const {
  RANGE_LABELS: rangeLabels,
  handCode,
  makePresetRange,
  rangeSummary,
  rangeCombos,
} = window.PokerGtoRanges;
const { betTreeKey, precomputedQuery } = window.PokerGtoSpots;
let spotPresets = {};
let preflopSpots = {};
const rangeState = {
  activeSide: "oop",
  editorOpen: false,
  oop: {},
  ip: {},
  painting: false,
  selectedFrequency: 1,
};
const betTreeState = {
  activeSizes: new Set(["0.33", "0.75"]),
};
const solveHistory = [];
const solverSettings = {
  iterations: new URLSearchParams(window.location.search).get("testMode") === "1" ? 6 : 30,
  comboLimit: 40,
  turnComboLimit: 16,
  turnRunoutLimit: new URLSearchParams(window.location.search).get("testMode") === "1" ? 4 : 8,
  flopComboLimit: 24,
  flopTurnLimit: new URLSearchParams(window.location.search).get("testMode") === "1" ? 4 : 8,
  version: "river-v1",
};
const solverCache = window.PokerGtoSolverCache.createSolverCache(solveRiverSpot);
const solverClient = window.PokerGtoSolverClient.createSolverClient({
  localRiverCandidates: solveRiverCandidatesLocally,
  localTurnRunouts: solveTurnRunoutsLocally,
  workerUrl: "./solver.worker.js",
});
const precomputedStore = window.PokerGtoPrecomputedStore.createSqlitePrecomputedStore("./data/precomputed_spots.sqlite");
let riverRequestId = 0;
let turnRequestId = 0;
let solverRequestId = 0;
const streetPanelState = {
  collapsed: {
    flop: false,
    turn: false,
    river: false,
  },
};

const els = {
  spotPreset: document.querySelector("#spotPreset"),
  preflopSpot: document.querySelector("#preflopSpot"),
  preflopSpotCount: document.querySelector("#preflopSpotCount"),
  preflopSpotCards: document.querySelector("#preflopSpotCards"),
  preflopSpotStatus: document.querySelector("#preflopSpotStatus"),
  spotBrowserCount: document.querySelector("#spotBrowserCount"),
  spotCards: document.querySelector("#spotCards"),
  spotStreetFilter: document.querySelector("#spotStreetFilter"),
  spotTextureFilter: document.querySelector("#spotTextureFilter"),
  practicePosition: document.querySelector("#practicePosition"),
  practiceHand: document.querySelector("#practiceHand"),
  practiceBoard: document.querySelector("#practiceBoard"),
  practicePot: document.querySelector("#practicePot"),
  practiceFacingAmount: document.querySelector("#practiceFacingAmount"),
  practiceStack: document.querySelector("#practiceStack"),
  applyPracticeSpot: document.querySelector("#applyPracticeSpot"),
  practiceApplyStatus: document.querySelector("#practiceApplyStatus"),
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
  setupStatus: document.querySelector("#setupStatus"),
  streetSummary: document.querySelector("#streetSummary"),
  setupOopRangeSummary: document.querySelector("#setupOopRangeSummary"),
  setupIpRangeSummary: document.querySelector("#setupIpRangeSummary"),
  setupRangeStatus: document.querySelector("#setupRangeStatus"),
  resultsTabs: document.querySelectorAll("[data-results-tab]"),
  streetToggles: document.querySelectorAll("[data-street-toggle]"),
  rangeMatrix: document.querySelector("#rangeMatrix"),
  comboCount: document.querySelector("#comboCount"),
  rangeEditor: document.querySelector("#rangeEditor"),
  rangeFeedback: document.querySelector("#rangeFeedback"),
  rangeSummary: document.querySelector("#rangeSummary"),
  rangeComboDetail: document.querySelector("#rangeComboDetail"),
  rangeActiveHands: document.querySelector("#rangeActiveHands"),
  rangeAverageFreq: document.querySelector("#rangeAverageFreq"),
  rangeFrequencyButtons: document.querySelectorAll(".frequency-button"),
  toggleRangeEditor: document.querySelector("#toggleRangeEditor"),
  oopRangeTab: document.querySelector("#oopRangeTab"),
  ipRangeTab: document.querySelector("#ipRangeTab"),
  oopPreset: document.querySelector("#oopPreset"),
  ipPreset: document.querySelector("#ipPreset"),
  actionLabel: document.querySelector("#actionLabel"),
  actionFrequency: document.querySelector("#actionFrequency"),
  practiceDecisionLabel: document.querySelector("#practiceDecisionLabel"),
  practiceDecision: document.querySelector("#practiceDecision"),
  practiceEquity: document.querySelector("#practiceEquity"),
  practicePotOdds: document.querySelector("#practicePotOdds"),
  practiceSpr: document.querySelector("#practiceSpr"),
  practiceSource: document.querySelector("#practiceSource"),
  practiceNote: document.querySelector("#practiceNote"),
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
  clearSolveHistory: document.querySelector("#clearSolveHistory"),
  solveHistoryCount: document.querySelector("#solveHistoryCount"),
  solveHistoryEmpty: document.querySelector("#solveHistoryEmpty"),
  solveHistoryList: document.querySelector("#solveHistoryList"),
  riverStatus: document.querySelector("#riverStatus"),
  oopBetFreq: document.querySelector("#oopBetFreq"),
  oopCheckFreq: document.querySelector("#oopCheckFreq"),
  ipCallFreq: document.querySelector("#ipCallFreq"),
  ipProbeFreq: document.querySelector("#ipProbeFreq"),
  oopCallFreq: document.querySelector("#oopCallFreq"),
  riverEv: document.querySelector("#riverEv"),
  betTreeKey: document.querySelector("#betTreeKey"),
  betTreeSelected: document.querySelector("#betTreeSelected"),
  betTreeAmounts: document.querySelector("#betTreeAmounts"),
  turnStatus: document.querySelector("#turnStatus"),
  turnRunouts: document.querySelector("#turnRunouts"),
  turnOopBetFreq: document.querySelector("#turnOopBetFreq"),
  turnOopCheckFreq: document.querySelector("#turnOopCheckFreq"),
  turnIpCallFreq: document.querySelector("#turnIpCallFreq"),
  turnIpProbeFreq: document.querySelector("#turnIpProbeFreq"),
  turnOopCallFreq: document.querySelector("#turnOopCallFreq"),
  turnEv: document.querySelector("#turnEv"),
  turnBestRiver: document.querySelector("#turnBestRiver"),
  turnWorstRiver: document.querySelector("#turnWorstRiver"),
  turnVolatility: document.querySelector("#turnVolatility"),
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
  flopOopCbet: document.querySelector("#flopOopCbet"),
  flopOopCheck: document.querySelector("#flopOopCheck"),
  flopIpContinue: document.querySelector("#flopIpContinue"),
  flopRunoutVolatility: document.querySelector("#flopRunoutVolatility"),
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

const spotBrowser = window.PokerGtoSpotBrowser.createSpotBrowser({
  select: els.spotPreset,
  count: els.spotBrowserCount,
  cards: els.spotCards,
  streetFilter: els.spotStreetFilter,
  textureFilter: els.spotTextureFilter,
  onSelect: applySpotPreset,
});

function makeCardSelect(id) {
  const select = document.createElement("select");
  select.id = id;
  select.className = "card-select";
  select.innerHTML = `<option value="">--</option>${deck()
    .map((card) => `<option value="${card}">${formatCard(card)}</option>`)
    .join("")}`;
  select.addEventListener("change", () => {
    els.spotPreset.value = "";
    updateSpotCards();
    invalidateSolverCache();
    sync();
  });
  return select;
}

function currentPrecomputedQuery(board) {
  return precomputedQuery({
    activeSizes: betTreeState.activeSizes,
    board,
    boardClass: boardClass(board),
    position: els.position.value,
    pot: els.pot.value,
    stack: els.stack.value,
  });
}

function selectedCards() {
  const hero = [...els.heroCards.querySelectorAll("select")].map((select) => select.value);
  const board = [...els.boardCards.querySelectorAll("select")].map((select) => select.value);
  return { hero, board, all: [...hero, ...board].filter(Boolean) };
}

function sync() {
  const { hero, board, all } = selectedCards();
  const knownBoard = board.filter(Boolean);
  const duplicates = new Set();
  all.forEach((card, index) => {
    if (all.indexOf(card) !== index) duplicates.add(card);
  });

  document.querySelectorAll(".card-select option").forEach((option) => {
    if (!option.value) return;
    option.disabled = all.includes(option.value) && !option.selected;
  });

  els.potDisplay.textContent = Number(els.pot.value || 0).toFixed(0);
  els.streetSummary.textContent = streetLabel(knownBoard.length);
  els.setupStatus.textContent = setupStatusLabel(hero, knownBoard, duplicates);
  els.rangeLabel.textContent = `IP ${rangeLabels[els.ipPreset.value]}`;
  renderCards(els.heroDisplay, hero.filter(Boolean), duplicates);
  renderCards(els.boardDisplay, knownBoard, duplicates);
  renderMatrix();
  renderPrecomputedReference(knownBoard);
  if (knownBoard.length !== 5) resetRiverSolver("Board 5枚で有効");
  if (knownBoard.length !== 4) resetTurnSolver("Board 4枚で有効");
  if (knownBoard.length !== 3) resetFlopSolver("Board 3枚で有効");
  updateStreetPanels(knownBoard.length);
}

function updateStreetPanels(boardCount) {
  const activeStreet = activeStreetKey(boardCount);
  document.querySelectorAll("[data-street-panel]").forEach((panel) => {
    const active = panel.dataset.streetPanel === activeStreet;
    if (active) streetPanelState.collapsed[panel.dataset.streetPanel] = false;
    panel.classList.toggle("is-active", active);
    panel.classList.toggle("is-inactive", !active);
    panel.classList.toggle("is-collapsed", streetPanelState.collapsed[panel.dataset.streetPanel]);
  });
  document.querySelectorAll(".view-nav a").forEach((link) => {
    const target = link.getAttribute("href") || "";
    const active =
      (activeStreet === "flop" && target === "#flopPanel") ||
      (activeStreet === "turn" && target === "#turnPanel") ||
      (activeStreet === "river" && target === "#riverPanel");
    link.classList.toggle("active", active);
  });
  updateResultsTabs(activeStreet);
  renderStreetPanelToggles();
}

function updateResultsTabs(activeStreet) {
  const activeTab = activeStreet || "overview";
  els.resultsTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.resultsTab === activeTab);
  });
}

function setStreetPanelCollapsed(street, collapsed) {
  if (!streetPanelState.collapsed.hasOwnProperty(street)) return;
  streetPanelState.collapsed[street] = collapsed;
  const panel = document.querySelector(`[data-street-panel="${street}"]`);
  if (panel) panel.classList.toggle("is-collapsed", collapsed);
  renderStreetPanelToggles();
}

function renderStreetPanelToggles() {
  els.streetToggles.forEach((button) => {
    const street = button.dataset.streetToggle;
    const collapsed = streetPanelState.collapsed[street];
    button.textContent = collapsed ? "Expand" : "Collapse";
    button.setAttribute("aria-expanded", String(!collapsed));
  });
}

function expandStreetPanel(street) {
  if (street) setStreetPanelCollapsed(street, false);
}

function updateSpotCards() {
  spotBrowser.updateActive(els.spotPreset.value);
}

async function loadSpotPresets() {
  try {
    spotPresets = await window.PokerGtoSpotPresets.loadSpotPresets("./data/spot_presets.json");
    spotBrowser.setPresets(spotPresets);
  } catch (error) {
    console.error(error);
    setRangeFeedback("Spot presets unavailable");
  }
}

async function loadPreflopSpots() {
  try {
    preflopSpots = await window.PokerGtoPreflopSpots.loadPreflopSpots("./data/preflop_spots.json");
    renderPreflopSpots();
  } catch (error) {
    console.error(error);
    els.preflopSpotStatus.textContent = "Preflop setups unavailable";
  }
}

function renderPreflopSpots() {
  const entries = Object.entries(preflopSpots);
  els.preflopSpot.innerHTML = '<option value="">Custom preflop setup</option>';
  els.preflopSpotCards.innerHTML = "";
  els.preflopSpotCount.textContent = `${entries.length} setups`;

  entries.forEach(([key, spot]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = spot.name;
    els.preflopSpot.appendChild(option);

    const button = document.createElement("button");
    button.className = "spot-card";
    button.type = "button";
    button.dataset.preflopSpot = key;
    button.innerHTML = `
      <span>Preflop</span>
      <strong>${spot.spot}</strong>
      <small>${spot.note}</small>
      <b>${spot.stack}bb stack / ${spot.pot}bb pot</b>
    `;
    button.addEventListener("click", () => {
      els.preflopSpot.value = key;
      applyPreflopSpot(key);
    });
    els.preflopSpotCards.appendChild(button);
  });
  updatePreflopSpotCards();
}

function updatePreflopSpotCards() {
  els.preflopSpotCards.querySelectorAll(".spot-card").forEach((button) => {
    button.classList.toggle("active", button.dataset.preflopSpot === els.preflopSpot.value);
  });
  if (!els.preflopSpot.value) {
    els.preflopSpotStatus.textContent = "代表的なプリフロップspotから入力だけを反映します。";
  }
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
      if (code === heroHand) cell.classList.add("hero-hand");
      cell.dataset.code = code;
      updateRangeCell(cell, code, frequency);
      cell.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        rangeState.painting = true;
        paintRangeFrequency(code, { cell });
      });
      cell.addEventListener("pointerenter", () => {
        if (rangeState.painting) paintRangeFrequency(code, { cell, quiet: true });
      });
      els.rangeMatrix.appendChild(cell);
    });
  });
  renderRangeSummary(activeRange);
}

function updateRangeCell(cell, code, frequency) {
  cell.classList.remove("in-range", "freq-0", "freq-25", "freq-50", "freq-75", "freq-100");
  cell.classList.add(`freq-${Math.round(frequency * 100)}`);
  cell.style.opacity = "";
  if (frequency > 0) {
    cell.classList.add("in-range");
    cell.style.opacity = String(0.35 + frequency * 0.65);
  }
  cell.setAttribute("aria-label", `${code} ${Math.round(frequency * 100)}%`);
  cell.title = `${code}: ${Math.round(frequency * 100)}%`;
  cell.innerHTML = `${code}<small>${Math.round(frequency * 100)}%</small>`;
}

function renderRangeSummary(activeRange) {
  const sideLabel = rangeState.activeSide.toUpperCase();
  const summary = rangeSummary(activeRange);
  els.comboCount.textContent = `${sideLabel} ${summary.combos.toFixed(0)} combos`;
  els.rangeSummary.textContent = `${sideLabel} Range / ${summary.activeHands} hands`;
  els.rangeComboDetail.textContent = summary.combos.toFixed(0);
  els.rangeActiveHands.textContent = String(summary.activeHands);
  els.rangeAverageFreq.textContent = pct(summary.averageFrequency);
  renderSetupRangeSummary();
}

function setupRangeLine(side, presetKey) {
  const summary = rangeSummary(rangeState[side]);
  return `${rangeLabels[presetKey]} / ${summary.activeHands} hands / ${summary.combos.toFixed(0)} combos`;
}

function renderSetupRangeSummary() {
  els.setupOopRangeSummary.textContent = setupRangeLine("oop", els.oopPreset.value);
  els.setupIpRangeSummary.textContent = setupRangeLine("ip", els.ipPreset.value);
}

function paintRangeFrequency(code, options = {}) {
  const range = rangeState[rangeState.activeSide];
  const frequency = rangeState.selectedFrequency;
  if ((range[code] || 0) === frequency) return;
  range[code] = frequency;
  invalidateSolverCache();
  if (options.cell) updateRangeCell(options.cell, code, frequency);
  renderRangeSummary(range);
  if (!options.quiet) {
    setRangeFeedback(`${rangeState.activeSide.toUpperCase()} ${code} を ${Math.round(frequency * 100)}% に変更`);
  }
  resetRiverSolver("Solveで再計算");
}

function setRangeFrequency(frequency) {
  rangeState.selectedFrequency = frequency;
  renderRangeFrequencyPalette();
  setRangeFeedback(`${rangeState.activeSide.toUpperCase()} ${Math.round(frequency * 100)}% を選択`);
}

function renderRangeFrequencyPalette() {
  els.rangeFrequencyButtons.forEach((button) => {
    const frequency = Number(button.dataset.frequency);
    button.classList.toggle("active", frequency === rangeState.selectedFrequency);
  });
}

function setRangeFeedback(message) {
  els.rangeFeedback.textContent = message;
  els.setupRangeStatus.textContent = message.includes("表示中")
    ? "Range変更後はSolveで再計算します。"
    : `${message}。Solveで再計算します。`;
}

function renderRangeEditorToggle() {
  els.rangeEditor.classList.toggle("is-collapsed", !rangeState.editorOpen);
  els.toggleRangeEditor.textContent = rangeState.editorOpen ? "詳細編集を閉じる" : "詳細編集を開く";
  els.toggleRangeEditor.setAttribute("aria-expanded", String(rangeState.editorOpen));
}

function toggleRangeEditor() {
  rangeState.editorOpen = !rangeState.editorOpen;
  renderRangeEditorToggle();
}

function toggleBetSize(size) {
  if (betTreeState.activeSizes.has(size)) {
    if (betTreeState.activeSizes.size === 1) return;
    betTreeState.activeSizes.delete(size);
  } else {
    betTreeState.activeSizes.add(size);
  }
  invalidateSolverCache();
  renderBetSizeButtons();
  resetRiverSolver("Solveで再計算");
}

function renderBetSizeButtons() {
  const pot = Number(els.pot.value || 0);
  const stack = Number(els.stack.value || 0);
  const selected = selectedBetSizes(pot, stack);
  els.sizeButtons.forEach((button) => {
    const active = betTreeState.activeSizes.has(button.dataset.size);
    const size = betSizeOption(button.dataset.size, pot, stack);
    button.classList.toggle("active", active);
    button.innerHTML = `${size.label}<small>${size.amount.toFixed(1)}bb</small>`;
  });
  els.betTreeKey.textContent = betTreeKey(betTreeState.activeSizes);
  els.betTreeSelected.textContent = selected.map((size) => size.label).join(" / ");
  els.betTreeAmounts.textContent = selected.map((size) => `${size.label} ${size.amount.toFixed(1)}bb`).join(" / ");
}

function applyPreset(side, presetName) {
  els.spotPreset.value = "";
  updateSpotCards();
  rangeState[side] = makePresetRange(presetName);
  invalidateSolverCache();
  renderMatrix();
  setRangeFeedback(`${side.toUpperCase()} ${rangeLabels[presetName]} を適用`);
  resetRiverSolver("Solveで再計算");
}

function setActiveRange(side) {
  rangeState.activeSide = side;
  els.oopRangeTab.classList.toggle("active", side === "oop");
  els.ipRangeTab.classList.toggle("active", side === "ip");
  renderMatrix();
  renderRangeFrequencyPalette();
  setRangeFeedback(`${side.toUpperCase()} Range を編集中`);
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
  scrollToSolveResult(board.filter(Boolean).length);
}

function scrollToSolveResult(boardCount) {
  const activeStreet = activeStreetKey(boardCount);
  expandStreetPanel(activeStreet);
  const target =
    document.querySelector(`[data-street-panel="${activeStreet}"]`) ||
    document.querySelector("#resultsPanel");
  const testMode = new URLSearchParams(window.location.search).get("testMode") === "1";
  window.setTimeout(() => {
    const top = target.getBoundingClientRect().top + window.scrollY - 8;
    window.scrollTo({ top, behavior: testMode ? "auto" : "smooth" });
  }, 0);
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
  renderPracticeRecommendation(entries[0], equityValue, decision);
  addSolveHistory(entries[0], equityValue, decision);
  setBars(decision);
  setReason(
    `エクイティ ${pct(equityValue)}、必要勝率 ${pct(decision.potOdds)}。` +
      ` ポジションとSPRを補正したChip EV近似では ${entries[0][0]} の頻度が最も高いです。`
  );
}

function strategySourceLabel(boardCount) {
  if (boardCount === 3) return "Approx EV + Flop Solver Lite";
  if (boardCount === 4) return "Approx EV + Turn Rollout Lite";
  if (boardCount === 5) return "Approx EV + River Mini Solver";
  return "Approx EV";
}

function renderPracticeRecommendation(bestAction, equityValue, decision) {
  const { board } = selectedCards();
  const boardCount = board.filter(Boolean).length;
  els.practiceDecisionLabel.textContent = "Highest frequency action";
  els.practiceDecision.textContent = `${bestAction[0]} ${pct(bestAction[1])}`;
  els.practiceEquity.textContent = pct(equityValue);
  els.practicePotOdds.textContent = pct(decision.potOdds);
  els.practiceSpr.textContent = decision.spr.toFixed(1);
  els.practiceSource.textContent = strategySourceLabel(boardCount);
  els.practiceNote.textContent = "完全GTOではなく学習用の近似です。";
}

function addSolveHistory(bestAction, equityValue, decision) {
  const { hero, board } = selectedCards();
  const knownBoard = board.filter(Boolean);
  solveHistory.unshift({
    action: `${bestAction[0]} ${pct(bestAction[1])}`,
    board: knownBoard.map(formatCard).join(" ") || "No board",
    equity: pct(equityValue),
    hero: hero.filter(Boolean).map(formatCard).join(" "),
    input: currentInputSnapshot(hero, board),
    source: strategySourceLabel(knownBoard.length),
    spr: decision.spr.toFixed(1),
    street: streetLabel(knownBoard.length),
  });
  solveHistory.splice(5);
  renderSolveHistory();
}

function currentInputSnapshot(hero, board) {
  return {
    betSize: els.betSize.value,
    board: board.slice(),
    hero: hero.slice(),
    ipPreset: els.ipPreset.value,
    oopPreset: els.oopPreset.value,
    position: els.position.value,
    pot: els.pot.value,
    stack: els.stack.value,
    toCall: els.toCall.value,
    villainRange: els.villainRange.value,
  };
}

function renderSolveHistory() {
  els.solveHistoryCount.textContent = `${solveHistory.length} ${solveHistory.length === 1 ? "spot" : "spots"}`;
  els.clearSolveHistory.disabled = solveHistory.length === 0;
  els.solveHistoryEmpty.hidden = solveHistory.length > 0;
  els.solveHistoryList.innerHTML = "";
  solveHistory.forEach((entry) => {
    els.solveHistoryList.appendChild(createSolveHistoryItem(entry));
  });
}

function createSolveHistoryItem(entry) {
  const item = document.createElement("div");
  const head = document.createElement("div");
  const street = document.createElement("span");
  const action = document.createElement("strong");
  const spot = document.createElement("small");
  const source = document.createElement("small");
  const applyButton = document.createElement("button");
  item.className = "solve-history-item";
  applyButton.className = "secondary solve-history-apply";
  applyButton.type = "button";
  applyButton.textContent = "Apply";
  applyButton.addEventListener("click", () => applySolveHistoryEntry(entry));
  street.textContent = entry.street;
  action.textContent = entry.action;
  spot.textContent = `${entry.hero} / ${entry.board} / ${entry.equity} equity / SPR ${entry.spr}`;
  source.textContent = entry.source;
  head.append(street, action);
  item.append(head, spot, source, applyButton);
  return item;
}

function clearSolveHistory() {
  solveHistory.length = 0;
  renderSolveHistory();
}

function applySolveHistoryEntry(entry) {
  applyInputSnapshot(entry.input);
  setRangeFeedback(`${entry.street} history を適用`);
  sync();
  resetActiveSolverForBoard(entry.input.board.filter(Boolean).length);
  updateSpotCards();
  updatePreflopSpotCards();
}

function applyInputSnapshot(input) {
  els.spotPreset.value = "";
  els.preflopSpot.value = "";
  els.position.value = input.position;
  els.villainRange.value = input.villainRange;
  els.oopPreset.value = input.oopPreset;
  els.ipPreset.value = input.ipPreset;
  els.pot.value = input.pot;
  els.toCall.value = input.toCall;
  els.stack.value = input.stack;
  els.betSize.value = input.betSize;
  setCardSelects(els.heroCards, input.hero);
  setCardSelects(els.boardCards, input.board);
  rangeState.oop = makePresetRange(input.oopPreset);
  rangeState.ip = makePresetRange(input.ipPreset);
  invalidateSolverCache();
  renderBetSizeButtons();
}

function resetActiveSolverForBoard(boardCount) {
  if (boardCount === 5) resetRiverSolver("Solveで再計算");
  if (boardCount === 4) resetTurnSolver("Solveで再計算");
  if (boardCount === 3) resetFlopSolver("Solveで再計算");
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
      texture: boardTexture(turnBoard),
      turnCard,
    };
  });
  const mix = flopStrategyMix(oopScore, ipScore, board);
  const volatility = runoutVolatility(turnRows);

  els.flopStatus.textContent = `${turnCards.length} turn samples / ${solverSettings.flopComboLimit} combo cap`;
  els.flopTexture.textContent = boardTexture(board);
  els.flopOopScore.textContent = oopScore.toFixed(2);
  els.flopIpScore.textContent = ipScore.toFixed(2);
  els.flopRangeAdvantage.textContent = rangeAdvantageLabel(oopScore, ipScore);
  els.flopOopCbet.textContent = pct(mix.oopCbet);
  els.flopOopCheck.textContent = pct(1 - mix.oopCbet);
  els.flopIpContinue.textContent = pct(mix.ipContinue);
  els.flopRunoutVolatility.textContent = `${volatility.label} ${volatility.score.toFixed(2)}`;
  els.flopTurnSamples.textContent = String(turnCards.length);
  els.flopAccuracy.textContent = `Lite: heuristic strategy, ${solverSettings.flopTurnLimit} turn cap, ${solverSettings.flopComboLimit} combo cap`;
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

  const detailedResults = annotateTurnRunouts(results, board);
  const average = averageTurnResults(detailedResults);
  const best = detailedResults.slice().sort((a, b) => b.result.oopEv - a.result.oopEv)[0];
  const worst = detailedResults.slice().sort((a, b) => a.result.oopEv - b.result.oopEv)[0];
  const volatility = turnResultVolatility(detailedResults);
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
  els.turnWorstRiver.textContent = formatCard(worst.riverCard);
  els.turnVolatility.textContent = `${volatility.label} ${volatility.score.toFixed(2)}`;
  els.turnRangeCap.textContent = `${solverSettings.turnComboLimit} combos`;
  els.turnSolverSettings.textContent =
    `${solverSettings.iterations} iter / ${solverSettings.turnRunoutLimit} runouts / ` +
    `${solverSettings.turnComboLimit} combos`;
  els.turnCalcTime.textContent = `${elapsedMs} ms`;
  els.turnAccuracy.textContent = `Lite: ${runoutCount}/${solverSettings.turnRunoutLimit} runouts, ${solverSettings.turnComboLimit} combo cap`;
  renderTurnRunoutRows(detailedResults);
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

  return solverClient.solveRiverCandidates(payload, riverRequestId);
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

  return solverClient.solveTurnRunouts(payload, turnRequestId);
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
  return solverCache.solve(input);
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
    els.turnWorstRiver,
    els.turnVolatility,
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
    els.flopOopCbet,
    els.flopOopCheck,
    els.flopIpContinue,
    els.flopRunoutVolatility,
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
    .map((size) => betSizeOption(size, pot, stack))
    .sort((a, b) => a.amount - b.amount);
}

function betSizeOption(size, pot, stack) {
  if (size === "allin") return { key: size, label: "All-in", amount: Math.max(1, stack) };
  const ratio = Number(size);
  return {
    key: size,
    label: `${Math.round(ratio * 100)}% pot`,
    amount: Math.max(1, pot * ratio),
  };
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

function annotateTurnRunouts(results, turnBoard) {
  const average = averageTurnResults(results);
  return results.map((runout) => ({
    ...runout,
    category: riverRunoutCategory(turnBoard, runout.riverCard),
    evDelta: runout.result.oopEv - average.oopEv,
    oopBetDelta: runout.result.oopBet - average.oopBet,
  }));
}

function turnResultVolatility(results) {
  if (results.length <= 1) return { label: "Low", score: 0 };
  const averageEv = results.reduce((sum, runout) => sum + runout.result.oopEv, 0) / results.length;
  const variance = results.reduce((sum, runout) => sum + (runout.result.oopEv - averageEv) ** 2, 0) / results.length;
  const score = Math.sqrt(variance);
  const label = score >= 2 ? "High" : score >= 1 ? "Medium" : "Low";
  return { label, score };
}

function renderTurnRunoutRows(results) {
  els.turnRunoutRows.innerHTML = "";
  const bestEv = Math.max(...results.map(({ result }) => result.oopEv));
  const worstEv = Math.min(...results.map(({ result }) => result.oopEv));
  results.forEach(({ category, evDelta, oopBetDelta, riverCard, result }) => {
    const row = document.createElement("tr");
    if (result.oopEv === bestEv) row.classList.add("best-size");
    if (result.oopEv === worstEv) row.classList.add("worst-runout");
    row.innerHTML = `
      <td>${formatCard(riverCard)}</td>
      <td>${category}</td>
      <td>${pct(result.oopBet)}</td>
      <td>${signedPct(oopBetDelta)}</td>
      <td>${pct(1 - result.oopBet)}</td>
      <td>${pct(result.ipCall)}</td>
      <td>${pct(result.ipProbe)}</td>
      <td>${pct(result.oopCall)}</td>
      <td>${result.oopEv.toFixed(1)}</td>
      <td>${signedNumber(evDelta)}</td>
    `;
    els.turnRunoutRows.appendChild(row);
  });
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

function flopStrategyMix(oopScore, ipScore, board) {
  const advantage = clamp((oopScore - ipScore) * 0.18, -0.18, 0.18);
  const texture = boardTexture(board);
  const textureAdjustment = texture.includes("dry") ? 0.1 : texture.includes("connected") ? -0.08 : -0.04;
  const oopCbet = clamp(0.52 + advantage + textureAdjustment, 0.22, 0.82);
  const ipContinue = clamp(0.58 - advantage + (texture.includes("connected") ? 0.08 : 0), 0.28, 0.88);
  return { ipContinue, oopCbet };
}

function runoutVolatility(rows) {
  if (rows.length <= 1) return { label: "Low", score: 0 };
  const diffs = rows.map((row) => row.oopScore - row.ipScore);
  const average = diffs.reduce((sum, diff) => sum + diff, 0) / diffs.length;
  const variance = diffs.reduce((sum, diff) => sum + (diff - average) ** 2, 0) / diffs.length;
  const score = Math.sqrt(variance);
  const label = score >= 0.35 ? "High" : score >= 0.18 ? "Medium" : "Low";
  return { label, score };
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

function signedPct(value) {
  const rounded = Math.round(value * 100);
  return `${rounded >= 0 ? "+" : ""}${rounded}%`;
}

function signedNumber(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
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

function normalizeCardToken(token) {
  const normalized = token.trim().replace(/^10/i, "T");
  if (!/^[2-9TJQKA][shdc]$/i.test(normalized)) return "";
  return normalized[0].toUpperCase() + normalized[1].toLowerCase();
}

function parsePracticeBoard(value) {
  const cards = value
    .split(/[\s,]+/)
    .map(normalizeCardToken)
    .filter(Boolean);
  return cards.length === 3 ? cards : [];
}

function practiceHandCards(code, blockedCards) {
  const explicit = code
    .split(/[\s,]+/)
    .map(normalizeCardToken)
    .filter(Boolean);
  if (explicit.length === 2) return explicit;

  const hand = code.trim().toUpperCase();
  const match = hand.match(/^([2-9TJQKA])([2-9TJQKA])([SO])?$/);
  if (!match) return [];

  const [, firstRank, secondRank, suitedFlag] = match;
  const blocked = new Set(blockedCards);
  const suits = ["s", "h", "d", "c"];
  if (firstRank === secondRank) {
    const cards = suits.map((suit) => `${firstRank}${suit}`).filter((card) => !blocked.has(card));
    return cards.slice(0, 2);
  }

  for (const firstSuit of suits) {
    for (const secondSuit of suits) {
      if (suitedFlag === "S" && firstSuit !== secondSuit) continue;
      if (suitedFlag === "O" && firstSuit === secondSuit) continue;
      const cards = [`${firstRank}${firstSuit}`, `${secondRank}${secondSuit}`];
      if (cards.every((card) => !blocked.has(card))) return cards;
    }
  }
  return [];
}

function applyPracticeSpot() {
  const board = parsePracticeBoard(els.practiceBoard.value);
  if (board.length !== 3) {
    els.practiceApplyStatus.textContent = "Flopは 9s 7d 2c のように3枚で入力してください。";
    return;
  }

  const hero = practiceHandCards(els.practiceHand.value, board);
  if (hero.length !== 2 || new Set(hero.concat(board)).size !== 5) {
    els.practiceApplyStatus.textContent = "Hero handとFlopのカードが重複しない入力にしてください。";
    return;
  }

  els.spotPreset.value = "";
  els.preflopSpot.value = "";
  els.position.value = els.practicePosition.value;
  els.pot.value = els.practicePot.value;
  els.toCall.value = els.practiceFacingAmount.value;
  els.betSize.value = els.practiceFacingAmount.value;
  els.stack.value = els.practiceStack.value;
  setCardSelects(els.heroCards, hero);
  setCardSelects(els.boardCards, board.concat(["", ""]));
  updateSpotCards();
  updatePreflopSpotCards();
  invalidateSolverCache();
  renderBetSizeButtons();
  sync();
  els.practiceApplyStatus.textContent =
    `${els.practicePosition.value} / ${els.practiceHand.value} / ${board.join(" ")} を既存入力に反映しました。`;
}

function randomDeal() {
  const cards = shuffle(deck());
  const selects = [...els.heroCards.querySelectorAll("select"), ...els.boardCards.querySelectorAll("select")];
  selects.forEach((select, index) => {
    select.value = cards[index];
  });
  els.spotPreset.value = "";
  els.preflopSpot.value = "";
  updateSpotCards();
  updatePreflopSpotCards();
  sync();
}

function clearCards() {
  document.querySelectorAll(".card-select").forEach((select) => {
    select.value = "";
  });
  els.spotPreset.value = "";
  els.preflopSpot.value = "";
  updateSpotCards();
  updatePreflopSpotCards();
  sync();
}

function setCardSelects(container, cards) {
  [...container.querySelectorAll("select")].forEach((select, index) => {
    select.value = cards[index] || "";
  });
}

function applySpotPreset(presetKey) {
  const preset = spotPresets[presetKey];
  if (!preset) {
    updateSpotCards();
    return;
  }

  els.preflopSpot.value = "";
  els.position.value = preset.position;
  els.villainRange.value = preset.villainRange;
  els.oopPreset.value = preset.oopPreset;
  els.ipPreset.value = preset.ipPreset;
  els.pot.value = preset.pot;
  els.toCall.value = preset.toCall;
  els.stack.value = preset.stack;
  els.betSize.value = preset.betSize;
  setCardSelects(els.heroCards, preset.hero);
  setCardSelects(els.boardCards, preset.board);
  rangeState.oop = makePresetRange(preset.oopPreset);
  rangeState.ip = makePresetRange(preset.ipPreset);
  invalidateSolverCache();
  setRangeFeedback(`${preset.name} を適用`);
  sync();
  updateSpotCards();
  updatePreflopSpotCards();
}

function applyPreflopSpot(spotKey) {
  const spot = preflopSpots[spotKey];
  if (!spot) {
    updatePreflopSpotCards();
    return;
  }

  els.spotPreset.value = "";
  els.position.value = spot.position;
  els.villainRange.value = spot.villainRange;
  els.oopPreset.value = spot.oopPreset;
  els.ipPreset.value = spot.ipPreset;
  els.pot.value = spot.pot;
  els.toCall.value = spot.toCall;
  els.stack.value = spot.stack;
  els.betSize.value = spot.betSize;
  setCardSelects(els.heroCards, ["", ""]);
  setCardSelects(els.boardCards, ["", "", "", "", ""]);
  rangeState.oop = makePresetRange(spot.oopPreset);
  rangeState.ip = makePresetRange(spot.ipPreset);
  invalidateSolverCache();
  renderBetSizeButtons();
  setRangeFeedback(`${spot.name} を適用`);
  els.preflopSpotStatus.textContent = `${spot.name} を入力に反映しました。solutionは含まないsetup presetです。`;
  sync();
  updateSpotCards();
  updatePreflopSpotCards();
}

function init() {
  for (let i = 0; i < 2; i += 1) els.heroCards.appendChild(makeCardSelect(`hero-${i}`));
  for (let i = 0; i < 5; i += 1) els.boardCards.appendChild(makeCardSelect(`board-${i}`));
  [els.position, els.villainRange, els.pot, els.toCall, els.stack, els.betSize].forEach((el) => {
    el.addEventListener("input", () => {
      els.spotPreset.value = "";
      els.preflopSpot.value = "";
      updateSpotCards();
      updatePreflopSpotCards();
      invalidateSolverCache();
      renderBetSizeButtons();
      sync();
    });
    el.addEventListener("change", () => {
      els.spotPreset.value = "";
      els.preflopSpot.value = "";
      updateSpotCards();
      updatePreflopSpotCards();
      invalidateSolverCache();
      renderBetSizeButtons();
      sync();
    });
  });
  els.preflopSpot.addEventListener("change", () => applyPreflopSpot(els.preflopSpot.value));
  els.oopRangeTab.addEventListener("click", () => setActiveRange("oop"));
  els.ipRangeTab.addEventListener("click", () => setActiveRange("ip"));
  els.rangeFrequencyButtons.forEach((button) => {
    button.addEventListener("click", () => setRangeFrequency(Number(button.dataset.frequency)));
  });
  window.addEventListener("pointerup", () => {
    rangeState.painting = false;
  });
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
  els.toggleRangeEditor.addEventListener("click", toggleRangeEditor);
  els.streetToggles.forEach((button) => {
    button.addEventListener("click", () => {
      const street = button.dataset.streetToggle;
      setStreetPanelCollapsed(street, !streetPanelState.collapsed[street]);
    });
  });
  els.sizeButtons.forEach((button) => {
    button.addEventListener("click", () => toggleBetSize(button.dataset.size));
  });
  els.applyPracticeSpot.addEventListener("click", applyPracticeSpot);
  els.clearSolveHistory.addEventListener("click", clearSolveHistory);
  els.runSimulation.addEventListener("click", simulate);
  els.randomDeal.addEventListener("click", randomDeal);
  els.clearCards.addEventListener("click", clearCards);
  rangeState.oop = makePresetRange(els.oopPreset.value);
  rangeState.ip = makePresetRange(els.ipPreset.value);
  renderRangeEditorToggle();
  renderRangeFrequencyPalette();
  renderBetSizeButtons();
  void loadSpotPresets();
  void loadPreflopSpots();
  void loadPrecomputedSpots();
  sync();
}

init();
