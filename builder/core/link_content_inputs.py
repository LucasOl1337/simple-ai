from __future__ import annotations

from typing import Any

from builder.core.text import clean_text


def normalize_link_content(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return {"sources": []}
    sources = raw.get("sources")
    if not isinstance(sources, list):
        return {"sources": []}
    return {"sources": [source for source in sources if isinstance(source, dict)]}


def build_link_content_prompt_context(raw: Any) -> str:
    data = normalize_link_content(raw)
    sources = data.get("sources") or []
    if not sources:
        return ""

    lines = ["# CONTEÚDO EXTRAÍDO DE LINKS DO USUÁRIO"]
    for index, source in enumerate(sources[:3], start=1):
        core = source.get("core_info") or {}
        content = source.get("content_signals") or {}
        visual = source.get("visual_signals") or {}
        hints = source.get("builder_hints") or {}
        images = source.get("reference_images") or []
        lines.extend([
            f"## Fonte {index}",
            f"- url: {clean_text(source.get('source_url') or '')}",
            f"- tipo: {clean_text(source.get('source_type') or '')}",
            f"- resumo: {clean_text(source.get('summary') or '')}",
            f"- nome detectado: {clean_text(core.get('business_name') or '')}",
            f"- segmento detectado: {clean_text(core.get('business_type') or '')}",
            f"- bio/descrição: {clean_text(core.get('bio') or '')}",
            f"- ofertas/sinais: {_join(content.get('offerings'))}",
            f"- tom: {clean_text(content.get('tone') or '')}",
            f"- estilo visual: {clean_text(visual.get('style') or '')}",
            f"- clima de imagem: {_join(visual.get('image_mood'))}",
            f"- layout sugerido: {clean_text(hints.get('layout_suggestion') or '')}",
            f"- prompts de imagem devem incorporar: {_join(hints.get('image_prompt_additions'))}",
            f"- imagens de base salvas: {len(images)}",
        ])
    lines.append("Use esses sinais para deixar conteúdo, layout e imagens mais fiéis ao negócio. Não invente dados ausentes como preço, endereço ou telefone.")
    return "\n".join(lines).strip()


def collect_image_prompt_additions(raw: Any) -> list[str]:
    data = normalize_link_content(raw)
    additions: list[str] = []
    for source in data.get("sources") or []:
        hints = source.get("builder_hints") or {}
        visual = source.get("visual_signals") or {}
        for item in hints.get("image_prompt_additions") or []:
            _append_unique(additions, item)
        for item in visual.get("image_mood") or []:
            _append_unique(additions, item)
        if visual.get("style"):
            _append_unique(additions, visual.get("style"))
    return additions[:10]


def enrich_visual_prompts_with_link_content(prompts: list[dict[str, str]], raw: Any) -> list[dict[str, str]]:
    additions = collect_image_prompt_additions(raw)
    if not additions:
        return prompts
    suffix = "; referência visual do link: " + ", ".join(additions)
    enriched = []
    for prompt in prompts:
        item = dict(prompt)
        current = clean_text(item.get("prompt") or "", fallback="")
        if current and suffix not in current:
            item["prompt"] = f"{current}{suffix}"
        enriched.append(item)
    return enriched


def _join(value: Any) -> str:
    if isinstance(value, list):
        return ", ".join(clean_text(item) for item in value if clean_text(item)) or "não definido"
    return clean_text(value or "não definido")


def _append_unique(items: list[str], value: Any) -> None:
    text = clean_text(value or "", fallback="")
    if text and text not in items:
        items.append(text)
