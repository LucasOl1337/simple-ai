"""Tests for the LangGraph wrapper of FluxoOrchestrator."""
from __future__ import annotations

from pathlib import Path

from api.fluxo.langgraph_orchestrator import FluxoState, LangGraphFluxoOrchestrator


def test_fluxo_state_has_expected_keys() -> None:
    """FluxoState exposes the keys the LangGraph nodes need to read/write."""
    expected_keys = {
        "run_id",
        "spec",
        "site_dir",
        "run_dir",
        "context",
        "structured",
        "assets",
        "instructions",
        "instructions_markdown",
        "completed_steps",
    }
    assert set(FluxoState.__annotations__.keys()) == expected_keys


def test_orchestrator_instantiates(tmp_path: Path) -> None:
    """Constructor takes (project_root, sites_dir) and stores them."""
    project_root = tmp_path / "proj"
    project_root.mkdir()
    (project_root / "FLUXO").mkdir()
    sites_dir = tmp_path / "sites"
    sites_dir.mkdir()

    orchestrator = LangGraphFluxoOrchestrator(project_root, sites_dir)

    assert orchestrator.project_root == project_root
    assert orchestrator.sites_dir == sites_dir
