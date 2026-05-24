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
  const SUIT_SYMBOLS = { s: "♠", h: "♥", d: "♦", c: "♣" };

  function deck() {
    return RANKS.slice()
      .reverse()
      .flatMap((rank) => SUITS.map((suit) => `${rank}${suit}`));
  }

  function formatCard(card) {
    if (!card) return "";
    return `${card[0]}${SUIT_SYMBOLS[card[1]]}`;
  }

  function boardKey(board) {
    return board.slice().sort().join(" ");
  }

  function countBy(items) {
    return items.reduce((counts, item) => {
      counts[item] = (counts[item] || 0) + 1;
      return counts;
    }, {});
  }

  function boardClass(board) {
    if (board.length !== 5) return "River board required";

    const rankCounts = countBy(board.map((card) => card[0]));
    const suitCounts = countBy(board.map((card) => card[1]));
    const highRank = board
      .map((card) => card[0])
      .sort((a, b) => RANK_VALUES[b] - RANK_VALUES[a])[0];
    const suitPattern = Object.keys(suitCounts).length === 1 ? "monotone" : Math.max(...Object.values(suitCounts)) >= 3 ? "two-tone" : "rainbow";
    const values = [...new Set(board.map((card) => RANK_VALUES[card[0]]))].sort((a, b) => a - b);
    const connected = values.some((value, index) => values[index + 3] - value <= 4);
    const paired = Object.values(rankCounts).some((count) => count > 1);
    const texture = paired ? "paired" : connected ? "connected" : "dry";

    return `${highRank}-high ${suitPattern} ${texture}`;
  }

  function boardTexture(board) {
    const ranksOnBoard = board.map((card) => card[0]);
    const values = [...new Set(ranksOnBoard.map((rank) => RANK_VALUES[rank]))].sort((a, b) => a - b);
    const rankCounts = countBy(ranksOnBoard);
    const suitCounts = countBy(board.map((card) => card[1]));
    const highRank = ranksOnBoard.sort((a, b) => RANK_VALUES[b] - RANK_VALUES[a])[0];
    const paired = Object.values(rankCounts).some((count) => count > 1);
    const connected = values.length >= 3 && values.some((value, index) => index + 2 < values.length && values[index + 2] - value <= 4);
    const suitPattern = Object.keys(suitCounts).length === 1 ? "monotone" : Math.max(...Object.values(suitCounts)) >= 2 ? "two-tone" : "rainbow";
    const texture = paired ? "paired" : connected ? "connected" : "dry";
    return `${highRank}-high ${suitPattern} ${texture}`;
  }

  function streetLabel(boardCount) {
    if (boardCount === 0) return "No board";
    if (boardCount === 3) return "Flop";
    if (boardCount === 4) return "Turn";
    if (boardCount === 5) return "River";
    return `${boardCount} cards`;
  }

  function setupStatusLabel(hero, board, duplicates) {
    const heroCount = hero.filter(Boolean).length;
    if (duplicates.size > 0) return "カード重複";
    if (heroCount < 2) return `Hero ${heroCount}/2`;
    if (board.length === 3) return "Flop計算可能";
    if (board.length === 4) return "Turn計算可能";
    if (board.length === 5) return "River計算可能";
    return `Board ${board.length}/3+`;
  }

  function activeStreetKey(boardCount) {
    if (boardCount === 3) return "flop";
    if (boardCount === 4) return "turn";
    if (boardCount === 5) return "river";
    return "";
  }

  window.PokerGtoCards = {
    RANKS,
    RANK_VALUES,
    SUITS,
    SUIT_SYMBOLS,
    activeStreetKey,
    boardClass,
    boardKey,
    boardTexture,
    deck,
    formatCard,
    setupStatusLabel,
    streetLabel,
  };
})();
