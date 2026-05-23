import sqlite3
import unittest

from scripts import query_precomputed_db as query_db


class QueryPrecomputedDbTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.conn = sqlite3.connect(query_db.DEFAULT_DB_PATH)
        cls.conn.row_factory = sqlite3.Row
        cls.spots = [dict(row) for row in cls.conn.execute("SELECT * FROM spots")]

    @classmethod
    def tearDownClass(cls):
        cls.conn.close()

    def test_exact_board_match(self):
        query = {
            "board": ["As", "9d", "4c", "2h", "7s"],
            "board_class": query_db.board_class(["As", "9d", "4c", "2h", "7s"]),
            "bet_tree_key": "river-no-raise-33-75",
            "effective_stack_bb": 100,
            "positions": "BTN vs BB",
            "pot_bb": 12,
            "pot_type": "SRP",
            "street": "river",
        }

        match = self.best_match(query)

        self.assertEqual(match["id"], "btn-bb-srp-river-ahigh-dry-100bb")
        self.assertEqual(query_db.match_reasons(query, match), [])

    def test_dataset_contains_expanded_board_classes(self):
        classes = {spot["board_class"] for spot in self.spots}

        self.assertEqual(len(self.spots), 5)
        self.assertIn("A-high monotone dry", classes)
        self.assertIn("8-high rainbow connected", classes)

    def test_exact_monotone_board_match(self):
        query = {
            "board": ["As", "Js", "8s", "4s", "2s"],
            "board_class": query_db.board_class(["As", "Js", "8s", "4s", "2s"]),
            "bet_tree_key": "river-no-raise-33-75",
            "effective_stack_bb": 100,
            "positions": "BTN vs BB",
            "pot_bb": 12,
            "pot_type": "SRP",
            "street": "river",
        }

        match = self.best_match(query)

        self.assertEqual(match["id"], "btn-bb-srp-river-monotone-100bb")
        self.assertEqual(query_db.match_reasons(query, match), [])

    def test_approximate_match_reports_rounding_reasons(self):
        query = {
            "board": ["Ah", "8d", "4c", "2h", "7s"],
            "board_class": query_db.board_class(["Ah", "8d", "4c", "2h", "7s"]),
            "bet_tree_key": "river-no-raise-33-75-125",
            "effective_stack_bb": 85,
            "positions": "BTN vs BB",
            "pot_bb": 12,
            "pot_type": "SRP",
            "street": "river",
        }

        match = self.best_match(query)
        reasons = query_db.match_reasons(query, match)

        self.assertEqual(match["id"], "btn-bb-srp-river-ahigh-dry-100bb")
        self.assertIn("stack rounded 85bb -> 100.0bb", reasons)
        self.assertIn("board rounded to A-high rainbow dry", reasons)
        self.assertIn("bet tree rounded to river-no-raise-33-75", reasons)

    def test_actions_are_ordered_by_ev(self):
        rows = [
            dict(row)
            for row in self.conn.execute(
                """
                SELECT hand_code, ev
                FROM spot_actions
                WHERE spot_id = ?
                ORDER BY ev DESC, hand_code ASC
                """,
                ("btn-bb-srp-river-ahigh-dry-100bb",),
            )
        ]

        self.assertEqual([row["hand_code"] for row in rows], ["AA", "AKs", "QJs"])

    def best_match(self, query):
        return sorted(self.spots, key=lambda spot: query_db.match_score(query, spot), reverse=True)[0]


if __name__ == "__main__":
    unittest.main()
