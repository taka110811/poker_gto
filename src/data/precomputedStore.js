(function () {
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

  function boardKey(board) {
    return board.slice().sort().join(" ");
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

  window.PokerGtoPrecomputedStore = {
    createSqlitePrecomputedStore,
  };
})();
