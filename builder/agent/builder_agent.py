# -*- coding: utf-8 -*-
"""
Agente 02 — Builder runtime.

Streams HTML from an LLM given a business spec, then writes the result to
disk for the FastAPI app to serve.

Provider resolution order:
  1. AGENT_LLM_PROVIDER env var (anthropic | openai-compatible | nvidia | zai | openrouter)
  2. Presence of ANTHROPIC_API_KEY alone (backwards compat — implies provider=anthropic)
  3. Local deterministic fallback when no provider is configured
"""
from __future__ import annotations

import os
import re
import html
import json
import time
import threading
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import quote, quote_plus

try:
    import anthropic
except ImportError:
    anthropic = None

from builder.prompts.builder import (
    AGENTE_02_BUILDER_SYSTEM_PROMPT,
    PROMPT_VERSION,
    build_messages,
)
from builder.core.asset_inputs import extract_asset_inputs_from_spec
from builder.core.image_pipeline import (
    ImagePipeline,
    build_asset_prompt_context,
    ensure_assets_present_in_html,
    resolve_visual_prompts,
)
from builder.core.site_qa import repair_site_html
from builder.core.site_score import score_site_html
from builder.core.content_strategy import build_content_strategy
from builder.core.layout_recipes import build_layout_recipes
from builder.core.link_content_inputs import (
    build_link_content_prompt_context,
    enrich_visual_prompts_with_link_content,
)
from builder.core.design_template_selector import (
    select_design_template,
    selected_template_to_prompt_block,
)
from builder.core.design_systems_catalog import narrow_top3, DesignSystemSpec
from builder.core.od_skills_router import match_skill, load_skill_instructions
from builder.prompts.od_checklists import (
    ANTI_AI_SLOP_CHECKLIST_EN,
    SELF_CRITIQUE_PROTOCOL_EN,
    LANGUAGE_OVERRIDE,
)

try:
    from api.fluxo import FluxoOrchestrator
except ImportError:  # pragma: no cover
    FluxoOrchestrator = None

try:
    from runtime_logs import add_runtime_log
except ImportError:  # pragma: no cover
    def add_runtime_log(*args: Any, **kwargs: Any) -> None:
        return None


HTML_FENCE_PATTERN = re.compile(
    r"^```(?:html)?\s*\n(.*?)\n```\s*$",
    re.DOTALL,
)

_PROVIDER_KEY_MAP = {
    "anthropic": "ANTHROPIC_API_KEY",
    "nvidia": "NVIDIA_API_KEY",
    "zai": "ZAI_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
}

_PROVIDER_BASE_URLS = {
    "nvidia": "https://integrate.api.nvidia.com/v1",
    "zai": "https://api.z.ai/api/paas/v4",
    "openrouter": "https://openrouter.ai/api/v1",
}

_PROVIDER_DEFAULT_MODELS = {
    "anthropic": "claude-opus-4-7",
    "openrouter": "anthropic/claude-opus-4",
    "nvidia": "meta/llama-3.3-70b-instruct",
    "zai": "gpt-4o",
    "openai-compatible": "gpt-4o",
}

_VALID_PROVIDERS = frozenset(
    {"anthropic", "openai-compatible", "nvidia", "zai", "openrouter"}
)

_DEFAULT_BUILDER_AGENT_PROFILE = "site-builder-core"
_DEFAULT_IMAGE_BASE_URL = "http://localhost:20128/v1"
_ENABLE_PREGENERATED_ASSETS = os.getenv("BUILDER_ASSET_FIRST_ENABLED", "1").strip().lower() not in {"0", "false", "no", "off"}

_SEGMENT_THEMES = {
    "mechanic": {
        "ink": "#f0f0f0", "muted": "#9ca3af", "paper": "#111111",
        "line": "#2d2d2d", "accent": "#f57c00", "accent_dark": "#e65100",
        "warm": "#1e1e1e", "card": "rgba(30, 30, 30, 0.9)",
    },
    "bakery": {
        "ink": "#3e2723", "muted": "#6d4c41", "paper": "#fdf8f0",
        "line": "#d7ccc8", "accent": "#bf360c", "accent_dark": "#e64a19",
        "warm": "#fff3e0", "card": "rgba(255, 255, 255, 0.88)",
    },
    "clinic": {
        "ink": "#1a237e", "muted": "#546e7a", "paper": "#f8fafd",
        "line": "#cfd8dc", "accent": "#0077b6", "accent_dark": "#005f8e",
        "warm": "#e3f2fd", "card": "rgba(255, 255, 255, 0.92)",
    },
    "beauty": {
        "ink": "#212121", "muted": "#757575", "paper": "#fdf6f0",
        "line": "#e0d0c1", "accent": "#8d2848", "accent_dark": "#6a1b35",
        "warm": "#fce4ec", "card": "rgba(255, 255, 255, 0.88)",
    },
    "restaurant": {
        "ink": "#1a0a00", "muted": "#8d6e63", "paper": "#fff8f0",
        "line": "#d7ccc8", "accent": "#c62828", "accent_dark": "#a31515",
        "warm": "#fff3e0", "card": "rgba(255, 255, 255, 0.9)",
    },
    "default": {
        "ink": "#17211b", "muted": "#5d6b63", "paper": "#fbfaf6",
        "line": "#d8ded5", "accent": "#2f7d59", "accent_dark": "#1f5f42",
        "warm": "#f3dfb6", "card": "rgba(255, 255, 255, 0.78)",
    },
}

_SEGMENT_TAGLINES = {
    "mechanic": "Serviços automotivos com qualidade, rapidez e transparência.",
    "bakery": "Produtos frescos feitos com cuidado, todo dia.",
    "clinic": "Atendimento especializado com cuidado e atenção.",
    "beauty": "Beleza e bem-estar com dedicação e carinho.",
    "restaurant": "Sabor e qualidade em cada refeição.",
    "retail": "Produtos selecionados para o seu dia a dia.",
    "education": "Conhecimento e desenvolvimento para todos.",
    "legal": "Assessoria jurídica com seriedade e comprometimento.",
    "cleaning": "Limpeza profissional para o seu espaço.",
    "fitness": "Saúde e qualidade de vida ao seu alcance.",
    "construction": "Construção e reforma com excelência e cuidado.",
    "tech": "Soluções em tecnologia sob medida para você.",
    "default": "Atendimento de qualidade para o seu negócio.",
}


def _resolve_llm_config() -> tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
    """Return (provider, api_key, base_url, model) or (None, ...) for local fallback."""
    provider = os.getenv("AGENT_LLM_PROVIDER", "").lower().strip()

    if not provider:
        # Backwards compat: ANTHROPIC_API_KEY alone means anthropic provider
        if os.getenv("ANTHROPIC_API_KEY", "").strip():
            provider = "anthropic"
        else:
            return None, None, None, None

    if provider not in _VALID_PROVIDERS:
        print(f"[BUILDER] Unknown AGENT_LLM_PROVIDER={provider!r}. Falling back to local mode.")
        return None, None, None, None

    # API key
    api_key = os.getenv("AGENT_LLM_API_KEY", "").strip()
    if not api_key:
        env_var = _PROVIDER_KEY_MAP.get(provider, "")
        api_key = os.getenv(env_var, "").strip() if env_var else ""
    if not api_key:
        print(f"[BUILDER] No API key found for provider={provider!r}. Falling back to local mode.")
        return None, None, None, None

    # Base URL
    base_url = os.getenv("AGENT_LLM_BASE_URL", "").strip() or _PROVIDER_BASE_URLS.get(provider, "")

    # Model
    model = (
        os.getenv("AGENT_LLM_MODEL", "").strip()
        or os.getenv("BUILDER_LLM_MODEL", "").strip()
        or _PROVIDER_DEFAULT_MODELS.get(provider, "gpt-4o")
    )

    return provider, api_key, base_url, model


def _normalize_for_match(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in nfkd if unicodedata.category(c) != "Mn")


def _detect_segment_id(segment_label: str) -> str:
    s = _normalize_for_match(segment_label)
    if any(k in s for k in ("oficina", "automotivo", "mecanico", "construcao", "reforma")):
        return "mechanic"
    if any(k in s for k in ("padaria", "confeitaria", "cafe", "doce", "restaurante", "alimentacao", "lanchonete", "hamburgueria", "pizzaria")):
        return "bakery"
    if any(k in s for k in ("clinica", "consultorio", "medico", "dentista", "fisioterapia", "estetica", "saude")):
        return "clinic"
    if any(k in s for k in ("salao", "barbearia", "beleza", "spa", "nail", "manicure", "cabelo")):
        return "beauty"
    if any(k in s for k in ("restaurante", "alimentacao", "menu")):
        return "restaurant"
    if any(k in s for k in ("loja", "comercio", "produto", "varejo")):
        return "retail"
    if any(k in s for k in ("escola", "curso", "aula", "ensino", "mentoria", "coaching")):
        return "education"
    if any(k in s for k in ("advocacia", "contador", "contabilidade", "juridico")):
        return "legal"
    if any(k in s for k in ("limpeza", "faxina", "diarista")):
        return "cleaning"
    if any(k in s for k in ("academia", "personal", "treino", "fitness")):
        return "fitness"
    if any(k in s for k in ("construcao", "reforma", "arquiteto", "engenheiro")):
        return "construction"
    if any(k in s for k in ("informatica", "computador", "celular", "software", "app")):
        return "tech"
    return "default"


@dataclass
class BuildJob:
    job_id: str
    status: str  # queued | building | done | error
    spec: Dict[str, Any]
    site_path: Optional[Path] = None
    site_url: Optional[str] = None
    error: Optional[str] = None
    streamed_chars: int = 0
    usage: Dict[str, int] = field(default_factory=dict)
    current_step: Optional[str] = None
    completed_steps: list[str] = field(default_factory=list)

    def snapshot(self) -> Dict[str, Any]:
        return {
            "job_id": self.job_id,
            "status": self.status,
            "site_url": self.site_url,
            "error": self.error,
            "streamed_chars": self.streamed_chars,
            "usage": self.usage,
            "current_step": self.current_step,
            "completed_steps": self.completed_steps,
        }


def _strip_html_fence(text: str) -> str:
    text = text.strip()
    match = HTML_FENCE_PATTERN.match(text)
    if match:
        return match.group(1).strip()
    if text.lower().startswith("<!doctype"):
        return text
    doctype_idx = text.lower().find("<!doctype")
    if doctype_idx > 0:
        return text[doctype_idx:].strip()
    return text


def _should_runtime_fallback(exc: Exception) -> bool:
    message = str(exc or "").lower()
    transient_signals = (
        "insufficient balance",
        "no resource package",
        "rate limit",
        "429",
        "quota",
        "temporarily unavailable",
        "timeout",
        "connection",
        "api connection",
        "service unavailable",
    )
    return any(signal in message for signal in transient_signals)


class BuilderAgent:
    def __init__(self, sites_dir: Path, model: Optional[str] = None):
        provider, api_key, base_url, resolved_model = _resolve_llm_config()

        self.provider = provider
        self.use_local_fallback = provider is None
        self.model = model or resolved_model or "claude-opus-4-7"
        self.sites_dir = sites_dir
        self.sites_dir.mkdir(parents=True, exist_ok=True)

        self._jobs: Dict[str, BuildJob] = {}
        self._lock = threading.Lock()
        self._project_root = Path(__file__).resolve().parents[2]
        self._profiles_dir = self._project_root / "AgentesProfiles"
        self._design_templates_dir = self._project_root / "DesignTemplates"
        self._design_taxonomy_dir = self._design_templates_dir / "taxonomy"
        self._design_agent_ready_dir = self._design_templates_dir / "agent-ready"
        self._default_agent_profile = (
            os.getenv("BUILDER_AGENT_PROFILE", _DEFAULT_BUILDER_AGENT_PROFILE).strip()
            or _DEFAULT_BUILDER_AGENT_PROFILE
        )
        self.client = None
        self._openai_client = None
        self._image_pipeline = ImagePipeline()
        self._fluxo_orchestrator = FluxoOrchestrator(self._project_root, self.sites_dir) if FluxoOrchestrator else None

        def activate_local_fallback(reason: str) -> None:
            print(f"[BUILDER] {reason}. Falling back to local mode.")
            self.provider = None
            self.client = None
            self._openai_client = None
            self.use_local_fallback = True

        if provider == "anthropic":
            if anthropic is None:
                activate_local_fallback(
                    "anthropic package is required for provider=anthropic (run: pip install anthropic)"
                )
            else:
                self.client = anthropic.Anthropic(api_key=api_key)
                print(f"[BUILDER] provider=anthropic model={self.model}")

        elif provider in ("openai-compatible", "nvidia", "zai", "openrouter"):
            try:
                import openai as _openai
                self._openai_client = _openai.OpenAI(
                    api_key=api_key,
                    base_url=base_url or None,
                )
                print(f"[BUILDER] provider={provider} base_url={base_url!r} model={self.model}")
            except ImportError:
                activate_local_fallback(
                    f"openai package is required for provider={provider} (run: pip install openai)"
                )

        else:
            print("[BUILDER] No LLM provider configured — using local fallback mode.")

        self._image_pipeline.log_startup()

    def _resolve_profile_name(self, job: BuildJob) -> str:
        design_plan = job.spec.get("design_plan") or {}
        planned = str(design_plan.get("agent_profile") or "").strip() if isinstance(design_plan, dict) else ""
        requested = str(job.spec.get("agent_profile") or "").strip()
        return requested or planned or self._default_agent_profile

    def _profile_path(self, profile_name: str) -> Path:
        safe = profile_name.strip().replace("..", "").replace("/", "-").replace("\\", "-")
        if safe.endswith(".md"):
            safe = safe[:-3]
        return self._profiles_dir / f"{safe}.md"

    def _load_profile_prompt(self, profile_name: str) -> str:
        path = self._profile_path(profile_name)
        if not path.exists() or not path.is_file():
            raise RuntimeError(f"Perfil de agente nao encontrado: {profile_name}. Esperado em {path}")
        return path.read_text(encoding="utf-8").strip()

    def _read_design_template_text(self, *relative_parts: str) -> str:
        path = self._design_templates_dir.joinpath(*relative_parts)
        if not path.exists() or not path.is_file():
            return ""
        try:
            return path.read_text(encoding="utf-8").strip()
        except OSError:
            return ""

    def _load_design_reference_index(self) -> list[dict[str, Any]]:
        raw = self._read_design_template_text("agent-ready", "references-index.json")
        if not raw:
            return []
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return []
        return data if isinstance(data, list) else []

    def _resolve_layout_guidance_file(self, layout_family: str) -> Optional[str]:
        mapping = {
            "conversion-landing": "landing-pages/README.md",
            "local-trust": "local-services/README.md",
            "catalog-grid": "catalogs/README.md",
            "image-led": "warm-artisanal/README.md",
            "editorial-onepage": "editorial-premium/README.md",
        }
        return mapping.get(layout_family)

    def _format_top3_design_systems(
        self, systems: list["DesignSystemSpec"]
    ) -> str:
        if not systems:
            return ""
        lines = [
            "# BIBLIOTECA DE DESIGN: TOP-3 DESIGN SYSTEMS (OPEN DESIGN)",
            "",
            "Você recebe três sistemas candidatos. Escolha UM e use a paleta",
            "OKLch e a typography stack do escolhido. Insira um comentário HTML",
            "imediatamente antes de `<html>` no formato:",
            "    <!-- design_system_chosen: <id> -->",
            "para que a escolha fique auditável nos logs.",
            "",
        ]
        for rank, system in enumerate(systems, start=1):
            palette = ", ".join(
                f"{k}={v}" for k, v in sorted(system.palette_oklch.items())
            ) or "(sem paleta declarada)"
            typo = ", ".join(
                f"{k}={v}" for k, v in sorted(system.typography.items())
            ) or "(sem typography declarada)"
            lines.append(f"## #{rank} — {system.name} (id={system.id})")
            lines.append(f"- school: {system.school}")
            lines.append(f"- density: {system.density}")
            lines.append(f"- palette: {palette}")
            lines.append(f"- typography: {typo}")
            lines.append(f"- source: {system.source_url}")
            lines.append("")
        return "\n".join(lines).rstrip()

    def _collect_design_library_context(self, job: BuildJob) -> str:
        design_plan = job.spec.get("design_plan") or job.spec.get("summary", {}).get("design_plan") or {}
        if not isinstance(design_plan, dict) or not design_plan:
            return ""

        layout_family = str(design_plan.get("layout_family") or "").strip()
        visual_style = str(design_plan.get("visual_style") or "").strip()
        design_notes = design_plan.get("design_notes") if isinstance(design_plan.get("design_notes"), dict) else {}
        reference_ids = design_notes.get("reference_ids") or []

        sections: list[str] = []

        design_rules = self._read_design_template_text("agent-ready", "design-rules.md")
        if design_rules:
            sections.append("# BIBLIOTECA DE DESIGN: REGRAS OPERACIONAIS\n" + design_rules)

        hyperframes_quality = self._read_design_template_text("agent-ready", "hyperframes-site-quality.md")
        if hyperframes_quality:
            sections.append("# BIBLIOTECA DE DESIGN: QUALIDADE INSPIRADA EM HYPERFRAMES\n" + hyperframes_quality)

        style_map = self._read_design_template_text("agent-ready", "style-to-segment-map.md")
        if style_map:
            sections.append("# BIBLIOTECA DE DESIGN: MAPA DE ESTILO POR SEGMENTO\n" + style_map)

        layout_matrix = self._read_design_template_text("agent-ready", "layout-selection-matrix.md")
        if layout_matrix:
            sections.append("# BIBLIOTECA DE DESIGN: MATRIZ DE LAYOUT\n" + layout_matrix)

        anti_patterns = self._read_design_template_text("taxonomy", "anti-patterns.md")
        if anti_patterns:
            sections.append("# BIBLIOTECA DE DESIGN: ANTI-PADROES\n" + anti_patterns)

        if visual_style:
            visual_styles = self._read_design_template_text("taxonomy", "visual-styles.md")
            if visual_styles:
                sections.append("# BIBLIOTECA DE DESIGN: ESTILOS VISUAIS\n" + visual_styles)

        layout_file = self._resolve_layout_guidance_file(layout_family)
        if layout_file:
            gallery_text = self._read_design_template_text("galleries", *layout_file.split("/"))
            if gallery_text:
                sections.append("# BIBLIOTECA DE DESIGN: GALERIA RELEVANTE\n" + gallery_text)

        index_entries = self._load_design_reference_index()
        if index_entries and reference_ids:
            matched_entries = [
                entry for entry in index_entries
                if isinstance(entry, dict) and entry.get("id") in reference_ids
            ]
            if matched_entries:
                lines = []
                for entry in matched_entries[:5]:
                    title = entry.get("title") or entry.get("id") or "referencia"
                    url = entry.get("url") or ""
                    notes = entry.get("notes") or ""
                    focus = ", ".join(entry.get("focus") or []) if isinstance(entry.get("focus"), list) else ""
                    lines.append(f"- {title}: {focus}. {notes} Fonte: {url}")
                sections.append("# BIBLIOTECA DE DESIGN: REFERENCIAS RECOMENDADAS\n" + "\n".join(lines))

        # === Open Design augmentation (vendor-only, server-side) ===
        try:
            vendor_root = self._project_root / "vendor" / "open-design"

            top3_systems = narrow_top3(job.spec)
            top3_block = self._format_top3_design_systems(top3_systems)
            if top3_block:
                sections.append(top3_block)

            skill_id = match_skill(job.spec)
            try:
                skill_md = load_skill_instructions(
                    skill_id, vendor_root / "skills"
                )
                sections.append(
                    f"# BIBLIOTECA DE DESIGN: SKILL ESCOLHIDA — {skill_id}\n"
                    f"{skill_md}"
                )
            except (ValueError, FileNotFoundError):
                # Skill MD missing or unknown → skip silently; smoke logs catch it
                pass

            sections.append(
                "# BIBLIOTECA DE DESIGN: ANTI-AI-SLOP (OPEN DESIGN, EN)\n"
                f"{ANTI_AI_SLOP_CHECKLIST_EN}"
            )
            sections.append(
                "# BIBLIOTECA DE DESIGN: 5-DIM SELF-CRITIQUE (OPEN DESIGN, EN)\n"
                f"{SELF_CRITIQUE_PROTOCOL_EN}"
            )
            sections.append(LANGUAGE_OVERRIDE)
        except Exception as exc:  # noqa: BLE001 — smoke-only path, never crash builds
            import sys
            print(f"[OD] augmentation failed: {exc}", file=sys.stderr)
        # === End Open Design augmentation ===

        return "\n\n".join(section for section in sections if section).strip()

    def _build_system_prompt_for_job(self, job: BuildJob) -> str:
        profile_name = self._resolve_profile_name(job)
        profile_text = self._load_profile_prompt(profile_name)
        design_plan = job.spec.get("design_plan") or job.spec.get("summary", {}).get("design_plan") or {}
        design_notes = design_plan.get("design_notes") if isinstance(design_plan, dict) else None
        selected_template = select_design_template(job.spec, self._project_root)
        selected_template_context = selected_template_to_prompt_block(selected_template)
        design_library_context = self._collect_design_library_context(job)
        content_strategy_context = build_content_strategy(job.spec).to_prompt_block()
        layout_recipe_context = build_layout_recipes(job.spec).to_prompt_block()
        link_content_context = build_link_content_prompt_context(job.spec.get("link_content"))

        design_context = ""
        if isinstance(design_plan, dict) and design_plan:
            design_context = (
                "# PLANO DE DESIGN E DIRECAO VISUAL\n"
                f"- layout_family: {design_plan.get('layout_family') or 'não definido'}\n"
                f"- visual_style: {design_plan.get('visual_style') or 'não definido'}\n"
                f"- content_density: {design_plan.get('content_density') or 'não definido'}\n"
                f"- trust_strategy: {', '.join(design_plan.get('trust_strategy') or []) or 'não definido'}\n"
                f"- section_order: {', '.join((design_plan.get('ui_direction') or {}).get('section_order') or []) or 'não definido'}\n"
                f"- cta_type: {(design_plan.get('cta_strategy') or {}).get('type') or 'não definido'}\n"
                f"- palette_hint: {design_plan.get('palette_hint') or 'não definido'}\n"
            )

        design_notes_context = ""
        if isinstance(design_notes, dict) and design_notes:
            design_notes_context = (
                "# NOTAS INTERNAS DO AGENTE\n"
                f"- layout_reason: {design_notes.get('layout_reason') or 'não definido'}\n"
                f"- style_reason: {design_notes.get('style_reason') or 'não definido'}\n"
                f"- must_have_sections: {', '.join(design_notes.get('must_have_sections') or []) or 'não definido'}\n"
                f"- trust_priority: {design_notes.get('trust_priority') or 'não definido'}\n"
                f"- avoid: {', '.join(design_notes.get('avoid') or []) or 'não definido'}\n"
            )

        asset_context = build_asset_prompt_context(job.spec.get("_materialized_assets"))
        fluxo_instructions = str(job.spec.get("_fluxo_build_instructions") or "").strip()
        fluxo_context = f"# FLUXO: INSTRUCOES FINAIS DE IMPLEMENTACAO\n{fluxo_instructions}\n" if fluxo_instructions else ""

        return (
            f"{AGENTE_02_BUILDER_SYSTEM_PROMPT}\n\n"
            f"# PERFIL ATIVO DO AGENTE ({profile_name})\n"
            f"{profile_text}\n\n"
            f"{design_context}\n"
            f"{design_notes_context}\n"
            f"{selected_template_context}\n"
            f"{content_strategy_context}\n"
            f"{layout_recipe_context}\n"
            f"{link_content_context}\n"
            f"{design_library_context}\n"
            f"{asset_context}\n"
            f"{fluxo_context}\n"
        ).strip()

    def get_job(self, job_id: str) -> Optional[BuildJob]:
        with self._lock:
            return self._jobs.get(job_id)

    def enqueue(self, job_id: str, spec: Dict[str, Any]) -> BuildJob:
        job = BuildJob(job_id=job_id, status="queued", spec=spec)
        with self._lock:
            self._jobs[job_id] = job
        thread = threading.Thread(
            target=self._run_build,
            args=(job,),
            name=f"builder-{job_id}",
            daemon=True,
        )
        thread.start()
        return job

    def _run_build(self, job: BuildJob) -> None:
        with self._lock:
            job.status = "building"
            job.current_step = "queued"

        try:
            site_dir = self.sites_dir / job.job_id
            site_dir.mkdir(parents=True, exist_ok=True)
            local_usage: Dict[str, int] = {}
            add_runtime_log(
                "builder",
                "info",
                "Build iniciado",
                job_id=job.job_id,
                stage="building",
                details={
                    "builder_model": job.spec.get("builder_model") or self.model,
                    "provider": self.provider or "local-fallback",
                    "asset_first": bool(_ENABLE_PREGENERATED_ASSETS),
                },
            )

            fluxo_context: Optional[Dict[str, Any]] = None
            if self._fluxo_orchestrator is None:
                raise RuntimeError("FluxoOrchestrator indisponivel. O FLUXO e obrigatorio para builds.")

            def update_fluxo_status(current_step: str, completed_step: Optional[str] = None) -> None:
                with self._lock:
                    job.current_step = current_step
                    if completed_step and completed_step not in job.completed_steps:
                        job.completed_steps.append(completed_step)

            fluxo_context = self._fluxo_orchestrator.run_until_builder(
                run_id=job.job_id,
                spec=job.spec,
                site_dir=site_dir,
                status_callback=update_fluxo_status,
            )
            job.spec["_fluxo_run_dir"] = fluxo_context.get("run_dir")
            job.spec["_fluxo_structured"] = fluxo_context.get("structured")
            job.spec["_fluxo_assets_manifest"] = fluxo_context.get("assets")
            job.spec["_fluxo_build_instructions"] = fluxo_context.get("instructions_markdown")
            job.spec["_materialized_assets"] = (fluxo_context.get("assets") or {}).get("assets") or []
            with self._lock:
                job.current_step = "step_05_builder_final"

            if self.use_local_fallback:
                add_runtime_log("builder", "warn", "Usando fallback local para HTML", job_id=job.job_id, stage="html")
                generated_html, local_usage = self._build_local_html_v2(job, site_dir)
            else:
                # FLUXO materializes assets before the LLM generates HTML.
                if _ENABLE_PREGENERATED_ASSETS and not job.spec.get("_materialized_assets"):
                    try:
                        business_name, segment, brand_tone, target_audience, service_labels = extract_asset_inputs_from_spec(job.spec)
                        summary = job.spec.get("summary") or {}
                        visual_prompts = resolve_visual_prompts(
                            visual_plan=job.spec.get("visual_plan") or summary.get("visual_plan") or {},
                            business_name=business_name,
                            segment=segment,
                            brand_tone=brand_tone,
                            target_audience=target_audience,
                            services=service_labels,
                        )
                        visual_prompts = enrich_visual_prompts_with_link_content(visual_prompts, job.spec.get("link_content"))
                        image_assets, image_generation = self._image_pipeline.materialize(
                            site_dir=site_dir,
                            image_prompts=visual_prompts,
                            fallback_segment=segment,
                            fallback_services=service_labels,
                        )
                        job.spec["_materialized_assets"] = image_assets
                        with self._lock:
                            job.usage = {**job.usage, **image_generation, "asset_first_generation": 1}
                        add_runtime_log(
                            "builder",
                            "info",
                            "Assets materializados",
                            job_id=job.job_id,
                            stage="assets",
                            details={
                                "generated": image_generation.get("count", 0),
                                "planned": len(visual_prompts),
                                "slots": image_generation.get("slots", {}),
                            },
                        )
                        print(
                            f"[BUILDER] job={job.job_id} assets-first llm: "
                            f"generated={image_generation.get('count', 0)}/{len(visual_prompts)}"
                        )
                    except Exception as exc:
                        print(f"[BUILDER] job={job.job_id} asset pre-generation skipped: {exc}")
                        add_runtime_log(
                            "builder",
                            "warn",
                            "Pre-geracao de assets pulada",
                            job_id=job.job_id,
                            stage="assets",
                            details={"error": str(exc)},
                        )
                else:
                    print(f"[BUILDER] job={job.job_id} asset-first disabled by BUILDER_ASSET_FIRST_ENABLED=0")
                    add_runtime_log("builder", "warn", "Asset-first desabilitado", job_id=job.job_id, stage="assets")

                try:
                    add_runtime_log(
                        "builder",
                        "info",
                        "Chamando modelo para gerar HTML final",
                        job_id=job.job_id,
                        stage="html",
                        details={"builder_model": job.spec.get("builder_model") or self.model},
                    )
                    if self.provider == "anthropic":
                        generated_html = _strip_html_fence(self._call_claude(job))
                    else:
                        generated_html = _strip_html_fence(self._call_openai_compatible(job))
                    generated_html = ensure_assets_present_in_html(generated_html, job.spec.get("_materialized_assets"))
                except Exception as exc:
                    if not _should_runtime_fallback(exc):
                        raise
                    print(f"[BUILDER] provider runtime failed, using local fallback: {exc}")
                    add_runtime_log(
                        "builder",
                        "warn",
                        "Provider textual falhou; usando fallback local",
                        job_id=job.job_id,
                        stage="html",
                        details={"error": str(exc)},
                    )
                    generated_html, local_usage = self._build_local_html_v2(job, site_dir)
                    with self._lock:
                        job.usage = {
                            **job.usage,
                            "provider_runtime_fallback": 1,
                            **local_usage,
                        }

            if not generated_html.lower().lstrip().startswith("<!doctype"):
                raise RuntimeError("Modelo não retornou um HTML válido (sem <!doctype>).")

            qa_result = repair_site_html(
                html=generated_html,
                site_dir=site_dir,
                materialized_assets=job.spec.get("_materialized_assets"),
                spec=job.spec,
            )
            generated_html = qa_result.html
            with self._lock:
                job.usage = {**job.usage, "html_qa": qa_result.usage_payload()}
            if not qa_result.passed:
                add_runtime_log(
                    "builder",
                    "error",
                    "HTML QA falhou",
                    job_id=job.job_id,
                    stage="qa",
                    details=qa_result.usage_payload(),
                )
                raise RuntimeError(f"HTML QA failed: {qa_result.usage_payload()}")
            add_runtime_log(
                "builder",
                "info",
                "HTML QA aprovado",
                job_id=job.job_id,
                stage="qa",
                details=qa_result.usage_payload(),
            )

            score_result = score_site_html(
                generated_html,
                site_dir=site_dir,
                spec=job.spec,
                materialized_assets=job.spec.get("_materialized_assets"),
            )
            with self._lock:
                job.usage = {**job.usage, "site_score": score_result.usage_payload()}
            add_runtime_log(
                "builder",
                "info",
                "Site score calculado",
                job_id=job.job_id,
                stage="score",
                details=score_result.usage_payload(),
            )

            site_path = site_dir / "index.html"
            site_path.write_text(generated_html, encoding="utf-8")
            if self._fluxo_orchestrator is not None:
                self._fluxo_orchestrator.write_final_summary(run_id=job.job_id, site_path=site_path, usage=job.usage)

            with self._lock:
                job.site_path = site_path
                job.site_url = f"/api/sites/{job.job_id}/"
                job.status = "done"
                job.current_step = "done"
                if "step_05_builder_final" not in job.completed_steps:
                    job.completed_steps.append("step_05_builder_final")
                if self.use_local_fallback:
                    job.usage = {**job.usage, "local_fallback": 1, **local_usage}
                elif local_usage and not job.usage.get("provider_runtime_fallback"):
                    job.usage = {**job.usage, **local_usage}

            print(f"[BUILDER] job={job.job_id} done chars={len(generated_html)} url={job.site_url}")
            add_runtime_log(
                "builder",
                "info",
                "Build concluido",
                job_id=job.job_id,
                stage="done",
                details={"site_url": job.site_url, "chars": len(generated_html)},
            )

        except Exception as exc:
            print(f"[BUILDER] job={job.job_id} error: {exc}")
            add_runtime_log(
                "builder",
                "error",
                "Build falhou",
                job_id=job.job_id,
                stage="error",
                details={"error": str(exc)},
            )
            with self._lock:
                job.status = "error"
                job.error = str(exc)

    def _call_claude(self, job: BuildJob) -> str:
        if self.client is None:
            raise RuntimeError("Anthropic client not initialized.")

        messages = build_messages(job.spec)
        system_prompt = self._build_system_prompt_for_job(job)
        model = self._resolve_text_model_for_job(job)

        chunks: list[str] = []
        with self.client.messages.stream(
            model=model,
            max_tokens=32000,
            system=[
                {
                    "type": "text",
                    "text": system_prompt,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=messages,
            metadata={"user_id": f"simple-ai-builder-{PROMPT_VERSION}"},
        ) as stream:
            for text in stream.text_stream:
                chunks.append(text)
                with self._lock:
                    job.streamed_chars += len(text)

            final_message = stream.get_final_message()

        with self._lock:
            job.usage = {
                "input_tokens": final_message.usage.input_tokens,
                "output_tokens": final_message.usage.output_tokens,
                "builder_model": model,
                "cache_read_input_tokens": getattr(
                    final_message.usage, "cache_read_input_tokens", 0
                ) or 0,
                "cache_creation_input_tokens": getattr(
                    final_message.usage, "cache_creation_input_tokens", 0
                ) or 0,
            }

        return "".join(chunks)

    def _call_openai_compatible(self, job: BuildJob) -> str:
        client, provider_route, base_url = self._resolve_openai_client_for_job(job)
        if client is None:
            raise RuntimeError("OpenAI-compatible client not initialized.")

        user_messages = build_messages(job.spec)
        system_prompt = self._build_system_prompt_for_job(job)
        model = self._resolve_text_model_for_job(job)
        add_runtime_log(
            "builder",
            "info",
            "Rota textual resolvida",
            job_id=job.job_id,
            stage="html",
            details={"builder_model": model, "builder_provider": provider_route, "base_url": base_url},
        )
        openai_messages = [
            {"role": "system", "content": system_prompt},
            *user_messages,
        ]

        response = client.chat.completions.create(
            model=model,
            messages=openai_messages,
            max_tokens=32000,
        )

        with self._lock:
            usage = response.usage
            job.usage = {
                "input_tokens": usage.prompt_tokens if usage else 0,
                "output_tokens": usage.completion_tokens if usage else 0,
                "builder_model": model,
                "builder_provider": provider_route,
            }

        return response.choices[0].message.content or ""

    def _resolve_text_model_for_job(self, job: BuildJob) -> str:
        requested = str(job.spec.get("builder_model") or "").strip()
        if not requested:
            return self.model
        return requested

    def _resolve_openai_client_for_job(self, job: BuildJob) -> tuple[Any, str, str]:
        requested_provider = str(job.spec.get("builder_provider") or "default").strip().lower()
        if requested_provider in {"", "default", self.provider or ""}:
            return (
                self._openai_client,
                self.provider or "openai-compatible",
                (os.getenv("AGENT_LLM_BASE_URL", "").strip() or _PROVIDER_BASE_URLS.get(self.provider or "", "")),
            )

        if requested_provider not in {"zai", "openrouter", "nvidia", "openai-compatible"}:
            raise RuntimeError(f"builder_provider invalido: {requested_provider}")

        try:
            import openai as _openai
        except ImportError as exc:
            raise RuntimeError(f"openai package is required for builder_provider={requested_provider}") from exc

        provider_key = _PROVIDER_KEY_MAP.get(requested_provider, "")
        provider_prefix = requested_provider.upper().replace("-", "_")
        api_key = (
            os.getenv(f"{provider_prefix}_API_KEY", "").strip()
            or (os.getenv(provider_key, "").strip() if provider_key else "")
            or os.getenv("AGENT_LLM_API_KEY", "").strip()
        )
        base_url = (
            os.getenv(f"{provider_prefix}_BASE_URL", "").strip()
            or _PROVIDER_BASE_URLS.get(requested_provider, "")
        )
        if not api_key:
            raise RuntimeError(f"API key nao configurada para builder_provider={requested_provider}")
        if not base_url:
            raise RuntimeError(f"Base URL nao configurada para builder_provider={requested_provider}")
        return _openai.OpenAI(api_key=api_key, base_url=base_url), requested_provider, base_url

    def _build_local_html(self, job: BuildJob) -> str:
        """
        Deterministic fallback when no LLM is configured.
        Generates a minimal but presentable site without exposing internal tooling language.
        """
        import datetime

        summary = job.spec.get("summary") or {}
        design_plan = job.spec.get("design_plan") or summary.get("design_plan") or job.spec.get("visual_plan") or summary.get("visual_plan") or {}
        business_name = _clean_text(
            job.spec.get("business_name") or summary.get("brand_name") or "Seu Negócio"
        )
        segment = _clean_text(
            job.spec.get("segment") or summary.get("business_type") or "Negócio local"
        )
        primary_cta = _clean_text(
            summary.get("primary_cta") or "Entre em contato"
        )
        brand_tone = _clean_text(summary.get("brand_tone") or "")
        modules = job.spec.get("user_facing_actions") or summary.get("modules") or []
        raw_quotes = job.spec.get("raw_quotes") or []

        segment_id = _detect_segment_id(segment)
        theme = _SEGMENT_THEMES.get(segment_id, _SEGMENT_THEMES["default"])
        tagline = _SEGMENT_TAGLINES.get(segment_id, _SEGMENT_TAGLINES["default"])

        # Resolve service labels from modules
        service_labels: list[str] = []
        for item in modules:
            if isinstance(item, dict):
                label = item.get("label") or item.get("id") or ""
            else:
                label = str(item)
            label = label.strip()
            if label and label.lower() not in ("hero", "hero section"):
                service_labels.append(_clean_text(label))

        if not service_labels:
            service_labels = ["Qualidade no atendimento", "Experiência e dedicação", "Contato fácil"]

        service_labels = service_labels[:6]

        # CTA link
        cta_uses_whatsapp = any(
            k in primary_cta.lower()
            for k in ("whatsapp", "zap", "whats")
        )
        if cta_uses_whatsapp:
            wa_text = quote(f"Olá! Vim pelo site da {business_name} e quero saber mais.")
            cta_href = f"https://wa.me/?text={wa_text}"
            cta_label = primary_cta if "whatsapp" in primary_cta.lower() else f"Chamar no WhatsApp"
        else:
            cta_href = "#contato"
            cta_label = primary_cta

        year = datetime.datetime.now().year

        # Build service cards HTML
        service_cards_html = "\n      ".join(
            f'<div class="card"><strong>{html.escape(label)}</strong></div>'
            for label in service_labels
        )

        # Build hero features list (first 3 services)
        hero_list_html = "\n        ".join(
            f'<li>{html.escape(label)}</li>'
            for label in service_labels[:3]
        )

        # Tone badge text
        tone_badge = html.escape(brand_tone) if brand_tone and brand_tone != "Não informado" else ""
        tone_row = f'<p class="tone-badge">{tone_badge}</p>' if tone_badge else ""

        return f"""<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(business_name)}</title>
  <style>
    :root {{
      color-scheme: light;
      --ink: {theme['ink']};
      --muted: {theme['muted']};
      --paper: {theme['paper']};
      --line: {theme['line']};
      --accent: {theme['accent']};
      --accent-dark: {theme['accent_dark']};
      --warm: {theme['warm']};
      --card: {theme['card']};
      --shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
    }}
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
      background: var(--paper);
      color: var(--ink);
      line-height: 1.6;
    }}
    a {{ color: inherit; text-decoration: none; }}

    /* Nav */
    nav {{
      padding: 18px min(7vw, 72px);
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--paper);
      position: sticky;
      top: 0;
      z-index: 10;
    }}
    .brand {{ font-weight: 800; font-size: 18px; letter-spacing: -0.3px; }}
    .nav-cta {{
      display: inline-flex;
      align-items: center;
      min-height: 40px;
      padding: 0 18px;
      border-radius: 8px;
      background: var(--accent);
      color: white;
      font-weight: 700;
      font-size: 14px;
    }}

    /* Hero */
    .hero {{
      padding: clamp(48px, 10vh, 96px) min(7vw, 72px) clamp(48px, 10vh, 96px);
      background:
        radial-gradient(circle at 80% 20%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 40%),
        linear-gradient(120deg, color-mix(in srgb, var(--accent) 10%, var(--paper)), var(--paper));
      border-bottom: 1px solid var(--line);
      display: grid;
      grid-template-columns: 1fr minmax(260px, 400px);
      gap: clamp(32px, 6vw, 80px);
      align-items: center;
    }}
    .hero-eyebrow {{
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: var(--accent);
      margin-bottom: 16px;
    }}
    h1 {{
      font-size: clamp(36px, 6vw, 80px);
      line-height: 1.05;
      letter-spacing: -1px;
      font-weight: 800;
      margin-bottom: 20px;
    }}
    .hero-sub {{
      font-size: 18px;
      color: var(--muted);
      max-width: 540px;
      margin-bottom: 32px;
    }}
    .btn {{
      display: inline-flex;
      align-items: center;
      min-height: 52px;
      padding: 0 28px;
      border-radius: 10px;
      background: var(--accent);
      color: white;
      font-weight: 700;
      font-size: 16px;
      box-shadow: 0 8px 24px color-mix(in srgb, var(--accent) 40%, transparent);
      transition: opacity 0.15s;
    }}
    .btn:hover {{ opacity: 0.88; }}

    /* Hero panel */
    .hero-panel {{
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 20px;
      box-shadow: var(--shadow);
      padding: clamp(24px, 4vw, 36px);
    }}
    .hero-panel h2 {{
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 16px;
      color: var(--ink);
    }}
    .hero-panel ul {{
      list-style: none;
      display: grid;
      gap: 10px;
    }}
    .hero-panel li {{
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 12px 14px;
      font-weight: 600;
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }}
    .hero-panel li::before {{
      content: "";
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
      flex-shrink: 0;
    }}

    /* Sections */
    section {{
      padding: clamp(48px, 8vw, 96px) min(7vw, 72px);
    }}
    section h2 {{
      font-size: clamp(24px, 3vw, 40px);
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 12px;
    }}
    .section-sub {{
      color: var(--muted);
      font-size: 18px;
      max-width: 600px;
      margin-bottom: 40px;
    }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
      max-width: 960px;
    }}
    .card {{
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 24px 20px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.055);
      min-height: 90px;
      display: flex;
      align-items: flex-start;
    }}
    .card strong {{
      font-size: 16px;
      font-weight: 700;
      line-height: 1.3;
    }}

    /* Contact strip */
    .contact-strip {{
      background: var(--ink);
      color: white;
      border-radius: 20px;
      margin: 0 min(7vw, 72px) 56px;
      padding: clamp(28px, 5vw, 48px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }}
    .contact-strip h2 {{ font-size: clamp(22px, 3vw, 36px); color: white; margin-bottom: 8px; }}
    .contact-strip p {{ color: rgba(255,255,255,0.65); font-size: 16px; }}
    .btn-white {{
      display: inline-flex;
      align-items: center;
      min-height: 52px;
      padding: 0 28px;
      border-radius: 10px;
      background: white;
      color: var(--accent);
      font-weight: 800;
      font-size: 16px;
      white-space: nowrap;
      flex-shrink: 0;
    }}

    /* Footer */
    footer {{
      padding: 28px min(7vw, 72px);
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }}

    /* Responsive */
    @media (max-width: 820px) {{
      .hero {{ grid-template-columns: 1fr; }}
      .hero-panel {{ display: none; }}
      .contact-strip {{ flex-direction: column; align-items: flex-start; margin-inline: 18px; }}
      footer {{ flex-direction: column; align-items: flex-start; }}
    }}
  </style>
</head>
<body>

  <nav>
    <span class="brand">{html.escape(business_name)}</span>
    <a class="nav-cta" href="{cta_href}">{html.escape(cta_label)}</a>
  </nav>

  <div class="hero">
    <div>
      <p class="hero-eyebrow">{html.escape(segment)}</p>
      <h1>{html.escape(business_name)}</h1>
      <p class="hero-sub">{html.escape(tagline)}</p>
      <a class="btn" href="{cta_href}">{html.escape(cta_label)}</a>
    </div>
    <aside class="hero-panel">
      <h2>O que oferecemos</h2>
      <ul>
        {hero_list_html}
      </ul>
    </aside>
  </div>

  <section id="servicos">
    <h2>Nossos serviços</h2>
    <p class="section-sub">{html.escape(tagline)}</p>
    <div class="grid">
      {service_cards_html}
    </div>
  </section>

  <div class="contact-strip" id="contato">
    <div>
      <h2>Fale com a gente</h2>
      <p>Pronto para começar? Entre em contato agora mesmo.</p>
    </div>
    <a class="btn-white" href="{cta_href}">{html.escape(cta_label)}</a>
  </div>

  <footer>
    <span>{html.escape(business_name)}</span>
    <span>© {year}</span>
  </footer>

</body>
</html>
"""


    def _build_local_html_v2(self, job: BuildJob, site_dir: Path) -> tuple[str, Dict[str, int]]:
        """
        Deterministic fallback when no LLM is configured.
        Asset-first flow: resolve the V1 visual plan, materialize image assets,
        then assemble the final HTML already pointing at the resolved assets.
        """
        import datetime

        summary = job.spec.get("summary") or {}
        design_plan = job.spec.get("design_plan") or summary.get("design_plan") or job.spec.get("visual_plan") or summary.get("visual_plan") or {}
        business_name = _clean_text(
            job.spec.get("business_name") or summary.get("brand_name") or "Seu Negócio"
        )
        segment = _clean_text(
            job.spec.get("segment") or summary.get("business_type") or "Negócio local"
        )
        primary_cta = _clean_text(summary.get("primary_cta") or "Entre em contato")
        brand_tone = _clean_text(summary.get("brand_tone") or "")
        scope = _clean_text(summary.get("scope") or "Atendimento local")
        modules = job.spec.get("user_facing_actions") or summary.get("modules") or []
        raw_quotes = job.spec.get("raw_quotes") or []

        segment_id = _detect_segment_id(segment)
        theme = _SEGMENT_THEMES.get(segment_id, _SEGMENT_THEMES["default"])
        visual_style = _clean_text(design_plan.get("visual_style") or "clean-professional")
        layout_family = _clean_text(design_plan.get("layout_family") or "conversion-landing")
        section_order = ((design_plan.get("ui_direction") or {}).get("section_order") or []) if isinstance(design_plan, dict) else []
        hero_style = _clean_text(((design_plan.get("ui_direction") or {}).get("hero_style") or "editorial-clean") if isinstance(design_plan, dict) else "editorial-clean")
        trust_strategy = design_plan.get("trust_strategy") or [] if isinstance(design_plan, dict) else []
        content_density = _clean_text(design_plan.get("content_density") or "comfortable")
        design_notes = design_plan.get("design_notes") or {} if isinstance(design_plan, dict) else {}
        tagline = _SEGMENT_TAGLINES.get(segment_id, _SEGMENT_TAGLINES["default"])
        font_url = self._resolve_font_family(segment_id)

        body_font_stack = "'Manrope', 'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif"
        heading_font_stack = body_font_stack
        hero_content_max_width = "740px"
        hero_panel_background = "rgba(0, 0, 0, 0.28)"
        hero_panel_blur = "4px"
        hero_overlay = "linear-gradient(180deg, transparent 45%, color-mix(in srgb, var(--ink) 35%, transparent))"
        hero_eyebrow_opacity = "0.92"
        section_spacing = "clamp(48px, 8vw, 96px)"
        service_grid_min = "220px"
        card_padding = "20px 18px"
        card_radius = "14px"
        card_shadow = "0 10px 24px rgba(0, 0, 0, 0.06)"
        gallery_grid_min = "240px"

        if content_density == "compact":
            section_spacing = "clamp(40px, 6vw, 72px)"
            service_grid_min = "190px"
            card_padding = "18px 16px"
            gallery_grid_min = "220px"
        elif content_density == "balanced":
            section_spacing = "clamp(44px, 7vw, 84px)"
            service_grid_min = "205px"

        if visual_style == "editorial-premium":
            heading_font_stack = "'Fraunces', 'Manrope', serif"
            hero_content_max_width = "680px"
            hero_panel_background = "rgba(18, 18, 18, 0.22)"
            hero_panel_blur = "3px"
            hero_overlay = "linear-gradient(180deg, rgba(12, 12, 12, 0.08), rgba(12, 12, 12, 0.42))"
            hero_eyebrow_opacity = "0.84"
            section_spacing = "clamp(56px, 9vw, 112px)"
            card_radius = "18px"
            card_shadow = "0 18px 36px rgba(0, 0, 0, 0.08)"
        elif visual_style == "bold-conversion":
            heading_font_stack = "'Space Grotesk', 'Manrope', ui-sans-serif, sans-serif"
            hero_content_max_width = "760px"
            hero_panel_background = "rgba(0, 0, 0, 0.38)"
            hero_panel_blur = "2px"
            hero_overlay = "linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.54))"
            section_spacing = "clamp(42px, 7vw, 88px)"
            card_radius = "12px"
        elif visual_style == "warm-artisanal":
            heading_font_stack = "'Fraunces', 'Manrope', serif"
            hero_content_max_width = "700px"
            hero_panel_background = "rgba(44, 28, 12, 0.24)"
            hero_panel_blur = "3px"
            hero_overlay = "linear-gradient(180deg, rgba(38, 20, 8, 0.06), rgba(38, 20, 8, 0.44))"
            card_radius = "18px"
            card_shadow = "0 14px 30px rgba(62, 39, 35, 0.12)"

        if hero_style == "strong-contrast":
            hero_panel_background = "rgba(0, 0, 0, 0.42)"
            hero_overlay = "linear-gradient(180deg, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.6))"
        elif hero_style == "image-dominant":
            hero_content_max_width = "620px"
            hero_panel_background = "rgba(20, 20, 20, 0.18)"
            hero_eyebrow_opacity = "0.78"

        if visual_style == "editorial-premium":
            tagline = f"{tagline} Com presença mais refinada, calma e objetiva."
        elif visual_style == "bold-conversion":
            tagline = f"{tagline} Resposta rápida e ação visível desde o primeiro bloco."
        elif visual_style == "warm-artisanal":
            tagline = f"{tagline} Presença humana, próxima e acolhedora em cada detalhe."

        service_labels: list[str] = []
        for item in modules:
            if isinstance(item, dict):
                label = item.get("label") or item.get("id") or ""
            else:
                label = str(item)
            label = label.strip()
            normalized_label = _normalize_for_match(label)
            is_internal_label = any(
                token in normalized_label
                for token in (
                    "hero",
                    "hero section",
                    "contact",
                    "contato",
                    "botao flutuante",
                    "feed do instagram",
                    "instagram feed",
                    "mapa",
                    "sobre o negocio",
                    "about",
                )
            )
            if label and not is_internal_label:
                service_labels.append(_clean_text(label))

        if not service_labels:
            service_labels = ["Qualidade no atendimento", "Experiência e dedicação", "Contato rápido"]
        service_labels = service_labels[:6]

        cta_uses_whatsapp = any(k in primary_cta.lower() for k in ("whatsapp", "zap", "whats"))
        if cta_uses_whatsapp:
            wa_text = quote(f"Olá! Vim pelo site da {business_name} e quero saber mais.")
            cta_href = f"https://wa.me/?text={wa_text}"
            cta_label = primary_cta if "whatsapp" in primary_cta.lower() else "Chamar no WhatsApp"
        else:
            cta_href = "#contato"
            cta_label = primary_cta

        visual_prompts = resolve_visual_prompts(
            visual_plan=job.spec.get("visual_plan") or summary.get("visual_plan") or {},
            business_name=business_name,
            segment=segment,
            brand_tone=brand_tone,
            target_audience=summary.get("target_audience") or "",
            services=service_labels,
        )
        visual_prompts = enrich_visual_prompts_with_link_content(visual_prompts, job.spec.get("link_content"))
        image_assets, image_generation = self._image_pipeline.materialize(
            site_dir=site_dir,
            image_prompts=visual_prompts,
            fallback_segment=segment,
            fallback_services=service_labels,
        )
        generated_images = int(image_generation.get("count") or 0)
        image_slot_stats = image_generation.get("slots") or {}
        hero_asset = image_assets[0]
        supporting_assets = image_assets[1:]
        planned_images = len(visual_prompts)

        service_cards_html = "\n          ".join(
            f'<article class="service-card"><h3>{html.escape(label)}</h3><p>Atendimento direto, organizado e com foco em resultado.</p></article>'
            for label in service_labels
        )
        priorities_html = "\n            ".join(
            f"<li>{html.escape(label)}</li>" for label in service_labels[:3]
        )
        gallery_html = "\n          ".join(
            (
                "<figure class=\"gallery-card\">"
                f"<img src=\"{html.escape(asset['url'])}\" alt=\"{html.escape(asset['alt'])}\" />"
                f"<figcaption>{html.escape(asset['caption'])}</figcaption>"
                "</figure>"
            )
            for asset in supporting_assets
        )

        quote_block = ""
        if raw_quotes:
            quote_text = _clean_text(raw_quotes[0])
            if quote_text.lower() not in {"não informado", "nao informado"}:
                quote_block = (
                    "<blockquote class=\"client-voice\">"
                    f"<p>{html.escape(quote_text)}</p>"
                    "<span>Mensagem do cliente</span>"
                    "</blockquote>"
                )

        normalized_tone = _normalize_for_match(brand_tone)
        tone_badge = (
            html.escape(brand_tone)
            if brand_tone and normalized_tone not in {"nao informado", "nao definido", "n/a"}
            else ""
        )
        tone_row = f'<p class="hero-note">{tone_badge}</p>' if tone_badge else ""
        design_note_row = ""
        if isinstance(design_notes, dict) and design_notes.get("trust_priority") == "show-early":
            design_note_row = '<p class="hero-note">Primeira versão com foco em confiança, clareza e ação principal visível.</p>'
        hero_support_text = html.escape(scope)
        if layout_family == "catalog-grid":
            hero_support_text = "Catálogo organizado para leitura rápida"
        elif layout_family == "image-led":
            hero_support_text = "Experiência visual pensada para gerar conexão imediata"
        elif layout_family == "local-trust":
            hero_support_text = "Atendimento próximo, presença real e contato fácil"

        section_intro_services = "Selecionamos os pontos principais para facilitar sua decisão e acelerar o contato."
        section_intro_about = "Seu atendimento é organizado com foco em clareza, velocidade e confiança."
        section_intro_gallery = "Referências visuais alinhadas com o estilo do negócio e o que seu público espera."
        cta_title = "Vamos começar?"
        cta_copy = "Fale com a equipe e receba o próximo passo com rapidez."

        if layout_family == "catalog-grid":
            section_intro_services = "Organizamos os itens principais em uma estrutura escaneável e fácil de comparar."
            section_intro_about = "A navegação foi pensada para mostrar variedade sem confundir a leitura."
            section_intro_gallery = "Imagens e destaques ajudam a orientar a escolha e reforçar a proposta."
            cta_title = "Quer ver mais detalhes?"
            cta_copy = "Entre em contato para receber orientação rápida sobre os itens que mais fazem sentido para você."
        elif layout_family == "image-led":
            section_intro_services = "Os destaques foram organizados para equilibrar atmosfera, clareza e desejo."
            section_intro_about = "A composição visual valoriza o contexto real do negócio sem perder objetividade."
            section_intro_gallery = "As imagens reforçam o clima e a experiência que o público deve sentir ao chegar até você."
            cta_title = "Vamos conversar?"
            cta_copy = "Fale com a equipe e transforme essa primeira impressão em um contato real."
        elif layout_family == "local-trust":
            section_intro_services = "Os serviços principais aparecem com clareza para acelerar o próximo passo do cliente."
            section_intro_about = "A prioridade desta versão é passar confiança logo cedo e facilitar o contato."
            section_intro_gallery = "O apoio visual reforça presença real, rotina de atendimento e credibilidade."
            cta_title = "Precisa de um retorno rápido?"
            cta_copy = "Chame agora e receba orientação com mais agilidade e clareza."

        if "social-proof-early" in trust_strategy:
            section_intro_about = "A página prioriza sinais de confiança e consistência logo após a apresentação principal."

        if visual_style == "editorial-premium":
            section_intro_about = "A composição privilegia clareza, autoridade calma e leitura mais respirada."
            cta_copy = "Fale com a equipe e receba um retorno claro, objetivo e alinhado ao seu contexto."
        elif visual_style == "bold-conversion":
            section_intro_services = "Os blocos foram organizados para destacar o que importa e acelerar a decisão."
            cta_copy = "Fale agora e avance para o próximo passo sem complicação."
        elif visual_style == "friendly-accessible":
            section_intro_services = "Os destaques aparecem de forma simples para facilitar leitura, comparação e contato."
        elif visual_style == "warm-artisanal":
            section_intro_gallery = "As imagens reforçam proximidade, atmosfera real e a sensação certa para quem chega até o negócio."

        available_sections = {
            "services": f"""
    <section id=\"servicos\">
      <h2>O que oferecemos</h2>
      <p class=\"section-sub\">{section_intro_services}</p>
      <div class=\"service-grid\">
        {service_cards_html}
      </div>
    </section>""",
            "about": f"""
    <section id=\"sobre\">
      <h2>Como funciona</h2>
      <p class=\"section-sub\">{section_intro_about}</p>
      <div class=\"about-shell\">
        <article class=\"about-panel\">
          <p>{html.escape(tagline)}</p>
          {quote_block}
        </article>
        <aside class=\"about-panel\">
          <h3 style=\"margin:0;font-size:1rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);\">Prioridades</h3>
          <ul class=\"list-panel\">
            {priorities_html}
          </ul>
        </aside>
      </div>
    </section>""",
            "proof": f"""
    <section id=\"prova\">
      <h2>Sinais de confiança</h2>
      <p class=\"section-sub\">{section_intro_about}</p>
      <div class=\"about-shell\">
        <article class=\"about-panel\">
          <p>{html.escape(tagline)}</p>
          {quote_block}
        </article>
        <aside class=\"about-panel\">
          <h3 style=\"margin:0;font-size:1rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);\">Prioridades</h3>
          <ul class=\"list-panel\">
            {priorities_html}
          </ul>
        </aside>
      </div>
    </section>""",
            "gallery": f"""
    <section id=\"galeria\">
      <h2>Ambiente e experiência</h2>
      <p class=\"section-sub\">{section_intro_gallery}</p>
      <div class=\"gallery-grid\">
        {gallery_html}
      </div>
    </section>""",
            "categories": f"""
    <section id=\"categorias\">
      <h2>Principais destaques</h2>
      <p class=\"section-sub\">Organizamos a navegação por blocos claros para facilitar comparação e leitura rápida.</p>
      <div class=\"service-grid\">
        {service_cards_html}
      </div>
    </section>""",
            "benefits": f"""
    <section id=\"beneficios\">
      <h2>Por que essa primeira versão funciona</h2>
      <p class=\"section-sub\">Clareza, foco no próximo passo e uma apresentação que ajuda o cliente a confiar mais rápido.</p>
      <div class=\"about-panel\">
        <ul class=\"list-panel\">
          {priorities_html}
        </ul>
      </div>
    </section>""",
            "process": f"""
    <section id=\"processo\">
      <h2>Como o atendimento acontece</h2>
      <p class=\"section-sub\">Mostramos o caminho de forma simples para reduzir dúvida e acelerar o contato.</p>
      <div class=\"about-panel\">
        <ul class=\"list-panel\">
          {priorities_html}
        </ul>
      </div>
    </section>""",
            "faq": f"""
    <section id=\"faq\">
      <h2>Dúvidas comuns</h2>
      <p class=\"section-sub\">Esta primeira versão já antecipa objeções e deixa o contato mais direto.</p>
      <div class=\"about-panel\">
        <ul class=\"list-panel\">
          {priorities_html}
        </ul>
      </div>
    </section>""",
            "contact": f"""
    <section class=\"cta-strip\" id=\"contato\">
      <div>
        <h2>{cta_title}</h2>
        <p>{cta_copy}</p>
      </div>
      <a class=\"pill-ghost\" href=\"{cta_href}\">{html.escape(cta_label)}</a>
    </section>""",
        }
        default_section_order = {
            "conversion-landing": ["benefits", "services", "contact"],
            "local-trust": ["services", "proof", "process", "gallery", "contact"],
            "catalog-grid": ["categories", "services", "gallery", "contact"],
            "image-led": ["about", "services", "gallery", "contact"],
            "editorial-onepage": ["about", "proof", "services", "contact"],
        }
        ordered_section_keys = [
            key for key in (section_order or default_section_order.get(layout_family, ["services", "about", "gallery", "contact"]))
            if key in available_sections
        ]
        if not ordered_section_keys:
            ordered_section_keys = ["services", "about", "gallery", "contact"]
        body_sections_html = "\n".join(available_sections[key] for key in ordered_section_keys)
        year = datetime.datetime.now().year

        page_html = f"""<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(business_name)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="{font_url}" rel="stylesheet">
  <style>
    :root {{
      color-scheme: light;
      --ink: {theme['ink']};
      --muted: {theme['muted']};
      --paper: {theme['paper']};
      --line: {theme['line']};
      --accent: {theme['accent']};
      --warm: {theme['warm']};
      --card: rgba(255, 255, 255, 0.88);
      --shadow: 0 24px 64px rgba(0, 0, 0, 0.14);
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: {body_font_stack};
      line-height: 1.55;
      color: var(--ink);
      background: var(--paper);
    }}
    .container {{ width: min(1120px, 92vw); margin-inline: auto; }}
    nav {{
      position: sticky;
      top: 0;
      z-index: 20;
      border-bottom: 1px solid var(--line);
      backdrop-filter: blur(8px);
      background: color-mix(in srgb, var(--paper) 86%, white 14%);
    }}
    .nav-inner {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 0;
    }}
    .brand {{
      font-size: 1rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.01em;
    }}
    .pill {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 0 16px;
      border-radius: 999px;
      text-decoration: none;
      background: var(--accent);
      color: white;
      font-weight: 700;
      border: 0;
    }}
    .hero {{
      position: relative;
      min-height: min(82vh, 760px);
      display: grid;
      place-items: end start;
      border-bottom: 1px solid var(--line);
      overflow: hidden;
      isolation: isolate;
    }}
    .hero::before {{
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(112deg, color-mix(in srgb, var(--ink) 86%, transparent), color-mix(in srgb, var(--ink) 28%, transparent)),
        url('{html.escape(hero_asset["url"])}') center / cover no-repeat;
      z-index: -2;
    }}
    .hero::after {{
      content: "";
      position: absolute;
      inset: 0;
      background: {hero_overlay};
      z-index: -1;
    }}
    .hero-content {{
      width: min({hero_content_max_width}, 92vw);
      margin: 0 auto clamp(32px, 8vh, 72px);
      padding: clamp(18px, 4vw, 32px);
      border-radius: 18px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      background: {hero_panel_background};
      backdrop-filter: blur({hero_panel_blur});
      color: white;
    }}
    .hero-eyebrow {{
      margin: 0 0 8px;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-weight: 700;
      opacity: {hero_eyebrow_opacity};
    }}
    h1 {{
      margin: 0;
      font-family: {heading_font_stack};
      font-size: clamp(2.1rem, 5.5vw, 4.6rem);
      line-height: 1.04;
      letter-spacing: -0.02em;
      max-width: 17ch;
    }}
    .hero-sub {{
      margin: 14px 0 0;
      max-width: 60ch;
      font-size: clamp(1rem, 2.2vw, 1.2rem);
      color: rgba(255, 255, 255, 0.9);
    }}
    .hero-actions {{
      margin-top: 20px;
      display: inline-flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }}
    .hero-note {{
      margin: 0;
      font-size: 0.86rem;
      color: rgba(255, 255, 255, 0.86);
    }}
    section {{ padding: {section_spacing} 0; }}
    h2 {{
      margin: 0;
      font-family: {heading_font_stack};
      font-size: clamp(1.8rem, 3.2vw, 2.8rem);
      line-height: 1.1;
      letter-spacing: -0.01em;
    }}
    .section-sub {{
      margin: 14px 0 0;
      color: var(--muted);
      font-size: 1.03rem;
      max-width: 68ch;
    }}
    .service-grid {{
      margin-top: 26px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax({service_grid_min}, 1fr));
      gap: 14px;
    }}
    .service-card {{
      padding: {card_padding};
      border-radius: {card_radius};
      border: 1px solid var(--line);
      background: var(--card);
      box-shadow: {card_shadow};
    }}
    .service-card h3 {{ margin: 0; font-size: 1.05rem; }}
    .service-card p {{ margin: 10px 0 0; color: var(--muted); font-size: 0.94rem; }}
    .about-shell {{
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(260px, 0.9fr);
      gap: clamp(18px, 4vw, 42px);
      margin-top: 24px;
      align-items: start;
    }}
    .about-panel {{
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 22px;
      background: var(--card);
      box-shadow: var(--shadow);
    }}
    .about-panel p {{ margin: 0; color: var(--muted); font-size: 1rem; line-height: 1.65; }}
    .list-panel {{
      margin: 18px 0 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 10px;
    }}
    .list-panel li {{
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.5);
      display: flex;
      gap: 10px;
      font-weight: 600;
      font-size: 0.94rem;
    }}
    .list-panel li::before {{
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--accent);
      margin-top: 0.42rem;
      flex-shrink: 0;
    }}
    .client-voice {{
      margin: 18px 0 0;
      padding: 18px 20px;
      border-left: 4px solid var(--accent);
      border-radius: 12px;
      background: color-mix(in srgb, var(--warm) 76%, white 24%);
    }}
    .client-voice p {{ margin: 0; color: var(--ink); }}
    .client-voice span {{
      margin-top: 8px;
      display: inline-block;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      font-weight: 700;
    }}
    .gallery-grid {{
      margin-top: 24px;
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(auto-fit, minmax({gallery_grid_min}, 1fr));
    }}
    .gallery-card {{
      margin: 0;
      overflow: hidden;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: white;
      box-shadow: 0 14px 28px rgba(0, 0, 0, 0.08);
    }}
    .gallery-card img {{
      width: 100%;
      display: block;
      aspect-ratio: 4 / 3;
      object-fit: cover;
    }}
    .gallery-card figcaption {{
      padding: 11px 12px;
      color: var(--muted);
      font-size: 0.86rem;
    }}
    .cta-strip {{
      margin: clamp(30px, 6vw, 70px) auto clamp(24px, 5vw, 56px);
      padding: clamp(24px, 5vw, 42px);
      border-radius: 22px;
      background: var(--ink);
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
    }}
    .cta-strip h2 {{
      color: white;
      font-size: clamp(1.6rem, 3.6vw, 2.4rem);
    }}
    .cta-strip p {{ margin: 10px 0 0; color: rgba(255, 255, 255, 0.8); }}
    .pill-ghost {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 52px;
      padding: 0 24px;
      border-radius: 999px;
      text-decoration: none;
      font-weight: 800;
      background: white;
      color: var(--accent);
    }}
    footer {{
      padding: 22px 0 34px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 0.86rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }}
    @media (max-width: 900px) {{
      .about-shell {{ grid-template-columns: 1fr; }}
    }}
    @media (max-width: 740px) {{
      .hero-content {{ margin-bottom: 24px; padding: 18px; }}
      .cta-strip {{ border-radius: 16px; }}
      .pill, .pill-ghost {{ width: 100%; }}
    }}
  </style>
</head>
<body>
  <nav>
    <div class="container nav-inner">
      <span class="brand">{html.escape(business_name)}</span>
      <a class="pill" href="{cta_href}">{html.escape(cta_label)}</a>
    </div>
  </nav>

  <header class="hero" role="banner">
    <div class="hero-content">
      <p class="hero-eyebrow">{html.escape(segment)}</p>
      <h1>{html.escape(business_name)}</h1>
      <p class="hero-sub">{html.escape(tagline)}</p>
      <div class="hero-actions">
        <a class="pill" href="{cta_href}">{html.escape(cta_label)}</a>
        <span class="hero-note">{hero_support_text}</span>
      </div>
      {tone_row}
      {design_note_row}
    </div>
  </header>

  <main class="container">
    {body_sections_html}

    <footer>
      <span>{html.escape(business_name)} · {html.escape(segment)}</span>
      <span>© {year}</span>
    </footer>
  </main>
</body>
</html>
"""

        return page_html, {
            "images_planned": planned_images,
            "images_generated": generated_images,
            "image_slots": image_slot_stats,
            "design_plan_version": 1,
            "layout_family": layout_family,
            "visual_style": visual_style,
            "content_density": content_density,
            "section_count": len(section_order) if isinstance(section_order, list) else 0,
            "asset_first_generation": 1,
        }

    def _resolve_font_family(self, segment_id: str) -> str:
        if segment_id in {"bakery", "restaurant"}:
            return "https://fonts.googleapis.com/css2?family=Fraunces:wght@500;700&family=Manrope:wght@400;500;600;700;800&display=swap"
        if segment_id in {"mechanic", "tech"}:
            return "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap"
        return "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap"

def _clean_text(value: Any) -> str:
    text = str(value or "").strip()
    return text if text else "Não informado"
