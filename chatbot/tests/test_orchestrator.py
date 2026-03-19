import os
import sys
import unittest

# ensure the package root is on the path so imports succeed
root = os.getcwd()
sys.path.insert(0, os.path.join(root, "chatbot"))

# common environment settings required by config.Settings
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("INTERNAL_API_KEY", "test")
os.environ.setdefault("OPENAI_API_KEY", "test")

from app.services import orchestrator


def make_kn():
    # minimal knowledge structure with one metric of interest
    return {
        "metrics": {
            "market_value_mEUR": {
                "id": "market_value_mEUR",
                "synonyms": ["valor de mercado", "market value"],
                "label": "Valor de mercado (milhões EUR)",
            }
        },
        "ops": {"operations": [], "field_allowlist": {"filters": [], "metrics": [], "group_by": [], "columns": []}},
        "constraints": {"execution": {"default_limit_rankings": 10, "default_limit_lists": 25}, "safety": {"blocked_fields": []}},
    }


class OrchestratorTest(unittest.TestCase):
    def test_infer_metric_alias(self):
        kn = make_kn()
        q = "Top 10 jogadores do Serrano por valor de mercado (posição e idade)"
        self.assertEqual(orchestrator._infer_metric_id(q, kn), "market_value_mEUR")

    def test_classify_includes_metric(self):
        kn = make_kn()
        q = "Top 10 jogadores do Serrano por valor de mercado"
        cls = orchestrator._fast_classify(q, kn)
        self.assertEqual(cls["intent"], "PLAYER_RANKING")
        self.assertEqual(cls["metrics"], ["market_value_mEUR"])

    def test_plan_fallback_metric(self):
        kn = make_kn()
        q = "Top 5 jogadores do Serrano"  # no metric mentioned
        plan = orchestrator._deterministic_plan(kn, q, "PLAYER_RANKING", {"club": "Serrano"}, [])
        self.assertEqual(plan["steps"][0]["metric"], orchestrator.DEFAULT_RANKING_METRIC)

    def test_infer_columns_include_defaults(self):
        kn = make_kn()
        q = "Top 10 jogadores do Serrano por valor de mercado (posição e idade)"
        cols = orchestrator._infer_requested_columns(q, kn)
        self.assertIn("full_name", cols)
        self.assertIn("position_code", cols)
        self.assertIn("age", cols)
        self.assertIn(orchestrator.DEFAULT_RANKING_METRIC, cols)

    def test_infer_columns_when_blank(self):
        kn = make_kn()
        q = "Me mostra os jogadores"
        cols = orchestrator._infer_requested_columns(q, kn)
        self.assertEqual(cols, ["full_name"])


if __name__ == "__main__":
    unittest.main()
