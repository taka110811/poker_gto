const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");

function loadScripts(files, globals = {}) {
  const context = {
    console,
    window: {},
    ...globals,
  };
  Object.assign(context.window, globals.window || {});
  vm.createContext(context);
  files.forEach((file) => {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    vm.runInContext(source, context, { filename: file });
  });
  return context.window;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("cards domain formats cards and labels board state", () => {
  const { PokerGtoCards } = loadScripts(["src/domain/cards.js"]);

  assert.equal(PokerGtoCards.deck().length, 52);
  assert.equal(PokerGtoCards.deck()[0], "2s");
  assert.equal(PokerGtoCards.deck()[51], "Ac");
  assert.equal(PokerGtoCards.formatCard("Ah"), "A♥");
  assert.equal(PokerGtoCards.boardKey(["Kd", "As", "2h"]), "2h As Kd");
  assert.equal(PokerGtoCards.boardClass(["As", "Kd", "7c", "2h", "2d"]), "A-high rainbow paired");
  assert.equal(PokerGtoCards.boardTexture(["As", "Ks", "Qs"]), "A-high monotone connected");
  assert.equal(PokerGtoCards.streetLabel(4), "Turn");
  assert.equal(PokerGtoCards.activeStreetKey(5), "river");
  assert.equal(PokerGtoCards.setupStatusLabel(["Ah", ""], [], new Set()), "Hero 1/2");
  assert.equal(PokerGtoCards.setupStatusLabel(["Ah", "Kd"], ["Qs"], new Set(["Ah"])), "カード重複");
});

test("ranges domain builds range presets and combo helpers", () => {
  const { PokerGtoRanges } = loadScripts(["src/domain/ranges.js"]);

  assert.equal(PokerGtoRanges.handCode("As", "Ks"), "AKs");
  assert.equal(PokerGtoRanges.handCode("Ah", "Kd"), "AKo");
  assert.equal(PokerGtoRanges.handCode("Ac", "Ad"), "AA");
  assert.equal(PokerGtoRanges.comboCountFor("AA"), 6);
  assert.equal(PokerGtoRanges.comboCountFor("AKs"), 4);
  assert.equal(PokerGtoRanges.comboCountFor("AKo"), 12);

  const tight = PokerGtoRanges.makePresetRange("tight");
  assert.equal(tight.AA, 1);
  assert.equal(tight["72o"], 0);

  assert.equal(PokerGtoRanges.compactRangeKey({ AKo: 0.5, AA: 1, KQo: 0 }), "AA:1,AKo:0.5");
  assert.deepEqual(plain(PokerGtoRanges.rangeSummary({ AA: 1, AKs: 0.5, KQo: 0 })), {
    activeHands: 2,
    averageFrequency: 0.75,
    combos: 8,
  });

  const combos = PokerGtoRanges.rangeCombos({ AA: 1, AKs: 0.5 }, ["As", "Kd", "7c", "2h", "9d"], 10);
  assert.ok(combos.length > 0);
  assert.ok(combos.every((combo) => combo.frequency > 0));
  assert.ok(combos.every((combo) => !combo.cards.some((card) => ["As", "Kd", "7c", "2h", "9d"].includes(card))));
});

test("spots domain creates stable bet tree keys and precomputed queries", () => {
  const { PokerGtoSpots } = loadScripts(["src/domain/spots.js"]);

  const activeSizes = new Set(["0.75", "allin", "0.33"]);
  assert.equal(PokerGtoSpots.betTreeKey(activeSizes), "river-no-raise-33-75-allin");
  assert.deepEqual(
    plain(
      PokerGtoSpots.precomputedQuery({
        activeSizes,
        board: ["As", "Kd", "7c", "2h", "9d"],
        boardClass: "A-high rainbow dry",
        position: "BTN",
        pot: "12",
        stack: "85",
      })
    ),
    {
      board: ["As", "Kd", "7c", "2h", "9d"],
      board_class: "A-high rainbow dry",
      bet_tree_key: "river-no-raise-33-75-allin",
      effective_stack_bb: 85,
      positions: "BTN vs BB",
      pot_bb: 12,
      pot_type: "SRP",
      street: "river",
    }
  );
});

test("solver cache reuses equivalent inputs and can be cleared", () => {
  const { PokerGtoSolverCache } = loadScripts(["src/domain/ranges.js", "src/solver/solverCache.js"]);
  let solveCount = 0;
  const cache = PokerGtoSolverCache.createSolverCache((input) => {
    solveCount += 1;
    return { oopEv: input.betSize };
  });
  const input = {
    board: ["As", "Kd", "7c", "2h", "9d"],
    pot: 12,
    betSize: 4,
    iterations: 6,
    comboLimit: 16,
    version: "test",
    oopRange: { AA: 1 },
    ipRange: { KK: 1 },
  };

  assert.deepEqual(plain(cache.solve(input)), { result: { oopEv: 4 }, cacheHit: false });
  assert.deepEqual(plain(cache.solve({ ...input, board: input.board.slice().reverse() })), { result: { oopEv: 4 }, cacheHit: true });
  assert.equal(solveCount, 1);

  cache.clear();
  assert.deepEqual(plain(cache.solve(input)), { result: { oopEv: 4 }, cacheHit: false });
  assert.equal(solveCount, 2);
});

test("solver client falls back to local solvers when Worker is unavailable", async () => {
  const { PokerGtoSolverClient } = loadScripts(["src/solver/solverClient.js"]);
  const calls = [];
  const client = PokerGtoSolverClient.createSolverClient({
    localRiverCandidates: (payload) => {
      calls.push(["river", payload]);
      return { results: [{ label: "33%" }], cacheHits: 0 };
    },
    localTurnRunouts: (payload) => {
      calls.push(["turn", payload]);
      return { results: [{ riverCard: "Ah" }], cacheHits: 1, runoutCount: 4 };
    },
    workerUrl: "./solver.worker.js",
  });

  assert.deepEqual(plain(await client.solveRiverCandidates({ pot: 12 }, 1)), {
    results: [{ label: "33%" }],
    cacheHits: 0,
  });
  assert.deepEqual(plain(await client.solveTurnRunouts({ board: ["As", "Kd", "7c", "2h"] }, 2)), {
    results: [{ riverCard: "Ah" }],
    cacheHits: 1,
    runoutCount: 4,
  });
  assert.deepEqual(calls, [
    ["river", { pot: 12 }],
    ["turn", { board: ["As", "Kd", "7c", "2h"] }],
  ]);
});

test("solver client routes river and turn requests through Worker", async () => {
  const workers = [];
  class FakeWorker {
    constructor(url) {
      this.url = url;
      this.messages = [];
      workers.push(this);
    }

    postMessage(message) {
      this.messages.push(message);
    }
  }

  const { PokerGtoSolverClient } = loadScripts(["src/solver/solverClient.js"], {
    Worker: FakeWorker,
    window: { Worker: FakeWorker },
  });
  const client = PokerGtoSolverClient.createSolverClient({
    localRiverCandidates: () => {
      throw new Error("river fallback should not run");
    },
    localTurnRunouts: () => {
      throw new Error("turn fallback should not run");
    },
    workerUrl: "./solver.worker.js",
  });

  const riverPromise = client.solveRiverCandidates({ pot: 12 }, 11);
  assert.equal(workers[0].url, "./solver.worker.js");
  assert.deepEqual(plain(workers[0].messages[0]), {
    id: 11,
    payload: { pot: 12 },
    type: "solve-river",
  });
  workers[0].onmessage({
    data: {
      id: 11,
      type: "river-result",
      results: [{ label: "75%" }],
      cacheHits: 2,
    },
  });
  assert.deepEqual(plain(await riverPromise), {
    results: [{ label: "75%" }],
    cacheHits: 2,
  });

  const turnPromise = client.solveTurnRunouts({ runoutLimit: 4 }, 12);
  assert.deepEqual(plain(workers[0].messages[1]), {
    id: 12,
    payload: { runoutLimit: 4 },
    type: "solve-turn",
  });
  workers[0].onmessage({
    data: {
      id: 12,
      type: "turn-result",
      results: [{ riverCard: "Ah" }],
      cacheHits: 3,
      runoutCount: 4,
    },
  });
  assert.deepEqual(plain(await turnPromise), {
    results: [{ riverCard: "Ah" }],
    cacheHits: 3,
    runoutCount: 4,
  });
});

test("solver client rejects pending requests on Worker errors", async () => {
  const workers = [];
  class FakeWorker {
    constructor() {
      this.messages = [];
      workers.push(this);
    }

    postMessage(message) {
      this.messages.push(message);
    }
  }

  const { PokerGtoSolverClient } = loadScripts(["src/solver/solverClient.js"], {
    Worker: FakeWorker,
    window: { Worker: FakeWorker },
  });
  const client = PokerGtoSolverClient.createSolverClient({
    localRiverCandidates: () => ({ results: [] }),
    localTurnRunouts: () => ({ results: [] }),
    workerUrl: "./solver.worker.js",
  });

  const riverPromise = client.solveRiverCandidates({ pot: 12 }, 21);
  workers[0].onmessage({
    data: {
      id: 21,
      type: "river-error",
      message: "boom",
    },
  });
  await assert.rejects(riverPromise, /boom/);

  const turnPromise = client.solveTurnRunouts({ runoutLimit: 4 }, 22);
  workers[0].onerror(new Error("worker crashed"));
  await assert.rejects(turnPromise, /worker crashed/);
});
