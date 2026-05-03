"""Tests for the LangGraph wrapper of FluxoOrchestrator."""
from __future__ import annotations

from api.fluxo.langgraph_orchestrator import FluxoState


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
