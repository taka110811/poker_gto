PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS spots (
  id TEXT PRIMARY KEY,
  game_type TEXT NOT NULL,
  street TEXT NOT NULL,
  positions TEXT NOT NULL,
  pot_type TEXT NOT NULL,
  stack_bb REAL NOT NULL,
  effective_stack_bb REAL NOT NULL,
  pot_bb REAL NOT NULL,
  board TEXT NOT NULL,
  board_class TEXT NOT NULL,
  bet_tree_key TEXT NOT NULL,
  rake_config TEXT NOT NULL,
  solver_name TEXT NOT NULL,
  solver_version TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS spot_actions (
  spot_id TEXT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  hand_code TEXT NOT NULL,
  action TEXT NOT NULL,
  frequency REAL NOT NULL CHECK (frequency >= 0 AND frequency <= 1),
  ev REAL NOT NULL,
  equity REAL NOT NULL CHECK (equity >= 0 AND equity <= 1),
  PRIMARY KEY (spot_id, hand_code, action)
);

CREATE TABLE IF NOT EXISTS spot_ranges (
  spot_id TEXT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  player TEXT NOT NULL CHECK (player IN ('oop', 'ip')),
  hand_code TEXT NOT NULL,
  frequency REAL NOT NULL CHECK (frequency >= 0 AND frequency <= 1),
  PRIMARY KEY (spot_id, player, hand_code)
);

CREATE TABLE IF NOT EXISTS spot_metadata (
  spot_id TEXT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (spot_id, key)
);

CREATE INDEX IF NOT EXISTS idx_spots_lookup
  ON spots (positions, pot_type, street, effective_stack_bb, board_class, bet_tree_key);
