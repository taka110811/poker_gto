#!/usr/bin/env python3
import argparse
import json
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = ROOT / "data" / "precomputed_spots.sqlite"
RANK_VALUES = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "T": 10,
    "J": 11,
    "Q": 12,
    "K": 13,
    "A": 14,
}


def main():
    args = parse_args()
    query = {
        "board": args.board,
        "board_class": board_class(args.board),
        "bet_tree_key": args.bet_tree_key,
        "effective_stack_bb": args.effective_stack_bb,
        "positions": args.positions,
        "pot_bb": args.pot_bb,
        "pot_type": args.pot_type,
        "street": args.street,
    }

    with sqlite3.connect(args.db_path) as conn:
        conn.row_factory = sqlite3.Row
        spots = [dict(row) for row in conn.execute("SELECT * FROM spots")]
        if not spots:
            raise SystemExit("No precomputed spots found")

        best = sorted(spots, key=lambda spot: match_score(query, spot), reverse=True)[0]
        actions = [
            dict(row)
            for row in conn.execute(
                """
                SELECT hand_code, action, frequency, ev, equity
                FROM spot_actions
                WHERE spot_id = ?
                ORDER BY ev DESC, hand_code ASC
                """,
                (best["id"],),
            )
        ]

    print(
        json.dumps(
            {
                "query": query,
                "match": best,
                "exact": not match_reasons(query, best),
                "reasons": match_reasons(query, best),
                "actions": actions,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


def parse_args():
    parser = argparse.ArgumentParser(description="Find the closest precomputed poker spot in SQLite.")
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH, type=Path)
    parser.add_argument("--board", nargs=5, required=True)
    parser.add_argument("--positions", default="BTN vs BB")
    parser.add_argument("--pot-type", default="SRP")
    parser.add_argument("--street", default="river")
    parser.add_argument("--effective-stack-bb", default=100, type=float)
    parser.add_argument("--pot-bb", default=12, type=float)
    parser.add_argument("--bet-tree-key", default="river-no-raise-33-75")
    return parser.parse_args()


def board_key(board):
    return " ".join(sorted(board))


def board_class(board):
    rank_counts = {}
    suit_counts = {}
    values = []
    for card in board:
        rank = card[0]
        suit = card[1]
        rank_counts[rank] = rank_counts.get(rank, 0) + 1
        suit_counts[suit] = suit_counts.get(suit, 0) + 1
        values.append(RANK_VALUES[rank])

    high_rank = max((card[0] for card in board), key=lambda rank: RANK_VALUES[rank])
    max_suit_count = max(suit_counts.values())
    if len(suit_counts) == 1:
        suit_pattern = "monotone"
    elif max_suit_count >= 3:
        suit_pattern = "two-tone"
    else:
        suit_pattern = "rainbow"

    unique_values = sorted(set(values))
    connected = any(unique_values[index + 3] - value <= 4 for index, value in enumerate(unique_values[:-3]))
    paired = any(count > 1 for count in rank_counts.values())
    texture = "paired" if paired else "connected" if connected else "dry"
    return f"{high_rank}-high {suit_pattern} {texture}"


def match_score(query, spot):
    score = 0
    if spot["street"] == query["street"]:
        score += 40
    if spot["positions"] == query["positions"]:
        score += 30
    if spot["pot_type"] == query["pot_type"]:
        score += 20
    if spot["bet_tree_key"] == query["bet_tree_key"]:
        score += 15
    if board_key(spot["board"].split()) == board_key(query["board"]):
        score += 100
    elif spot["board_class"] == query["board_class"]:
        score += 45
    score -= abs(spot["effective_stack_bb"] - query["effective_stack_bb"]) * 0.25
    score -= abs(spot["pot_bb"] - query["pot_bb"]) * 0.5
    return score


def match_reasons(query, spot):
    reasons = []
    if spot["positions"] != query["positions"]:
        reasons.append(f"positions rounded to {spot['positions']}")
    if spot["pot_type"] != query["pot_type"]:
        reasons.append(f"pot type rounded to {spot['pot_type']}")
    if spot["effective_stack_bb"] != query["effective_stack_bb"]:
        reasons.append(f"stack rounded {query['effective_stack_bb']}bb -> {spot['effective_stack_bb']}bb")
    if spot["board_class"] != query["board_class"] or board_key(spot["board"].split()) != board_key(query["board"]):
        reasons.append(f"board rounded to {spot['board_class']}")
    if spot["bet_tree_key"] != query["bet_tree_key"]:
        reasons.append(f"bet tree rounded to {spot['bet_tree_key']}")
    if spot["pot_bb"] != query["pot_bb"]:
        reasons.append(f"pot rounded {query['pot_bb']}bb -> {spot['pot_bb']}bb")
    return reasons


if __name__ == "__main__":
    main()
