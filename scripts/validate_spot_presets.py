#!/usr/bin/env python3
import json
from pathlib import Path

PRESETS_PATH = Path("data/spot_presets.json")
RANKS = set("AKQJT98765432")
SUITS = set("shdc")
RANGES = {"tight", "standard", "wide", "any"}
POSITIONS = {"BTN", "CO", "HJ", "UTG", "BB", "SB"}
STREET_BOARD_COUNTS = {"Flop": 3, "Turn": 4, "River": 5}
REQUIRED_FIELDS = {
    "id",
    "name",
    "street",
    "spot",
    "texture",
    "position",
    "villainRange",
    "oopPreset",
    "ipPreset",
    "pot",
    "toCall",
    "stack",
    "betSize",
    "hero",
    "board",
}


def main():
    data = json.loads(PRESETS_PATH.read_text(encoding="utf-8"))
    failures = validate_dataset(data)
    if failures:
        raise SystemExit("\n".join(failures))
    print(f"Validated {len(data['spots'])} spot presets")


def validate_dataset(data):
    failures = []
    spots = data.get("spots")
    if not isinstance(spots, list) or not spots:
        return ["data/spot_presets.json must contain a non-empty spots list"]

    ids = set()
    for index, spot in enumerate(spots):
        label = spot.get("id", f"spot[{index}]")
        missing = REQUIRED_FIELDS - set(spot)
        if missing:
            failures.append(f"{label} missing fields: {', '.join(sorted(missing))}")
            continue

        if spot["id"] in ids:
            failures.append(f"{label} duplicate preset id")
        ids.add(spot["id"])

        if spot["street"] not in STREET_BOARD_COUNTS:
            failures.append(f"{label} invalid street: {spot['street']}")
        if spot["position"] not in POSITIONS:
            failures.append(f"{label} invalid position: {spot['position']}")
        for field in ("villainRange", "oopPreset", "ipPreset"):
            if spot[field] not in RANGES:
                failures.append(f"{label} invalid {field}: {spot[field]}")
        for field in ("pot", "toCall", "stack", "betSize"):
            if not isinstance(spot[field], (int, float)) or spot[field] < 0:
                failures.append(f"{label} invalid numeric field {field}: {spot[field]}")

        hero = spot["hero"]
        board = spot["board"]
        if len(hero) != 2:
            failures.append(f"{label} hero must contain 2 cards")
        if len(board) != 5:
            failures.append(f"{label} board must contain 5 slots")

        cards = [card for card in hero + board if card]
        for card in cards:
            if not valid_card(card):
                failures.append(f"{label} invalid card: {card}")
        if len(cards) != len(set(cards)):
            failures.append(f"{label} contains duplicate cards")

        known_board_count = len([card for card in board if card])
        expected_board_count = STREET_BOARD_COUNTS.get(spot["street"])
        if expected_board_count is not None and known_board_count != expected_board_count:
            failures.append(
                f"{label} street {spot['street']} requires {expected_board_count} board cards, got {known_board_count}"
            )

    return failures


def valid_card(card):
    return isinstance(card, str) and len(card) == 2 and card[0] in RANKS and card[1] in SUITS


if __name__ == "__main__":
    main()
