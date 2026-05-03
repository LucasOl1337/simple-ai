"""LangGraph wrapper for the FluxoOrchestrator linear pipeline.

V1 (api.fluxo.orchestrator.FluxoOrchestrator) executes the 5-step pipeline
imperatively. This module wraps that same logic as a LangGraph StateGraph
so V2 can later add: parallel variants, conditional edges, persistent
checkpointing, human-in-the-loop interrupts. v0.1 is a 1:1 wrap — same
inputs, same artifacts, same return format.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Optional, TypedDict

from api.fluxo.orchestrator import FluxoOrchestrator


class FluxoState(TypedDict):
    """Carries pipeline data across LangGraph nodes.

    All optional fields start as None and are filled by their respective
    node. `completed_steps` accumulates step names for telemetry parity
    with FluxoOrchestrator.run_until_builder()'s return value.
    """

    run_id: str
    spec: dict[str, Any]
    site_dir: str  # serialized Path
    run_dir: str   # serialized Path
    context: Optional[dict[str, Any]]
    structured: Optional[dict[str, Any]]
    assets: Optional[dict[str, Any]]
    instructions: Optional[dict[str, Any]]
    instructions_markdown: Optional[str]
    completed_steps: list[str]


class LangGraphFluxoOrchestrator:
    """LangGraph-based wrapper around FluxoOrchestrator.

    Composes the existing imperative orchestrator: each LangGraph node
    delegates to one of the inner FluxoOrchestrator's step methods. Public
    interface mirrors FluxoOrchestrator so BuilderAgent can swap between
    them via the LANGGRAPH_ENABLED env flag.
    """

    def __init__(self, project_root: Path, sites_dir: Path) -> None:
        self.project_root = project_root
        self.sites_dir = sites_dir
        self._fluxo = FluxoOrchestrator(project_root, sites_dir)
        self._status_callback: Optional[Any] = None
        # Graph compilation deferred until run_until_builder() to keep
        # constructor cheap (mirrors FluxoOrchestrator).
        self._graph: Optional[Any] = None
