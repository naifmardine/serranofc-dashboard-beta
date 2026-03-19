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
    """Minimal knowledge structure for testing."""
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


class OrchestratorIntegrationTest(unittest.TestCase):
    """Integration tests for orchestrator fixes."""

    def test_full_orchestration_flow_bug_repro(self):
        """Test the complete flow for the reported bug.
        
        Bug Report:
        "Top 10 jogadores do Serrano por valor de mercado (posição e idade)"
        
        Expected Result: valid PLAYER_RANKING plan with metric='market_value_mEUR'
        Actual Bug: metric='metrics' (the word itself, not the ID)
        """
        kn = make_kn()
        question = "Top 10 jogadores do Serrano por valor de mercado (posição e idade)"

        # Step 1: Classification
        classify = orchestrator._fast_classify(question, kn)
        print(f"\n[TEST] Classification: intent={classify['intent']}, metrics={classify['metrics']}")
        self.assertEqual(classify["intent"], "PLAYER_RANKING")
        self.assertIn("market_value_mEUR", classify["metrics"])
        self.assertNotEqual(classify["metrics"], ["metrics"], "Bug: metrics should never be ['metrics']")

        # Step 2: Plan generation
        plan = orchestrator._deterministic_plan(
            kn,
            question,
            classify["intent"],
            classify["entities"],
            classify["metrics"],
        )
        print(f"[TEST] Plan: {plan['steps'][0] if plan['steps'] else 'EMPTY'}")
        self.assertGreater(len(plan["steps"]), 0, "Plan should have steps")

        step = plan["steps"][0]
        self.assertEqual(step["op"], "rank_players")
        # Bug was: metric = "metrics" instead of "market_value_mEUR"
        self.assertEqual(step["metric"], "market_value_mEUR", f"BUG FIX FAILED: got metric={step['metric']}")
        self.assertNotEqual(step["metric"], "metrics", "BUG: metric should NOT be the literal string 'metrics'")

        # Step 3: Validation
        ok, err = orchestrator._validate_plan(kn, plan)
        print(f"[TEST] Validation: ok={ok}, err={err}")
        self.assertTrue(ok, f"Plan validation should pass. Got error: {err}")

    def test_metric_resolution_priority(self):
        """Test that metric resolution uses tools_registry before knowledge JSON."""
        # Direct tools_registry lookup
        result = orchestrator._resolve_metric_via_registry("valor de mercado")
        self.assertEqual(result, "market_value_mEUR")

        # Normalized lookup
        result = orchestrator._resolve_metric_via_registry("market_value_meur")
        self.assertEqual(result, "market_value_mEUR")

        # Non-existent metric
        result = orchestrator._resolve_metric_via_registry("nonexistent_metric")
        self.assertIsNone(result)

    def test_infer_metric_uses_registry_first(self):
        """Test that _infer_metric_id prioritizes tools_registry aliases."""
        kn = make_kn()
        
        # Should match via tools_registry
        result = orchestrator._infer_metric_id("valor de mercado em ranking", kn)
        self.assertEqual(result, "market_value_mEUR")

    def test_plan_columns_include_metric(self):
        """Test that plan includes metric in columns for ranking."""
        kn = make_kn()
        question = "Top 10 jogadores do Serrano por valor de mercado"
        plan = orchestrator._deterministic_plan(
            kn,
            question,
            "PLAYER_RANKING",
            {"club": "Serrano"},
            ["market_value_mEUR"],
        )
        columns = plan["steps"][0]["columns"]
        self.assertIn("market_value_mEUR", columns, "Ranking step should include metric in columns")
        self.assertIn("full_name", columns, "Ranking step should include player name")
        self.assertIn("position_code", columns, "Ranking step should include position")
        self.assertIn("age", columns, "Ranking step should include age")


if __name__ == "__main__":
    unittest.main()
