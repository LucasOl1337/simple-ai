"""Tests for the LangGraph wrapper of FluxoOrchestrator."""
from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

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


def _state_with(run_dir: Path, sites_dir: Path, **overrides) -> FluxoState:
    base: FluxoState = {
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
    base.update(overrides)  # type: ignore[typeddict-item]
    return base


def test_node_estruturador_delegates_and_updates_state(tmp_path: Path) -> None:
    project_root = tmp_path / "proj"
    (project_root / "FLUXO").mkdir(parents=True)
    sites_dir = tmp_path / "sites"
    sites_dir.mkdir()
    run_dir = project_root / "FLUXO" / "temp" / "run-test"
    run_dir.mkdir(parents=True)

    orchestrator = LangGraphFluxoOrchestrator(project_root, sites_dir)
    fake_structured = {"image_prompts": [{"slot": "hero", "prompt": "x"}]}

    with patch.object(orchestrator._fluxo, "_step_02_estruturador", return_value=fake_structured) as inner:
        state = _state_with(run_dir, sites_dir, context={"foo": "bar"}, completed_steps=["step_01_contexto"])
        update = orchestrator._node_estruturador(state)

    inner.assert_called_once()
    assert update["structured"] == fake_structured
    assert update["completed_steps"] == ["step_01_contexto", "step_02_estruturador"]


def test_node_imagens_delegates_and_updates_state(tmp_path: Path) -> None:
    project_root = tmp_path / "proj"
    (project_root / "FLUXO").mkdir(parents=True)
    sites_dir = tmp_path / "sites"
    sites_dir.mkdir()
    run_dir = project_root / "FLUXO" / "temp" / "run-test"
    run_dir.mkdir(parents=True)

    orchestrator = LangGraphFluxoOrchestrator(project_root, sites_dir)
    fake_assets = {"run_id": "run-test", "assets": [], "failures": [], "quality_notes": [], "generation": {}}

    with patch.object(orchestrator._fluxo, "_step_03_imagens", return_value=fake_assets) as inner:
        state = _state_with(
            run_dir, sites_dir,
            context={"foo": "bar"},
            structured={"image_prompts": [{"slot": "hero", "prompt": "x"}]},
            completed_steps=["step_01_contexto", "step_02_estruturador"],
        )
        update = orchestrator._node_imagens(state)

    inner.assert_called_once()
    assert update["assets"] == fake_assets
    assert "step_03_imagens" in update["completed_steps"]


def test_node_instrucoes_delegates_and_updates_state(tmp_path: Path) -> None:
    project_root = tmp_path / "proj"
    (project_root / "FLUXO").mkdir(parents=True)
    sites_dir = tmp_path / "sites"
    sites_dir.mkdir()
    run_dir = project_root / "FLUXO" / "temp" / "run-test"
    run_dir.mkdir(parents=True)
    (run_dir / "04-instrucoes-build.md").write_text("# Mock instructions markdown\n")

    orchestrator = LangGraphFluxoOrchestrator(project_root, sites_dir)
    fake_instructions = {"builder_prompt": "Build it", "section_order": ["hero"]}

    with patch.object(orchestrator._fluxo, "_step_04_instrucoes_build", return_value=fake_instructions) as inner:
        state = _state_with(
            run_dir, sites_dir,
            structured={"image_prompts": []},
            assets={"assets": []},
            completed_steps=["step_01_contexto", "step_02_estruturador", "step_03_imagens"],
        )
        update = orchestrator._node_instrucoes(state)

    inner.assert_called_once()
    assert update["instructions"] == fake_instructions
    assert update["instructions_markdown"] == "# Mock instructions markdown\n"
    assert "step_04_instrucoes_build" in update["completed_steps"]


def test_graph_compiles_and_runs_linearly(tmp_path: Path) -> None:
    """Compiled graph executes the 4 nodes in order, producing the same
    completed_steps sequence as FluxoOrchestrator."""
    project_root = tmp_path / "proj"
    (project_root / "FLUXO" / "step_01_contexto").mkdir(parents=True)
    (project_root / "FLUXO" / "step_01_contexto" / "agent.md").write_text("agent prompt")
    sites_dir = tmp_path / "sites"
    sites_dir.mkdir()

    orchestrator = LangGraphFluxoOrchestrator(project_root, sites_dir)
    run_dir = project_root / "FLUXO" / "temp" / "run-graph"
    run_dir.mkdir(parents=True)
    (run_dir / "04-instrucoes-build.md").write_text("# instructions\n")

    initial: FluxoState = _state_with(run_dir, sites_dir, run_id="run-graph")

    fake_structured = {"image_prompts": [{"slot": "hero", "prompt": "x"}]}
    fake_assets = {"run_id": "run-graph", "assets": [], "failures": [], "quality_notes": [], "generation": {}}
    fake_instructions = {"builder_prompt": "Build", "section_order": ["hero"]}

    with patch.object(orchestrator._fluxo, "_step_02_estruturador", return_value=fake_structured), \
         patch.object(orchestrator._fluxo, "_step_03_imagens", return_value=fake_assets), \
         patch.object(orchestrator._fluxo, "_step_04_instrucoes_build", return_value=fake_instructions):
        compiled = orchestrator._build_graph()
        final = compiled.invoke(initial)

    assert final["completed_steps"] == [
        "step_01_contexto",
        "step_02_estruturador",
        "step_03_imagens",
        "step_04_instrucoes_build",
    ]
    assert final["structured"] == fake_structured
    assert final["assets"] == fake_assets
    assert final["instructions"] == fake_instructions
