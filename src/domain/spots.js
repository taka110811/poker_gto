(function () {
  function betTreeKey(activeSizes) {
    const keys = [...activeSizes]
      .map((size) => (size === "allin" ? "allin" : String(Math.round(Number(size) * 100))))
      .sort((a, b) => {
        if (a === "allin") return 1;
        if (b === "allin") return -1;
        return Number(a) - Number(b);
      });
    return `river-no-raise-${keys.join("-")}`;
  }

  function precomputedQuery({ activeSizes, board, boardClass, position, pot, stack }) {
    return {
      board,
      board_class: boardClass,
      bet_tree_key: betTreeKey(activeSizes),
      effective_stack_bb: Number(stack || 0),
      positions: `${position} vs BB`,
      pot_bb: Number(pot || 0),
      pot_type: "SRP",
      street: "river",
    };
  }

  window.PokerGtoSpots = {
    betTreeKey,
    precomputedQuery,
  };
})();
