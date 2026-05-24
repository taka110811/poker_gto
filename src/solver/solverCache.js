(function () {
  const { compactRangeKey } = window.PokerGtoRanges;

  function createSolverCache(solveRiverSpot) {
    const cache = new Map();

    function key({
      board,
      pot,
      betSize,
      iterations,
      comboLimit,
      version,
      oopRange,
      ipRange,
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

    function solve(input) {
      const cacheKey = key(input);
      if (cache.has(cacheKey)) return { result: cache.get(cacheKey), cacheHit: true };
      const result = solveRiverSpot(input);
      if (result) cache.set(cacheKey, result);
      return { result, cacheHit: false };
    }

    return {
      clear: () => cache.clear(),
      solve,
    };
  }

  window.PokerGtoSolverCache = {
    createSolverCache,
  };
})();
