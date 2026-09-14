"""
Benchmark Runner Script (Phase H)
DesiDiet Research Evaluation Suite

Runs controlled comparisons across all adapters on scenario_manifests.json.
Supports --offline flag for local deterministic reproducibility.
"""

import argparse
import json
import os
import sys
from typing import Any, Dict, List

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from benchmarks.adapters import (
    DirectLLMAdapter,
    TextRAGAdapter,
    GraphCosineAdapter,
    PortionPlannerAdapter,
)
from benchmarks.evaluator import BenchmarkEvaluator


def load_manifests(manifest_path: str) -> List[Dict[str, Any]]:
    with open(manifest_path, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    parser = argparse.ArgumentParser(description="DesiDiet Research Benchmark Runner")
    parser.add_argument("--offline", action="store_true", default=True, help="Run offline without external API keys")
    parser.add_argument("--manifest", type=str, default="", help="Path to scenario manifest JSON")
    args = parser.parse_args()

    benchmarks_dir = os.path.dirname(os.path.abspath(__file__))
    manifest_file = args.manifest or os.path.join(benchmarks_dir, "scenario_manifests.json")

    if not os.path.exists(manifest_file):
        print(f"Error: Manifest file not found at {manifest_file}")
        sys.exit(1)

    scenarios = load_manifests(manifest_file)
    print(f"Loaded {len(scenarios)} evaluation scenarios from {os.path.basename(manifest_file)}")
    print(f"Mode: {'OFFLINE (Deterministic fixtures & local solver)' if args.offline else 'LIVE API'}\n")

    adapters = [
        DirectLLMAdapter(),
        TextRAGAdapter(),
        GraphCosineAdapter(),
        PortionPlannerAdapter(),
    ]

    all_results = {}
    summary_rows = []

    for adapter in adapters:
        print(f"Evaluating System: {adapter.name}...")
        runs = []
        for scn in scenarios:
            output = adapter.run_scenario(scn, offline=args.offline)
            runs.append({
                "scenario_id": scn["scenario_id"],
                "family_id": scn["family_id"],
                "expected_feasibility": scn.get("expected_feasibility", "feasible"),
                "output": output,
            })

        metrics = BenchmarkEvaluator.evaluate_system_runs(adapter.name, runs)
        all_results[adapter.name] = {
            "metrics": metrics,
            "runs": runs,
        }
        summary_rows.append(metrics)

    # Print comparative results table
    print("\n" + "=" * 90)
    print("DESIDIET RESEARCH BENCHMARK — COMPARATIVE EVALUATION RESULTS")
    print("=" * 90)
    header = f"{'System / Adapter':<38} | {'Feasible Comp %':<15} | {'Violations / Plan':<18} | {'Abstention %':<12}"
    print(header)
    print("-" * 90)
    for row in summary_rows:
        line = (
            f"{row['adapter']:<38} | "
            f"{row['feasible_completion_rate_pct']:<15.1f} | "
            f"{row['critical_violations_per_plan']:<18.2f} | "
            f"{row['appropriate_abstention_rate_pct']:<12.1f}"
        )
        print(line)
    print("=" * 90)

    # Save results
    out_dir = os.path.join(benchmarks_dir, "results")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "benchmark_results.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    print(f"\n✅ Detailed results written to {out_path}")


if __name__ == "__main__":
    main()
