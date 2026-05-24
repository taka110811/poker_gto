const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");

function loadScripts(files) {
  const context = {
    console,
    window: {},
  };
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
