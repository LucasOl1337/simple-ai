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


def test_node_contexto_calls_inner_step_and_updates_state(tmp_path: Path) -> None:
    """The contexto node delegates to FluxoOrchestrator._step_01_contexto
    and merges the result into state['context'] + 'completed_steps'."""
    project_root = tmp_path / "proj"
    (project_root / "FLUXO" / "step_01_contexto").mkdir(parents=True)
    (project_root / "FLUXO" / "step_01_contexto" / "agent.md").write_text("test agent prompt")
    sites_dir = tmp_path / "sites"
    sites_dir.mkdir()

    orchestrator = LangGraphFluxoOrchestrator(project_root, sites_dir)

    run_dir = project_root / "FLUXO" / "temp" / "run-test"
    run_dir.mkdir(parents=True)

    state: FluxoState = {
        "run_id": "run-test",
        "spec": {"business_name": "Test Co", "summary": {"brand_name": "Test Co"}},
        "site_dir": str(sites_dir / "run-test"),
        "run_dir": str(run_dir),
        "context": None,
        "structured": None,
        "assets": None,
        "instructions": None,
        "instructions_markdown": None,
        "completed_steps": [],
    }

    update = orchestrator._node_contexto(state)

    assert "context" in update
    assert update["context"]["run_id"] == "run-test"
    assert update["completed_steps"] == ["step_01_contexto"]
