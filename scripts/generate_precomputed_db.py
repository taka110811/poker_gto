#!/usr/bin/env python3
import json
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "db" / "schema.sql"
SEED_PATH = ROOT / "data" / "precomputed_spots.seed.json"
SQLITE_PATH = ROOT / "data" / "precomputed_spots.sqlite"
BROWSER_JSON_PATH = ROOT / "data" / "precomputed_spots.json"


def main():
    seed = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    if SQLITE_PATH.exists():
        SQLITE_PATH.unlink()

    with sqlite3.connect(SQLITE_PATH) as conn:
        conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        for spot in seed["spots"]:
            insert_spot(conn, spot)

    BROWSER_JSON_PATH.write_text(
        json.dumps({"spots": browser_spots(seed["spots"])}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def insert_spot(conn, spot):
    conn.execute(
        """
        INSERT INTO spots (
          id, game_type, street, positions, pot_type, stack_bb,
          effective_stack_bb, pot_bb, board, board_class, bet_tree_key,
          rake_config, solver_name, solver_version, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            spot["id"],
            spot["game_type"],
            spot["street"],
            spot["positions"],
            spot["pot_type"],
            spot["stack_bb"],
            spot["effective_stack_bb"],
            spot["pot_bb"],
            " ".join(spot["board"]),
            spot["board_class"],
            spot["bet_tree_key"],
            spot["rake_config"],
            spot["solver_name"],
            spot["solver_version"],
            spot["created_at"],
        ),
    )

    conn.executemany(
        """
        INSERT INTO spot_actions (spot_id, hand_code, action, frequency, ev, equity)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        [
            (spot["id"], action["hand_code"], action["action"], action["frequency"], action["ev"], action["equity"])
            for action in spot["actions"]
        ],
    )
    conn.executemany(
        """
        INSERT INTO spot_ranges (spot_id, player, hand_code, frequency)
        VALUES (?, ?, ?, ?)
        """,
        [
            (spot["id"], range_row["player"], range_row["hand_code"], range_row["frequency"])
            for range_row in spot["ranges"]
        ],
    )
    conn.executemany(
        """
        INSERT INTO spot_metadata (spot_id, key, value)
        VALUES (?, ?, ?)
        """,
        [(spot["id"], key, value) for key, value in spot.get("metadata", {}).items()],
    )


def browser_spots(spots):
    return [
        {
            "id": spot["id"],
            "street": spot["street"],
            "positions": spot["positions"],
            "pot_type": spot["pot_type"],
            "effective_stack_bb": spot["effective_stack_bb"],
            "pot_bb": spot["pot_bb"],
            "board": spot["board"],
            "board_class": spot["board_class"],
            "bet_tree_key": spot["bet_tree_key"],
            "solver_name": spot["solver_name"],
            "solver_version": spot["solver_version"],
            "actions": spot["actions"],
        }
        for spot in spots
    ]


if __name__ == "__main__":
    main()
