from __future__ import annotations

from typing import Any, Dict

from builder.core.text import clean_text, normalize_for_match


SKIP_SERVICE_TOKENS = (
    "hero", "contact", "contato", "botao flutuante",
    "feed do instagram", "instagram feed", "mapa", "sobre o negocio", "about",
)


def extract_asset_inputs_from_spec(spec: Dict[str, Any]) -> tuple[str, str, str, str, list[str]]:
    summary = spec.get("summary") or {}
    business_name = clean_text(spec.get("business_name") or summary.get("brand_name") or "Seu Negócio")
    segment = clean_text(spec.get("segment") or summary.get("business_type") or "Negócio local")
    brand_tone = clean_text(summary.get("brand_tone") or "", fallback="")
    target_audience = clean_text(summary.get("target_audience") or "", fallback="")
    modules = spec.get("user_facing_actions") or summary.get("modules") or []

    service_labels: list[str] = []
    for item in modules:
        label = (item.get("label") or item.get("id") or "") if isinstance(item, dict) else str(item)
        label = label.strip()
        if label and not any(token in normalize_for_match(label) for token in SKIP_SERVICE_TOKENS):
            service_labels.append(clean_text(label))

    if not service_labels:
        service_labels = ["Qualidade no atendimento", "Experiência e dedicação", "Contato rápido"]
    return business_name, segment, brand_tone, target_audience, service_labels[:6]
