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

from langgraph.graph import StateGraph, START, END

from api.fluxo.cleanup import cleanup_old_runs
from api.fluxo.orchestrator import FluxoOrchestrator, StatusCallback


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
        # NOT thread-safe: _status_callback is mutated per invocation in
        # run_until_builder(). Today's deploys serialize builds (one
        # BuilderAgent worker thread per job, but only one orchestrator
        # instance), so this works. Resolve before adding v0.2 parallel
        # graph variants — the proper fix is to thread the callback
        # through LangGraph's RunnableConfig instead of instance state.
        self._status_callback: Optional[StatusCallback] = None
        # Graph compilation deferred until run_until_builder() to keep
        # constructor cheap (mirrors FluxoOrchestrator).
        self._graph: Optional[Any] = None

    def _node_contexto(self, state: FluxoState) -> dict[str, Any]:
        """LangGraph node wrapping FluxoOrchestrator._step_01_contexto."""
        ctx = self._fluxo._step_01_contexto(
            state["run_id"],
            state["spec"],
            Path(state["run_dir"]),
            self._status_callback,
        )
        return {
            "context": ctx,
            "completed_steps": state["completed_steps"] + ["step_01_contexto"],
        }

    def _node_estruturador(self, state: FluxoState) -> dict[str, Any]:
        """Node for step 02: structurer (LLM call via FluxoModelClient)."""
        structured = self._fluxo._step_02_estruturador(
            state["run_id"],
            state["context"],
            Path(state["run_dir"]),
            self._status_callback,
        )
        return {
            "structured": structured,
            "completed_steps": state["completed_steps"] + ["step_02_estruturador"],
        }

    def _node_imagens(self, state: FluxoState) -> dict[str, Any]:
        """Node for step 03: image generation / placeholder fallback."""
        assets = self._fluxo._step_03_imagens(
            state["run_id"],
            state["structured"],
            state["spec"],
            Path(state["site_dir"]),
            Path(state["run_dir"]),
            self._status_callback,
        )
        return {
            "assets": assets,
            "completed_steps": state["completed_steps"] + ["step_03_imagens"],
        }

    def _node_instrucoes(self, state: FluxoState) -> dict[str, Any]:
        """Node for step 04: build-instructions (LLM call via FluxoModelClient)."""
        instructions = self._fluxo._step_04_instrucoes_build(
            state["run_id"],
            state["structured"],
            state["assets"],
            Path(state["run_dir"]),
            self._status_callback,
        )
        instructions_md = (Path(state["run_dir"]) / "04-instrucoes-build.md").read_text(encoding="utf-8")
        return {
            "instructions": instructions,
            "instructions_markdown": instructions_md,
            "completed_steps": state["completed_steps"] + ["step_04_instrucoes_build"],
        }

    def _build_graph(self) -> Any:
        """Compose the linear V1 pipeline as a LangGraph StateGraph.

        Edges form a chain: START → contexto → estruturador → imagens →
        instrucoes → END. Future versions can replace any edge with a
        conditional or fan-out without touching node implementations.
        """
        graph = StateGraph(FluxoState)
        graph.add_node("step_01_contexto", self._node_contexto)
        graph.add_node("step_02_estruturador", self._node_estruturador)
        graph.add_node("step_03_imagens", self._node_imagens)
        graph.add_node("step_04_instrucoes_build", self._node_instrucoes)
        graph.add_edge(START, "step_01_contexto")
        graph.add_edge("step_01_contexto", "step_02_estruturador")
        graph.add_edge("step_02_estruturador", "step_03_imagens")
        graph.add_edge("step_03_imagens", "step_04_instrucoes_build")
        graph.add_edge("step_04_instrucoes_build", END)
        return graph.compile()

    def run_until_builder(
        self,
        *,
        run_id: str,
        spec: dict[str, Any],
        site_dir: Path,
        status_callback: Optional[StatusCallback] = None,
    ) -> dict[str, Any]:
        """Compile the graph (lazy) and invoke it. Mirrors
        FluxoOrchestrator.run_until_builder's signature and return shape."""
        cleanup_old_runs(self._fluxo.temp_dir, keep_runs=self._fluxo.keep_runs)
        run_dir = self._fluxo.temp_dir / run_id
        run_dir.mkdir(parents=True, exist_ok=True)
        self._fluxo._write_json(run_dir / "00-original-payload.json", spec)

        self._status_callback = status_callback
        if self._graph is None:
            self._graph = self._build_graph()

        initial: FluxoState = {
            "run_id": run_id,
            "spec": spec,
            "site_dir": str(site_dir),
            "run_dir": str(run_dir),
            "context": None,
            "structured": None,
            "assets": None,
            "instructions": None,
            "instructions_markdown": None,
            "completed_steps": [],
        }
        final_state = self._graph.invoke(initial)

        return {
            "run_id": run_id,
            "run_dir": str(run_dir),
            "completed_steps": final_state["completed_steps"],
            "context": final_state["context"],
            "structured": final_state["structured"],
            "assets": final_state["assets"],
            "instructions": final_state["instructions"],
            "instructions_markdown": final_state["instructions_markdown"],
        }

    def write_final_summary(self, *, run_id: str, site_path: Path, usage: dict[str, Any]) -> None:
        """Step 05: identical to V1, no graph involvement."""
        self._fluxo.write_final_summary(run_id=run_id, site_path=site_path, usage=usage)
