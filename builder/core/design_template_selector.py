from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class SelectedDesignTemplate:
    template_id: str
    score: int
    reason: str
    data: dict[str, Any]


def _normalize(text: Any) -> str:
    return str(text or "").strip().lower()


def _read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def load_template_catalog(project_root: Path) -> list[dict[str, Any]]:
    path = project_root / "DesignTemplates" / "agent-ready" / "template-catalog.json"
    data = _read_json(path)
    return data if isinstance(data, list) else []


def load_template_definition(project_root: Path, template_id: str) -> dict[str, Any]:
    path = project_root / "DesignTemplates" / "templates" / template_id / "template.json"
    data = _read_json(path)
    return data if isinstance(data, dict) else {}


def _detect_cta_type(spec: dict[str, Any], summary: dict[str, Any], design_plan: dict[str, Any]) -> str:
    cta_strategy = design_plan.get("cta_strategy") if isinstance(design_plan.get("cta_strategy"), dict) else {}
    explicit = _normalize(cta_strategy.get("type"))
    if explicit:
        return explicit
    primary_cta = _normalize(summary.get("primary_cta") or spec.get("primary_cta"))
    if "whatsapp" in primary_cta or "zap" in primary_cta:
        return "whatsapp"
    if "agend" in primary_cta:
        return "schedule"
    if "orc" in primary_cta:
        return "quote"
    if "lig" in primary_cta or "telefon" in primary_cta:
        return "call"
    if "compr" in primary_cta or "pedido" in primary_cta:
        return "buy"
    return "contact"


def _detect_content_volume(spec: dict[str, Any], summary: dict[str, Any], design_plan: dict[str, Any]) -> str:
    explicit = _normalize(summary.get("content_volume") or design_plan.get("content_density"))
    if explicit in {"low", "medium", "high"}:
        return explicit
    if explicit == "balanced":
        return "medium"
    if explicit == "comfortable":
        return "low"
    if explicit == "compact":
        return "high"
    actions = spec.get("user_facing_actions") or []
    count = len(actions) if isinstance(actions, list) else 0
    if count >= 8:
        return "high"
    if count >= 4:
        return "medium"
    return "low"


def _detect_image_dependence(spec: dict[str, Any], summary: dict[str, Any], design_plan: dict[str, Any]) -> str:
    layout_family = _normalize(design_plan.get("layout_family"))
    segment = _normalize(spec.get("segment") or summary.get("business_type"))
    if layout_family in {"image-led", "catalog-grid", "editorial-onepage"}:
        return "high"
    if any(token in segment for token in ("loja", "moda", "restaurante", "beleza", "decor", "foto")):
        return "medium"
    return "low"


def _detect_trust_need(spec: dict[str, Any], summary: dict[str, Any], design_plan: dict[str, Any]) -> str:
    trust_strategy = design_plan.get("trust_strategy") or []
    if isinstance(trust_strategy, list) and any("trust" in _normalize(item) or "proof" in _normalize(item) for item in trust_strategy):
        return "high"
    segment = _normalize(spec.get("segment") or summary.get("business_type"))
    if any(token in segment for token in ("clinica", "consult", "oficina", "adv", "contab", "servic")):
        return "high"
    if any(token in segment for token in ("loja", "restaurante", "moda", "padaria")):
        return "medium"
    return "medium"


def _score_template(template_signals: dict[str, Any], detected: dict[str, str], priority: int) -> int:
    score = int(priority)
    for key in ("primary_cta_types", "content_volume", "image_dependence", "trust_need"):
        allowed = template_signals.get(key) or []
        if not isinstance(allowed, list):
            continue
        probe_key = "primary_cta_type" if key == "primary_cta_types" else key
        if detected.get(probe_key) in allowed:
            score += 100
    return score


def select_design_template(spec: dict[str, Any], project_root: Path) -> SelectedDesignTemplate | None:
    summary = spec.get("summary") or {}
    design_plan = spec.get("design_plan") or summary.get("design_plan") or {}
    if not summary and not isinstance(design_plan, dict):
        return None

    catalog = load_template_catalog(project_root)
    if not catalog:
        return None

    detected = {
        "primary_cta_type": _detect_cta_type(spec, summary, design_plan if isinstance(design_plan, dict) else {}),
        "content_volume": _detect_content_volume(spec, summary, design_plan if isinstance(design_plan, dict) else {}),
        "image_dependence": _detect_image_dependence(spec, summary, design_plan if isinstance(design_plan, dict) else {}),
        "trust_need": _detect_trust_need(spec, summary, design_plan if isinstance(design_plan, dict) else {}),
    }

    best: SelectedDesignTemplate | None = None
    for item in catalog:
        if not isinstance(item, dict):
            continue
        template_id = str(item.get("template_id") or "").strip()
        if not template_id:
            continue
        definition = load_template_definition(project_root, template_id)
        if not definition:
            continue
        template_signals = item.get("signals") if isinstance(item.get("signals"), dict) else {}
        priority = int(item.get("priority") or 0)
        score = _score_template(template_signals, detected, priority)
        reason = (
            f"Template {template_id} selecionado por sinais de estrutura: "
            f"cta={detected['primary_cta_type']}, volume={detected['content_volume']}, "
            f"imagem={detected['image_dependence']}, confianca={detected['trust_need']}."
        )
        candidate = SelectedDesignTemplate(
            template_id=template_id,
            score=score,
            reason=reason,
            data=definition,
        )
        if best is None or candidate.score > best.score:
            best = candidate

    if best is None:
        return None
    return best


def selected_template_to_prompt_block(selected: SelectedDesignTemplate | None) -> str:
    if not selected:
        return ""
    data = selected.data or {}
    section_blueprint = ", ".join(data.get("section_blueprint") or []) or "nao definido"
    avoid = ", ".join(data.get("avoid") or []) or "nao definido"
    qa_focus = ", ".join(data.get("qa_focus") or []) or "nao definido"
    visual_styles = ", ".join(data.get("visual_styles") or []) or "nao definido"
    hero = data.get("hero") if isinstance(data.get("hero"), dict) else {}
    hero_composition = hero.get("composition") or "nao definido"
    hero_aspect = hero.get("aspect_ratio") or "nao definido"
    return (
        "# TEMPLATE DE DESIGN SELECIONADO\n"
        f"- template_id: {selected.template_id}\n"
        f"- score: {selected.score}\n"
        f"- reason: {selected.reason}\n"
        f"- visual_styles: {visual_styles}\n"
        f"- hero_composition: {hero_composition}\n"
        f"- hero_aspect_ratio: {hero_aspect}\n"
        f"- section_blueprint: {section_blueprint}\n"
        f"- avoid: {avoid}\n"
        f"- qa_focus: {qa_focus}\n"
        "- instrucao: use este template apenas como referencia curatorial. Aproveite sinais de hierarquia, ritmo, hero, secoes e anti-padroes, mas adapte livremente a estrutura ao briefing, aos assets disponiveis e a uma composicao propria."
    )
