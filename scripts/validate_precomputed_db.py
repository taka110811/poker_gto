#!/usr/bin/env python3
import json
import sqlite3
from pathlib import Path

from generate_precomputed_db import BROWSER_JSON_PATH, SEED_PATH, SQLITE_PATH, browser_spots


def main():
    seed = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    browser_data = json.loads(BROWSER_JSON_PATH.read_text(encoding="utf-8"))
    expected_browser_data = {"spots": browser_spots(seed["spots"])}

    failures = []
    if browser_data != expected_browser_data:
        failures.append("data/precomputed_spots.json is not in sync with seed data")

    with sqlite3.connect(SQLITE_PATH) as conn:
        conn.row_factory = sqlite3.Row
        failures.extend(validate_sqlite(conn, seed["spots"]))

    if failures:
        raise SystemExit("\n".join(failures))

    print(f"Validated {len(seed['spots'])} precomputed spots")


def validate_sqlite(conn, seed_spots):
    failures = []
    db_spots = {row["id"]: dict(row) for row in conn.execute("SELECT * FROM spots")}
    if set(db_spots) != {spot["id"] for spot in seed_spots}:
        failures.append("SQLite spot ids do not match seed spot ids")
        return failures

    for spot in seed_spots:
        db_spot = db_spots[spot["id"]]
        expected = {
            "game_type": spot["game_type"],
            "street": spot["street"],
            "positions": spot["positions"],
            "pot_type": spot["pot_type"],
            "stack_bb": spot["stack_bb"],
            "effective_stack_bb": spot["effective_stack_bb"],
            "pot_bb": spot["pot_bb"],
            "board": " ".join(spot["board"]),
            "board_class": spot["board_class"],
            "bet_tree_key": spot["bet_tree_key"],
            "rake_config": spot["rake_config"],
            "solver_name": spot["solver_name"],
            "solver_version": spot["solver_version"],
            "created_at": spot["created_at"],
        }
        for key, expected_value in expected.items():
            if db_spot[key] != expected_value:
                failures.append(f"{spot['id']} SQLite {key} mismatch: {db_spot[key]} != {expected_value}")

        if table_count(conn, "spot_actions", spot["id"]) != len(spot["actions"]):
            failures.append(f"{spot['id']} action count mismatch")
        if table_count(conn, "spot_ranges", spot["id"]) != len(spot["ranges"]):
            failures.append(f"{spot['id']} range count mismatch")
        if table_count(conn, "spot_metadata", spot["id"]) != len(spot.get("metadata", {})):
            failures.append(f"{spot['id']} metadata count mismatch")

    return failures


def table_count(conn, table, spot_id):
    return conn.execute(f"SELECT COUNT(*) FROM {table} WHERE spot_id = ?", (spot_id,)).fetchone()[0]


if __name__ == "__main__":
    main()
