from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from builder.core.asset_inputs import extract_asset_inputs_from_spec
from builder.core.image_pipeline import ImagePipeline
from builder.core.link_content_inputs import enrich_visual_prompts_with_link_content

from .cleanup import cleanup_old_runs
from .model_client import FluxoModelClient

try:
    from runtime_logs import add_runtime_log
except ImportError:  # pragma: no cover
    def add_runtime_log(*args: Any, **kwargs: Any) -> None:
        return None


StatusCallback = Callable[[str, Optional[str]], None]


class FluxoOrchestrator:
    def __init__(self, project_root: Path, sites_dir: Path):
        self.project_root = project_root
        self.sites_dir = sites_dir
        self.fluxo_dir = project_root / "FLUXO"
        self.temp_dir = self.fluxo_dir / "temp"
        self.keep_runs = int(os.getenv("FLUXO_TEMP_KEEP_RUNS", "10").strip() or "10")
        self.image_pipeline = ImagePipeline()

    def run_until_builder(self, *, run_id: str, spec: Dict[str, Any], site_dir: Path, status_callback: Optional[StatusCallback] = None) -> Dict[str, Any]:
        cleanup_old_runs(self.temp_dir, keep_runs=self.keep_runs)
        run_dir = self.temp_dir / run_id
        run_dir.mkdir(parents=True, exist_ok=True)
        self._write_json(run_dir / "00-original-payload.json", spec)

        completed: List[str] = []
        context = self._step_01_contexto(run_id, spec, run_dir, status_callback)
        completed.append("step_01_contexto")
        structured = self._step_02_estruturador(run_id, context, run_dir, status_callback)
        completed.append("step_02_estruturador")
        assets = self._step_03_imagens(run_id, structured, spec, site_dir, run_dir, status_callback)
        completed.append("step_03_imagens")
        instructions = self._step_04_instrucoes_build(run_id, structured, assets, run_dir, status_callback)
        completed.append("step_04_instrucoes_build")
        return {
            "run_id": run_id,
            "run_dir": str(run_dir),
            "completed_steps": completed,
            "context": context,
            "structured": structured,
            "assets": assets,
            "instructions": instructions,
            "instructions_markdown": (run_dir / "04-instrucoes-build.md").read_text(encoding="utf-8"),
        }

    def write_final_summary(self, *, run_id: str, site_path: Path, usage: Dict[str, Any]) -> None:
        run_dir = self.temp_dir / run_id
        run_dir.mkdir(parents=True, exist_ok=True)
        md = [
            "# Step 05 Builder Final",
            "",
            f"- site_path: {site_path}",
            f"- status: done",
            "",
            "# Usage",
            "",
            "```json",
            json.dumps(usage, ensure_ascii=False, indent=2, default=str),
            "```",
        ]
        (run_dir / "05-build-final.md").write_text("\n".join(md), encoding="utf-8")

    def _step_01_contexto(self, run_id: str, spec: Dict[str, Any], run_dir: Path, status_callback: Optional[StatusCallback]) -> Dict[str, Any]:
        self._start_step(run_id, "step_01_contexto", status_callback)
        summary = spec.get("summary") if isinstance(spec.get("summary"), dict) else {}
        context = {
            "run_id": run_id,
            "business": {
                "name": spec.get("business_name") or summary.get("brand_name") or "",
                "segment": spec.get("segment") or summary.get("business_type") or "",
                "primary_cta": summary.get("primary_cta") or "",
                "target_audience": summary.get("target_audience") or "",
            },
            "content": {
                "offerings": summary.get("offerings") or spec.get("user_facing_actions") or [],
                "modules": summary.get("modules") or spec.get("user_facing_actions") or [],
                "raw_quotes": spec.get("raw_quotes") or [],
            },
            "references": {
                "link_content": spec.get("link_content") or {},
                "design_plan": spec.get("design_plan") or summary.get("design_plan") or {},
                "visual_plan": spec.get("visual_plan") or summary.get("visual_plan") or {},
            },
            "builder": {
                "builder_model": spec.get("builder_model"),
                "builder_provider": spec.get("builder_provider"),
                "agent_profile": spec.get("agent_profile"),
            },
            "original_payload": spec,
        }
        self._write_json(run_dir / "01-contexto.json", context)
        self._write_md(run_dir / "01-contexto.md", "Step 01 Contexto", context)
        self._done_step(run_id, "step_01_contexto", status_callback)
        return context

    def _step_02_estruturador(self, run_id: str, context: Dict[str, Any], run_dir: Path, status_callback: Optional[StatusCallback]) -> Dict[str, Any]:
        self._start_step(run_id, "step_02_estruturador", status_callback)
        system_prompt = self._build_step_system_prompt(
            "step_02_estruturador",
            """
Retorne APENAS JSON valido neste formato:
{
  "business": {"name":"", "segment":"", "audience":"", "primary_cta":""},
  "content": {
    "organized": [],
    "priorities": [],
    "must_use": [],
    "must_not_invent": []
  },
  "style": {
    "visual_direction":"",
    "layout_direction":"",
    "palette": [],
    "typography":"",
    "tone":""
  },
  "image_prompts": [
    {"slot":"hero", "prompt":"", "alt":"", "caption":"", "usage_instruction":""}
  ],
  "next_agent_prompts": {"image_agent":"", "build_instruction_agent":""}
}
""".strip(),
        )
        client = FluxoModelClient.from_env(model_env="FLUXO_STRUCTURER_MODEL", default_model="cx/gpt-5.5")
        structured = client.complete_json(system_prompt=system_prompt, payload={"context": context})
        prompts = structured.get("image_prompts")
        if not isinstance(prompts, list) or not prompts:
            raise RuntimeError("Step 02 falhou: image_prompts ausente ou vazio")
        self._write_json(run_dir / "02-estruturado.json", structured)
        self._write_structured_md(run_dir / "02-estruturado.md", structured)
        self._done_step(run_id, "step_02_estruturador", status_callback)
        return structured

    def _step_03_imagens(self, run_id: str, structured: Dict[str, Any], spec: Dict[str, Any], site_dir: Path, run_dir: Path, status_callback: Optional[StatusCallback]) -> Dict[str, Any]:
        self._start_step(run_id, "step_03_imagens", status_callback)
        business_name, segment, brand_tone, target_audience, service_labels = extract_asset_inputs_from_spec(spec)
        prompts = self._normalize_image_prompts(structured.get("image_prompts"), business_name)
        prompts = enrich_visual_prompts_with_link_content(prompts, spec.get("link_content"))
        generated_assets, generation = self.image_pipeline.materialize(
            site_dir=site_dir,
            image_prompts=prompts,
            fallback_segment=segment,
            fallback_services=service_labels,
        )
        assets = []
        prompt_by_slot = {item.get("slot"): item for item in prompts if isinstance(item, dict)}
        for item in generated_assets:
            prompt_item = prompt_by_slot.get(item.get("slot"), {})
            assets.append({
                "slot": item.get("slot"),
                "status": generation.get("slots", {}).get(item.get("slot"), "unknown"),
                "url": item.get("url"),
                "alt": item.get("alt"),
                "caption": item.get("caption"),
                "prompt_used": prompt_item.get("prompt", ""),
                "usage_instruction": prompt_item.get("usage_instruction") or prompt_item.get("caption") or "Usar como imagem de apoio do site.",
            })
        manifest = {"run_id": run_id, "assets": assets, "failures": [], "quality_notes": [], "generation": generation}
        self._write_json(run_dir / "03-assets.json", manifest)
        self._write_assets_md(run_dir / "03-assets.md", manifest)
        self._done_step(run_id, "step_03_imagens", status_callback)
        return manifest

    def _step_04_instrucoes_build(self, run_id: str, structured: Dict[str, Any], assets: Dict[str, Any], run_dir: Path, status_callback: Optional[StatusCallback]) -> Dict[str, Any]:
        self._start_step(run_id, "step_04_instrucoes_build", status_callback)
        system_prompt = self._build_step_system_prompt(
            "step_04_instrucoes_build",
            """
Retorne APENAS JSON valido neste formato:
{
  "site_goal":"",
  "page_narrative":"",
  "section_order": [],
  "required_content": [],
  "asset_usage": [{"slot":"", "url":"", "section":"", "instruction":""}],
  "visual_style": {"palette": [], "typography":"", "layout":"", "tone":""},
  "non_invention_rules": [],
  "quality_criteria": [],
  "builder_prompt":""
}
""".strip(),
        )
        client = FluxoModelClient.from_env(model_env="FLUXO_BUILD_INSTRUCTIONS_MODEL", default_model="cx/gpt-5.5")
        instructions = client.complete_json(system_prompt=system_prompt, payload={"structured": structured, "assets": assets})
        if not instructions.get("builder_prompt"):
            raise RuntimeError("Step 04 falhou: builder_prompt ausente")
        self._write_json(run_dir / "04-instrucoes-build.json", instructions)
        self._write_instructions_md(run_dir / "04-instrucoes-build.md", instructions)
        self._done_step(run_id, "step_04_instrucoes_build", status_callback)
        return instructions

    def _normalize_image_prompts(self, prompts: Any, business_name: str) -> List[Dict[str, str]]:
        normalized: List[Dict[str, str]] = []
        if isinstance(prompts, list):
            for index, item in enumerate(prompts[:3], start=1):
                if not isinstance(item, dict):
                    continue
                prompt = str(item.get("prompt") or "").strip()
                if not prompt:
                    continue
                slot = str(item.get("slot") or f"image-{index}").strip() or f"image-{index}"
                normalized.append({
                    "slot": slot,
                    "prompt": prompt,
                    "alt": str(item.get("alt") or f"Imagem de {business_name}").strip(),
                    "caption": str(item.get("caption") or item.get("usage_instruction") or slot).strip(),
                    "usage_instruction": str(item.get("usage_instruction") or "").strip(),
                })
        if not normalized:
            raise RuntimeError("Step 03 falhou: nenhum prompt de imagem valido")
        return normalized[:3]

    def _read_agent_prompt(self, step_name: str) -> str:
        path = self.fluxo_dir / step_name / "agent.md"
        if not path.exists():
            raise RuntimeError(f"agent.md nao encontrado para {step_name}")
        return path.read_text(encoding="utf-8").strip()

    def _build_step_system_prompt(self, step_name: str, schema: str) -> str:
        parts = [self._read_agent_prompt(step_name)]
        for rel_path in (
            Path("shared") / "model-call-rules.md",
            Path(step_name) / "output_contract.md",
        ):
            path = self.fluxo_dir / rel_path
            if path.exists():
                parts.append(path.read_text(encoding="utf-8").strip())
        parts.append(schema)
        parts.append("Nao use markdown. Nao use bloco de codigo. Nao escreva texto fora do JSON.")
        return "\n\n".join(part for part in parts if part).strip()

    def _write_json(self, path: Path, payload: Dict[str, Any]) -> None:
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, default=str), encoding="utf-8")

    def _write_md(self, path: Path, title: str, payload: Dict[str, Any]) -> None:
        path.write_text(f"# {title}\n\n```json\n{json.dumps(payload, ensure_ascii=False, indent=2, default=str)}\n```\n", encoding="utf-8")

    def _write_structured_md(self, path: Path, payload: Dict[str, Any]) -> None:
        content = payload.get("content") if isinstance(payload.get("content"), dict) else {}
        style = payload.get("style") if isinstance(payload.get("style"), dict) else {}
        lines = ["# Conteudo Organizado", "", json.dumps(content.get("organized") or content, ensure_ascii=False, indent=2, default=str), "", "# Prioridades Do Site", ""]
        for item in content.get("priorities") or []:
            lines.append(f"- {item}")
        lines.extend(["", "# Estilo Recomendado", "", json.dumps(style, ensure_ascii=False, indent=2, default=str), "", "# Prompts Para Agentes De Imagem", ""])
        for item in payload.get("image_prompts") or []:
            lines.append(f"## {item.get('slot', 'imagem')}")
            lines.append(str(item.get("prompt") or ""))
            lines.append("")
        path.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")

    def _write_assets_md(self, path: Path, payload: Dict[str, Any]) -> None:
        lines = ["# Assets Gerados", ""]
        for asset in payload.get("assets") or []:
            lines.extend([
                f"## {asset.get('slot')}",
                f"- arquivo: {asset.get('url')}",
                f"- status: {asset.get('status')}",
                f"- alt: {asset.get('alt')}",
                f"- instrucao: {asset.get('usage_instruction')}",
                "",
            ])
        path.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")

    def _write_instructions_md(self, path: Path, payload: Dict[str, Any]) -> None:
        lines = [
            "# Objetivo Do Site", str(payload.get("site_goal") or ""), "",
            "# Narrativa Da Pagina", str(payload.get("page_narrative") or ""), "",
            "# Ordem Das Secoes", "",
        ]
        for item in payload.get("section_order") or []:
            lines.append(f"- {item}")
        lines.extend(["", "# Uso Dos Assets", "", json.dumps(payload.get("asset_usage") or [], ensure_ascii=False, indent=2, default=str), "", "# Prompt Final Para Builder", "", str(payload.get("builder_prompt") or "")])
        path.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")

    def _start_step(self, run_id: str, step: str, status_callback: Optional[StatusCallback]) -> None:
        if status_callback:
            status_callback(step, None)
        add_runtime_log("fluxo", "info", f"{step} iniciado", job_id=run_id, stage=step)

    def _done_step(self, run_id: str, step: str, status_callback: Optional[StatusCallback]) -> None:
        if status_callback:
            status_callback(step, step)
        add_runtime_log("fluxo", "info", f"{step} concluido", job_id=run_id, stage=step)
