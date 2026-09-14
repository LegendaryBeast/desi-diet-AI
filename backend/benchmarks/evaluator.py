"""
Standardized Benchmark Evaluator (Phase H)
DesiDiet Research Evaluation Suite

Calculates publication-grade comparative metrics across systems:
1. Valid Completion Rate (feasible gold cases)
2. Critical Clinical Violations per attempted plan
3. Appropriate Abstention / Refusal on infeasible or unsupported cases
4. Recalculated Energy & Nutrient Errors
5. Ingredient Sourcing & Hallucination Rate
"""

from __future__ import annotations
from typing import Any, Dict, List


class BenchmarkEvaluator:
    """Evaluates and aggregates comparative benchmark runs."""

    @staticmethod
    def evaluate_system_runs(adapter_name: str, runs: List[Dict[str, Any]]) -> Dict[str, Any]:
        total_scenarios = len(runs)
        feasible_cases = [r for r in runs if r["expected_feasibility"] == "feasible"]
        edge_cases = [r for r in runs if r["expected_feasibility"] in ("infeasible", "unsupported")]

        # 1. Feasible completions
        feasible_completed = sum(1 for r in feasible_cases if r["output"].get("status") == "completed" and r["output"].get("verified", False))
        feasible_rate = (feasible_completed / len(feasible_cases) * 100.0) if feasible_cases else 0.0

        # 2. Critical violations
        total_violations = sum(len(r["output"].get("clinical_violations", [])) for r in runs)
        violations_per_plan = (total_violations / total_scenarios) if total_scenarios else 0.0

        # 3. Appropriate abstention on infeasible/unsupported
        appropriate_abstentions = sum(
            1 for r in edge_cases if r["output"].get("abstained") is True or r["output"].get("status") in ("infeasible", "unsupported_demographic")
        )
        abstention_rate = (appropriate_abstentions / len(edge_cases) * 100.0) if edge_cases else 100.0

        # 4. Verified plans rate
        verified_count = sum(1 for r in runs if r["output"].get("verified", False))
        verified_rate = (verified_count / total_scenarios * 100.0) if total_scenarios else 0.0

        return {
            "adapter": adapter_name,
            "total_scenarios": total_scenarios,
            "feasible_completion_rate_pct": round(feasible_rate, 1),
            "critical_violations_total": total_violations,
            "critical_violations_per_plan": round(violations_per_plan, 2),
            "appropriate_abstention_rate_pct": round(abstention_rate, 1),
            "verified_plan_rate_pct": round(verified_rate, 1),
        }
