# LangGraph V2 Wrapper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the existing `FluxoOrchestrator` (linear 5-step pipeline) as a LangGraph `StateGraph`, with V1 and V2 coexisting via env flag `LANGGRAPH_ENABLED`. Validates equivalence (same input → same artifacts).

**Architecture:** New file `api/fluxo/langgraph_orchestrator.py` defines `FluxoState` TypedDict + `LangGraphFluxoOrchestrator` class. Each LangGraph node delegates to the existing `FluxoOrchestrator`'s step methods (composition, NOT rewrite). Public interface (`run_until_builder`, `write_final_summary`) matches V1 exactly so `BuilderAgent` can swap implementations transparently.

**Tech Stack:** `langgraph>=0.2.0`, Python `TypedDict`, existing `FluxoOrchestrator` (composed via `self._fluxo`).

**Out of scope for v0.1 (deferred to v0.2+):** parallel variants (fan-out/fan-in), conditional edges, human-in-the-loop interrupts, persistent checkpointer, OCI Object Storage backing.

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `api/requirements.txt` | modify | add `langgraph>=0.2.0` |
| `api/fluxo/langgraph_orchestrator.py` | create | `FluxoState` TypedDict + `LangGraphFluxoOrchestrator` class |
| `api/fluxo/__init__.py` | modify | export `LangGraphFluxoOrchestrator` |
| `builder/agent/builder_agent.py` | modify | env-flag toggle between V1 and V2 orchestrators |
| `tests/test_langgraph_orchestrator.py` | create | unit tests (state, node behavior, graph compilation) + integration equivalence test |
| `api/.env.example` | modify | document `LANGGRAPH_ENABLED` |

---

## Task 1: Add langgraph dependency

**Files:**
- Modify: `api/requirements.txt`

- [ ] **Step 1: Append langgraph to requirements**

Edit `api/requirements.txt`. Add after `oci>=2.130.0`:

```
langgraph>=0.2.0
```

- [ ] **Step 2: Install**

Run: `pip install langgraph>=0.2.0`
Expected: installs langgraph + its deps (langchain-core, langgraph-checkpoint, langgraph-prebuilt, etc).

- [ ] **Step 3: Verify import**

Run: `python -c "from langgraph.graph import StateGraph, START, END; print('ok')"`
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git -C /Users/luskoliveira/simple-ai-lsouza add api/requirements.txt
git -C /Users/luskoliveira/simple-ai-lsouza commit -m "chore: add langgraph>=0.2.0 to api/requirements.txt"
```

---

## Task 2: Define FluxoState TypedDict

**Files:**
- Create: `api/fluxo/langgraph_orchestrator.py`
- Test: `tests/test_langgraph_orchestrator.py`

- [ ] **Step 1: Write failing test for state shape**

Create `tests/test_langgraph_orchestrator.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/luskoliveira/simple-ai-lsouza && python -m pytest tests/test_langgraph_orchestrator.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'api.fluxo.langgraph_orchestrator'`

- [ ] **Step 3: Implement FluxoState**

Create `api/fluxo/langgraph_orchestrator.py`:

```python
"""LangGraph wrapper for the FluxoOrchestrator linear pipeline.

V1 (api.fluxo.orchestrator.FluxoOrchestrator) executes the 5-step pipeline
imperatively. This module wraps that same logic as a LangGraph StateGraph
so V2 can later add: parallel variants, conditional edges, persistent
checkpointing, human-in-the-loop interrupts. v0.1 is a 1:1 wrap — same
inputs, same artifacts, same return format.
"""
from __future__ import annotations

from typing import Any, Optional, TypedDict


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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/luskoliveira/simple-ai-lsouza && python -m pytest tests/test_langgraph_orchestrator.py -v`
Expected: 1 passed

- [ ] **Step 5: Commit**

```bash
git -C /Users/luskoliveira/simple-ai-lsouza add api/fluxo/langgraph_orchestrator.py tests/test_langgraph_orchestrator.py
git -C /Users/luskoliveira/simple-ai-lsouza commit -m "feat(fluxo): add FluxoState TypedDict for LangGraph V2 wrapper"
```

---

## Task 3: Skeleton LangGraphFluxoOrchestrator class

**Files:**
- Modify: `api/fluxo/langgraph_orchestrator.py`
- Modify: `tests/test_langgraph_orchestrator.py`

- [ ] **Step 1: Write failing test for class instantiation**

Append to `tests/test_langgraph_orchestrator.py`:

```python
from pathlib import Path

from api.fluxo.langgraph_orchestrator import LangGraphFluxoOrchestrator


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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_langgraph_orchestrator.py::test_orchestrator_instantiates -v`
Expected: FAIL with `ImportError: cannot import name 'LangGraphFluxoOrchestrator'`

- [ ] **Step 3: Implement skeleton class**

Append to `api/fluxo/langgraph_orchestrator.py`:

```python
from pathlib import Path

from api.fluxo.orchestrator import FluxoOrchestrator


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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_langgraph_orchestrator.py -v`
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git -C /Users/luskoliveira/simple-ai-lsouza add api/fluxo/langgraph_orchestrator.py tests/test_langgraph_orchestrator.py
git -C /Users/luskoliveira/simple-ai-lsouza commit -m "feat(fluxo): skeleton LangGraphFluxoOrchestrator class composing FluxoOrchestrator"
```

---

## Task 4: Node wrapper for step_01_contexto

**Files:**
- Modify: `api/fluxo/langgraph_orchestrator.py`
- Modify: `tests/test_langgraph_orchestrator.py`

- [ ] **Step 1: Write failing test for the node**

Append to `tests/test_langgraph_orchestrator.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_langgraph_orchestrator.py::test_node_contexto_calls_inner_step_and_updates_state -v`
Expected: FAIL with `AttributeError: '...' object has no attribute '_node_contexto'`

- [ ] **Step 3: Implement the node**

Append to `api/fluxo/langgraph_orchestrator.py` inside the class:

```python
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_langgraph_orchestrator.py::test_node_contexto_calls_inner_step_and_updates_state -v`
Expected: 1 passed

- [ ] **Step 5: Commit**

```bash
git -C /Users/luskoliveira/simple-ai-lsouza add api/fluxo/langgraph_orchestrator.py tests/test_langgraph_orchestrator.py
git -C /Users/luskoliveira/simple-ai-lsouza commit -m "feat(fluxo): add _node_contexto LangGraph node delegating to step_01_contexto"
```

---

## Task 5: Node wrappers for steps 02, 03, 04 (LLM-mocked)

**Files:**
- Modify: `api/fluxo/langgraph_orchestrator.py`
- Modify: `tests/test_langgraph_orchestrator.py`

Steps 02 and 04 invoke `FluxoModelClient` (LLM call). Tests mock those calls so the unit test stays offline. Step 03 invokes the image pipeline which is already disabled in test env (no AGENT_IMAGE_API_KEY).

- [ ] **Step 1: Write failing tests for nodes 02/03/04**

Append to `tests/test_langgraph_orchestrator.py`:

```python
from unittest.mock import patch


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
    (project_root / "FLUXO").mkdir()
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
    (project_root / "FLUXO").mkdir()
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
    (project_root / "FLUXO").mkdir()
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_langgraph_orchestrator.py -v -k "node_estruturador or node_imagens or node_instrucoes"`
Expected: 3 FAIL with `AttributeError: ... has no attribute '_node_estruturador' / '_node_imagens' / '_node_instrucoes'`

- [ ] **Step 3: Implement the three nodes**

Append to the class in `api/fluxo/langgraph_orchestrator.py`:

```python
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_langgraph_orchestrator.py -v`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git -C /Users/luskoliveira/simple-ai-lsouza add api/fluxo/langgraph_orchestrator.py tests/test_langgraph_orchestrator.py
git -C /Users/luskoliveira/simple-ai-lsouza commit -m "feat(fluxo): add LangGraph nodes for steps 02 estruturador, 03 imagens, 04 instrucoes"
```

---

## Task 6: Build StateGraph + edges (compile)

**Files:**
- Modify: `api/fluxo/langgraph_orchestrator.py`
- Modify: `tests/test_langgraph_orchestrator.py`

- [ ] **Step 1: Write failing test for graph compilation**

Append to `tests/test_langgraph_orchestrator.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_langgraph_orchestrator.py::test_graph_compiles_and_runs_linearly -v`
Expected: FAIL with `AttributeError: ... '_build_graph'`

- [ ] **Step 3: Implement _build_graph**

Add at top of `api/fluxo/langgraph_orchestrator.py` (with other imports):

```python
from langgraph.graph import StateGraph, START, END
```

Append to the class:

```python
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_langgraph_orchestrator.py::test_graph_compiles_and_runs_linearly -v`
Expected: 1 passed

- [ ] **Step 5: Commit**

```bash
git -C /Users/luskoliveira/simple-ai-lsouza add api/fluxo/langgraph_orchestrator.py tests/test_langgraph_orchestrator.py
git -C /Users/luskoliveira/simple-ai-lsouza commit -m "feat(fluxo): wire LangGraph StateGraph with linear edges through 4 nodes"
```

---

## Task 7: Public methods run_until_builder + write_final_summary

**Files:**
- Modify: `api/fluxo/langgraph_orchestrator.py`
- Modify: `tests/test_langgraph_orchestrator.py`

- [ ] **Step 1: Write failing test for public interface**

Append to `tests/test_langgraph_orchestrator.py`:

```python
def test_run_until_builder_matches_v1_return_shape(tmp_path: Path) -> None:
    """Public method must return the same dict shape as
    FluxoOrchestrator.run_until_builder so BuilderAgent can swap them."""
    project_root = tmp_path / "proj"
    (project_root / "FLUXO" / "step_01_contexto").mkdir(parents=True)
    (project_root / "FLUXO" / "step_01_contexto" / "agent.md").write_text("agent prompt")
    sites_dir = tmp_path / "sites"
    sites_dir.mkdir()

    orchestrator = LangGraphFluxoOrchestrator(project_root, sites_dir)

    fake_structured = {"image_prompts": [{"slot": "hero", "prompt": "x"}]}
    fake_assets = {"run_id": "rid", "assets": [], "failures": [], "quality_notes": [], "generation": {}}
    fake_instructions = {"builder_prompt": "Build", "section_order": ["hero"]}

    with patch.object(orchestrator._fluxo, "_step_02_estruturador", return_value=fake_structured), \
         patch.object(orchestrator._fluxo, "_step_03_imagens", return_value=fake_assets), \
         patch.object(orchestrator._fluxo, "_step_04_instrucoes_build", return_value=fake_instructions):
        result = orchestrator.run_until_builder(
            run_id="rid",
            spec={"business_name": "Test", "summary": {"brand_name": "Test"}},
            site_dir=sites_dir / "rid",
        )

    expected_keys = {"run_id", "run_dir", "completed_steps", "context", "structured",
                     "assets", "instructions", "instructions_markdown"}
    assert set(result.keys()) == expected_keys
    assert result["run_id"] == "rid"
    assert result["completed_steps"] == [
        "step_01_contexto", "step_02_estruturador", "step_03_imagens", "step_04_instrucoes_build"
    ]


def test_write_final_summary_delegates_to_v1(tmp_path: Path) -> None:
    """write_final_summary just composes through to FluxoOrchestrator."""
    project_root = tmp_path / "proj"
    (project_root / "FLUXO").mkdir()
    sites_dir = tmp_path / "sites"
    sites_dir.mkdir()
    orchestrator = LangGraphFluxoOrchestrator(project_root, sites_dir)
    site_path = sites_dir / "rid" / "index.html"

    with patch.object(orchestrator._fluxo, "write_final_summary") as inner:
        orchestrator.write_final_summary(run_id="rid", site_path=site_path, usage={"input_tokens": 1})

    inner.assert_called_once_with(run_id="rid", site_path=site_path, usage={"input_tokens": 1})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_langgraph_orchestrator.py -v -k "run_until_builder or write_final_summary"`
Expected: 2 FAIL with `AttributeError: ... has no attribute 'run_until_builder' / 'write_final_summary'`

- [ ] **Step 3: Implement public methods**

Add to top of file, near other imports:

```python
from api.fluxo.cleanup import cleanup_old_runs
```

Append to the class:

```python
    def run_until_builder(
        self,
        *,
        run_id: str,
        spec: dict[str, Any],
        site_dir: Path,
        status_callback: Optional[Any] = None,
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_langgraph_orchestrator.py -v`
Expected: 8 passed

- [ ] **Step 5: Commit**

```bash
git -C /Users/luskoliveira/simple-ai-lsouza add api/fluxo/langgraph_orchestrator.py tests/test_langgraph_orchestrator.py
git -C /Users/luskoliveira/simple-ai-lsouza commit -m "feat(fluxo): public run_until_builder + write_final_summary mirroring V1 contract"
```

---

## Task 8: Export from package __init__

**Files:**
- Modify: `api/fluxo/__init__.py`

- [ ] **Step 1: Read current __init__.py**

Run: `cat /Users/luskoliveira/simple-ai-lsouza/api/fluxo/__init__.py`
Expected: contains `from .orchestrator import FluxoOrchestrator` (and possibly other exports).

- [ ] **Step 2: Add LangGraph wrapper export**

Open `api/fluxo/__init__.py` and append:

```python
from .langgraph_orchestrator import LangGraphFluxoOrchestrator, FluxoState

__all__ = [name for name in __all__ if name] if "__all__" in dir() else []
__all__.extend(["LangGraphFluxoOrchestrator", "FluxoState"])
```

If the file does NOT use `__all__`, just append:

```python
from .langgraph_orchestrator import LangGraphFluxoOrchestrator, FluxoState
```

- [ ] **Step 3: Verify import path**

Run: `python -c "from api.fluxo import LangGraphFluxoOrchestrator; print('ok')"`
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git -C /Users/luskoliveira/simple-ai-lsouza add api/fluxo/__init__.py
git -C /Users/luskoliveira/simple-ai-lsouza commit -m "chore(fluxo): export LangGraphFluxoOrchestrator from package __init__"
```

---

## Task 9: BuilderAgent toggle via LANGGRAPH_ENABLED env

**Files:**
- Modify: `builder/agent/builder_agent.py` (around line 311 where `_fluxo_orchestrator` is set)

- [ ] **Step 1: Inspect current init**

Run: `grep -n "_fluxo_orchestrator" /Users/luskoliveira/simple-ai-lsouza/builder/agent/builder_agent.py | head -5`
Expected: line ~311 sets `self._fluxo_orchestrator = FluxoOrchestrator(self._project_root, self.sites_dir) if FluxoOrchestrator else None`

- [ ] **Step 2: Read import block (currently around line 65)**

Run: `sed -n '63,70p' /Users/luskoliveira/simple-ai-lsouza/builder/agent/builder_agent.py`
Expected: `from api.fluxo import FluxoOrchestrator` block guarded with try/except.

- [ ] **Step 3: Update import to also try LangGraph wrapper**

Edit `builder/agent/builder_agent.py` — replace the existing import block:

```python
try:
    from api.fluxo import FluxoOrchestrator
except ImportError:  # pragma: no cover
    FluxoOrchestrator = None

try:
    from api.fluxo import LangGraphFluxoOrchestrator
except ImportError:  # pragma: no cover
    LangGraphFluxoOrchestrator = None
```

- [ ] **Step 4: Update orchestrator selection at line 311**

Find the line:

```python
self._fluxo_orchestrator = FluxoOrchestrator(self._project_root, self.sites_dir) if FluxoOrchestrator else None
```

Replace with:

```python
# LANGGRAPH_ENABLED=1 swaps in the LangGraph V2 wrapper. Default keeps
# the imperative V1 FluxoOrchestrator so production stays unchanged
# until V2 is fully soaked.
_use_langgraph = os.getenv("LANGGRAPH_ENABLED", "").strip() == "1"
if _use_langgraph and LangGraphFluxoOrchestrator is not None:
    self._fluxo_orchestrator = LangGraphFluxoOrchestrator(self._project_root, self.sites_dir)
    print("[BUILDER] FLUXO orchestrator: LangGraph V2 (LANGGRAPH_ENABLED=1)")
elif FluxoOrchestrator is not None:
    self._fluxo_orchestrator = FluxoOrchestrator(self._project_root, self.sites_dir)
    print("[BUILDER] FLUXO orchestrator: V1 imperative")
else:
    self._fluxo_orchestrator = None
```

- [ ] **Step 5: Verify pytest still 34/34 + new 8 = 42**

Run: `cd /Users/luskoliveira/simple-ai-lsouza && python -m pytest tests/ -q`
Expected: `42 passed`

- [ ] **Step 6: Commit**

```bash
git -C /Users/luskoliveira/simple-ai-lsouza add builder/agent/builder_agent.py
git -C /Users/luskoliveira/simple-ai-lsouza commit -m "feat(builder): toggle FLUXO orchestrator via LANGGRAPH_ENABLED env (default V1)"
```

---

## Task 10: Document LANGGRAPH_ENABLED in .env.example

**Files:**
- Modify: `api/.env.example`

- [ ] **Step 1: Append documentation block**

Append to `api/.env.example`:

```
# Toggle the FLUXO orchestrator implementation.
# Empty/0 (default): V1 imperative pipeline (api.fluxo.orchestrator.FluxoOrchestrator)
# 1: V2 LangGraph wrapper (api.fluxo.langgraph_orchestrator.LangGraphFluxoOrchestrator)
# V2 mirrors V1 outputs 1:1 in v0.1; future versions add parallel
# variants, conditional edges, persistent checkpointing.
LANGGRAPH_ENABLED=
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/luskoliveira/simple-ai-lsouza add api/.env.example
git -C /Users/luskoliveira/simple-ai-lsouza commit -m "docs(env): document LANGGRAPH_ENABLED toggle in .env.example"
```

---

## Task 11: Manual end-to-end smoke (V2 with real LLMs)

**Files:** none modified — operational validation only.

- [ ] **Step 1: Set V2 flag in local env**

Edit `/Users/luskoliveira/simple-ai-lsouza/api/.env.local` and add:

```
LANGGRAPH_ENABLED=1
```

- [ ] **Step 2: Start backend**

```bash
cd /Users/luskoliveira/simple-ai-lsouza/api && uvicorn server:app --port 8002 --log-level info
```

Expected: log line `[BUILDER] FLUXO orchestrator: LangGraph V2 (LANGGRAPH_ENABLED=1)`

- [ ] **Step 3: Run a single smoke build**

In another terminal:

```bash
cd /Users/luskoliveira/simple-ai-lsouza
SIMPLE_AI_URL=http://localhost:8002 bash scripts/smoke_od_integration.sh padaria
```

Expected: build completes (`status=done`), HTML written to `api/sites/<job_id>/index.html`, marker `<!-- design_system_chosen: <id> -->` present, file size ≥ 10KB.

- [ ] **Step 4: Compare against V1 baseline**

Set `LANGGRAPH_ENABLED=0` (or remove the line), restart backend, run the same smoke. Compare:

- HTML size (V1 vs V2): should be similar order of magnitude (LLM non-determinism makes byte-equality impossible).
- Marker present in both.
- `usage` token counts in similar range.

If V2 fails or produces drastically different output, do NOT commit yet — investigate (Phase 1 of systematic-debugging).

- [ ] **Step 5: Stop backend and revert env flag**

`Ctrl+C` the uvicorn process. Remove `LANGGRAPH_ENABLED=1` from `api/.env.local` (or set to 0). V1 is the production default; V2 is opt-in.

- [ ] **Step 6: Final pytest sweep**

```bash
cd /Users/luskoliveira/simple-ai-lsouza && python -m pytest tests/ -q
```

Expected: `42 passed`

- [ ] **Step 7: Final status**

```bash
git -C /Users/luskoliveira/simple-ai-lsouza status
git -C /Users/luskoliveira/simple-ai-lsouza log --oneline -12
```

Expected: working tree clean. Last 10 commits trace Tasks 1–10.

---

## Notes for execution

- Each task is independently committable. If one fails, you can stop, debug, and resume without breaking earlier work.
- The graph is **compiled lazily** in `run_until_builder` (Task 7) to keep constructor cheap and avoid issues if `langgraph` import fails in environments where V2 won't be used.
- Equivalence with V1 is **structural** (same return-dict shape, same `completed_steps` order). Byte-equality of LLM outputs is impossible due to non-determinism. The Task 11 manual smoke is the human gate for "looks good enough."
- v0.2 (deferred): replace one edge with a `conditional_edge` (e.g. low-confidence retry on step 02), then add a `fanout` for parallel variants of step 02 with human-in-the-loop selection.
