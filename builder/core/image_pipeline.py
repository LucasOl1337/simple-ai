from __future__ import annotations

import base64
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import quote_plus

import requests

from builder.core.text import clean_text, is_missing_value, normalize_for_match


DEFAULT_IMAGE_BASE_URL = "http://localhost:20128/v1"

INTERNAL_ALT_TOKENS = frozenset({
    "sobre o negocio", "mapa", "botao flutuante", "instagram feed",
    "feed do instagram", "whatsapp", "localizacao", "contato",
})

FALLBACK_SLOT_HINTS: dict[str, list[str]] = {
    "hero": ["ambiente", "espaco", "fachada"],
    "services": ["servico", "trabalho", "equipe"],
    "audience": ["pessoa", "cliente", "atendimento"],
}


@dataclass(frozen=True)
class ImageConfig:
    enabled: bool
    api_key: str
    base_url: str
    model: str
    size: str
    quality: str
    background: str
    detail: str
    output_format: str
    timeout_seconds: int
    hero_timeout_seconds: int
    optional_timeout_seconds: int
    parallel_workers: int


def load_image_config() -> ImageConfig:
    enabled = os.getenv("AGENT_IMAGE_ENABLED", "1").strip().lower() not in {"0", "false", "no", "off"}
    api_key = (
        os.getenv("AGENT_IMAGE_API_KEY", "").strip()
        or os.getenv("OPENAI_API_KEY", "").strip()
        or os.getenv("AGENT_LLM_API_KEY", "").strip()
        or os.getenv("FIRST_INTERACTION_API_KEY", "").strip()
        or os.getenv("INTAKE_FILTER_API_KEY", "").strip()
    )
    return ImageConfig(
        enabled=enabled,
        api_key=api_key,
        base_url=(os.getenv("AGENT_IMAGE_BASE_URL", "").strip() or DEFAULT_IMAGE_BASE_URL).rstrip("/"),
        model=os.getenv("AGENT_IMAGE_MODEL", "cx/gpt-5.4-image").strip() or "cx/gpt-5.4-image",
        size=os.getenv("AGENT_IMAGE_SIZE", "auto").strip() or "auto",
        quality=os.getenv("AGENT_IMAGE_QUALITY", "auto").strip() or "auto",
        background=os.getenv("AGENT_IMAGE_BACKGROUND", "auto").strip() or "auto",
        detail=os.getenv("AGENT_IMAGE_DETAIL", "high").strip() or "high",
        output_format=os.getenv("AGENT_IMAGE_OUTPUT_FORMAT", "png").strip() or "png",
        timeout_seconds=int(os.getenv("AGENT_IMAGE_TIMEOUT_SECONDS", "60").strip() or "60"),
        hero_timeout_seconds=int(os.getenv("AGENT_IMAGE_HERO_TIMEOUT_SECONDS", "120").strip() or "120"),
        optional_timeout_seconds=int(os.getenv("AGENT_IMAGE_OPTIONAL_SLOT_TIMEOUT_SECONDS", "60").strip() or "60"),
        parallel_workers=int(os.getenv("AGENT_IMAGE_PARALLEL_WORKERS", "1").strip() or "1"),
    )


def sanitize_alt(raw: str, fallback: str) -> str:
    normalized = normalize_for_match(raw)
    if any(token in normalized for token in INTERNAL_ALT_TOKENS):
        return fallback
    return raw


def resolve_visual_prompts(
    visual_plan: Dict[str, Any],
    business_name: str,
    segment: str,
    brand_tone: str,
    target_audience: str,
    services: list[str],
) -> list[Dict[str, str]]:
    prompts = visual_plan.get("image_prompts") if isinstance(visual_plan, dict) else None
    resolved: list[Dict[str, str]] = []

    if isinstance(prompts, list):
        for item in prompts:
            if not isinstance(item, dict):
                continue
            prompt = clean_text(item.get("prompt") or "", fallback="")
            if is_missing_value(prompt):
                continue
            raw_alt = clean_text(item.get("alt") or f"Imagem de {business_name}")
            alt = sanitize_alt(raw_alt, f"Imagem de {business_name}")
            resolved.append({
                "slot": str(item.get("slot") or f"image-{len(resolved) + 1}"),
                "prompt": prompt,
                "alt": alt,
                "caption": clean_text(item.get("caption") or item.get("slot") or "Imagem de apoio"),
            })

    if len(resolved) >= 3:
        return resolved[:3]

    service_text = ", ".join(services[:3]) or "serviços locais"
    tone_text = brand_tone if not is_missing_value(brand_tone) else "estilo profissional"
    audience_text = target_audience if not is_missing_value(target_audience) else "clientes da região"
    defaults = [
        {
            "slot": "hero",
            "prompt": f"Foto editorial realista de {segment}, ambiente profissional brasileiro, {tone_text}, luz natural, sem texto, sem mockup, sem render 3D.",
            "alt": f"Ambiente principal de {business_name}",
            "caption": "Visão principal",
        },
        {
            "slot": "services",
            "prompt": f"Foto realista de {segment} com foco em {service_text}, composição limpa, detalhes reais, sem texto embutido.",
            "alt": f"Serviços de {business_name}",
            "caption": "Serviços em destaque",
        },
        {
            "slot": "audience",
            "prompt": f"Clientes reais de {segment}, público {audience_text}, atendimento próximo, imagem confiável, sem texto.",
            "alt": f"Clientes de {business_name}",
            "caption": "Experiência do cliente",
        },
    ]
    for default in defaults:
        if len(resolved) >= 3:
            break
        resolved.append(default)
    return resolved[:3]


class ImagePipeline:
    def __init__(self, config: Optional[ImageConfig] = None):
        self.config = config or load_image_config()
        self.available = self.config.enabled and bool(self.config.api_key) and bool(self.config.base_url)

    def log_startup(self) -> None:
        if not self.config.enabled:
            print("[BUILDER] image-gen: DESABILITADO (AGENT_IMAGE_ENABLED=0)")
            return
        if not self.config.api_key:
            print("[BUILDER] image-gen: DESABILITADO — nenhuma API key encontrada.")
            return
        print(f"[BUILDER] image-provider=9router-http base_url={self.config.base_url!r} model={self.config.model}")

    def materialize(
        self,
        site_dir: Path,
        image_prompts: list[Dict[str, str]],
        fallback_segment: str,
        fallback_services: list[str],
    ) -> tuple[list[Dict[str, str]], Dict[str, Any]]:
        assets_dir = site_dir / "assets"
        assets_dir.mkdir(parents=True, exist_ok=True)
        asset_plan: list[Dict[str, Any]] = []

        for idx, entry in enumerate(image_prompts):
            prompt = clean_text(entry.get("prompt") or "", fallback="")
            alt = clean_text(entry.get("alt") or "Imagem do negócio")
            caption = clean_text(entry.get("caption") or alt)
            slot = re.sub(r"[^a-z0-9_-]+", "-", (entry.get("slot") or f"image-{idx + 1}").lower()).strip("-")
            slot = slot or f"image-{idx + 1}"
            asset_plan.append({
                "idx": idx,
                "slot": slot,
                "prompt": prompt,
                "alt": alt,
                "caption": caption,
                "stem": f"{idx + 1:02d}-{slot}",
            })

        assets_by_index: Dict[int, Dict[str, str]] = {}
        generated_count = 0
        slot_stats: Dict[str, str] = {}

        for item in asset_plan[:1]:
            image_url, status = self._resolve_one(assets_dir, item, fallback_segment, fallback_services, self.config.hero_timeout_seconds)
            generated_count += 1 if status == "generated" else 0
            slot_stats[item["slot"]] = status
            assets_by_index[item["idx"]] = {"slot": item["slot"], "url": image_url, "alt": item["alt"], "caption": item["caption"]}

        optional_plans = asset_plan[1:]
        if optional_plans:
            max_workers = max(1, min(self.config.parallel_workers, len(optional_plans)))
            futures = {}
            with ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="image-slot") as executor:
                for item in optional_plans:
                    futures[executor.submit(self._resolve_one, assets_dir, item, fallback_segment, fallback_services, self.config.optional_timeout_seconds)] = item
                for future in as_completed(futures):
                    item = futures[future]
                    try:
                        image_url, status = future.result()
                    except Exception as error:
                        print(f"[BUILDER] image generation fallback engaged: {error}")
                        image_url, status = self.fallback_image_url(item["prompt"], fallback_segment, fallback_services, item["slot"]), "fallback"
                    generated_count += 1 if status == "generated" else 0
                    slot_stats[item["slot"]] = status
                    assets_by_index[item["idx"]] = {"slot": item["slot"], "url": image_url, "alt": item["alt"], "caption": item["caption"]}

        assets = [assets_by_index[idx] for idx in sorted(assets_by_index.keys())]
        return assets, {"count": generated_count, "slots": slot_stats}

    def _resolve_one(self, assets_dir: Path, item: Dict[str, Any], fallback_segment: str, fallback_services: list[str], timeout_seconds: int) -> tuple[str, str]:
        generated_url = self.try_generate(assets_dir, item["prompt"], item["stem"], timeout_seconds)
        if generated_url:
            return generated_url, "generated"
        return self.fallback_image_url(item["prompt"], fallback_segment, fallback_services, item["slot"]), "fallback"

    def try_generate(self, assets_dir: Path, prompt: str, stem: str, timeout_seconds: Optional[int] = None) -> Optional[str]:
        if not self.available:
            print(
                f"[BUILDER] image-gen: skip slot={stem!r} — "
                f"enabled={self.config.enabled} key={bool(self.config.api_key)} url={bool(self.config.base_url)}"
            )
            return None
        try:
            payload = {
                "model": self.config.model,
                "prompt": prompt,
                "n": 1,
                "size": self.config.size,
                "quality": self.config.quality,
                "background": self.config.background,
                "image_detail": self.config.detail,
                "output_format": self.config.output_format,
            }
            response = requests.post(
                f"{self.config.base_url}/images/generations",
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.config.api_key}"},
                json=payload,
                timeout=timeout_seconds or self.config.timeout_seconds,
            )
            response.raise_for_status()
            body = response.json()
            items = body.get("data") if isinstance(body, dict) else None
            if not items:
                return None
            first = items[0] if isinstance(items, list) else None
            if not isinstance(first, dict):
                return None
            image_url = first.get("url")
            if image_url:
                return image_url
            b64_payload = first.get("b64_json") or first.get("base64") or first.get("image_base64")
            if not b64_payload:
                return None
            cleaned_payload = re.sub(r"^data:image/[^;]+;base64,", "", str(b64_payload).strip())
            cleaned_payload = re.sub(r"\s+", "", cleaned_payload)
            image_bytes = base64.b64decode(cleaned_payload, validate=False)
            filename = f"{stem}.png"
            file_path = assets_dir / filename
            file_path.write_bytes(image_bytes)
            return f"./assets/{filename}"
        except Exception as error:
            print(f"[BUILDER] image generation fallback engaged: {error}")
            return None

    @staticmethod
    def fallback_image_url(prompt: str, fallback_segment: str, fallback_services: list[str], slot: str = "") -> str:
        normalized = normalize_for_match(prompt)
        tokens = re.findall(r"[a-z0-9]+", normalized)
        if len(tokens) < 3:
            seed_text = f"{fallback_segment} {' '.join(fallback_services[:2])}".strip()
            tokens = re.findall(r"[a-z0-9]+", normalize_for_match(seed_text))
        extra = FALLBACK_SLOT_HINTS.get(slot, [])
        all_tokens = list(dict.fromkeys(tokens[:4] + extra))
        keywords = "-".join(all_tokens[:6]) if all_tokens else "small-business-local-service"
        # Picsum deterministically returns the same image per seed string —
        # gives a stable, working placeholder without requiring image-gen.
        # Replaces deprecated source.unsplash.com (returns 503 since mid-2024).
        return f"https://picsum.photos/seed/{quote_plus(keywords)}/1600/900"


def build_asset_prompt_context(materialized_assets: Any) -> str:
    if not isinstance(materialized_assets, list) or not materialized_assets:
        return ""
    lines = []
    for asset in materialized_assets:
        if not isinstance(asset, dict):
            continue
        slot = asset.get("slot", "")
        url = asset.get("url", "")
        alt = asset.get("alt", "")
        caption = asset.get("caption", "")
        lines.append(f'- slot={slot}: src="{url}" alt="{alt}" caption="{caption}"')
    if not lines:
        return ""
    return (
        "# ASSETS PRÉ-GERADOS — USO OBRIGATÓRIO\n"
        "Estas imagens já foram materializadas antes da geração do HTML. "
        "Você DEVE usar as URLs exatas abaixo em tags <img> ou background-image. "
        "A página final precisa exibir pelo menos a imagem `hero` acima da dobra. "
        "Não deixe caixas vazias, alt text visível ou placeholders sem imagem.\n\n"
        + "\n".join(lines)
    )


def ensure_assets_present_in_html(html_text: str, assets: Any) -> str:
    if not isinstance(assets, list) or not assets:
        return html_text
    if any(isinstance(asset, dict) and asset.get("url") and asset.get("url") in html_text for asset in assets):
        return html_text
    cards = []
    for asset in assets[:3]:
        if not isinstance(asset, dict) or not asset.get("url"):
            continue
        alt = clean_text(asset.get("alt") or "Imagem do negócio")
        caption = clean_text(asset.get("caption") or alt)
        cards.append(f'<figure><img src="{asset["url"]}" alt="{alt}"><figcaption>{caption}</figcaption></figure>')
    if not cards:
        return html_text
    section = """
<section class="simple-ai-generated-assets" aria-label="Imagens do negócio">
  <style>
    .simple-ai-generated-assets{padding:clamp(40px,7vw,88px) max(20px,calc((100vw - 1120px)/2));background:#fff}
    .simple-ai-generated-assets{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}
    .simple-ai-generated-assets figure{margin:0;border-radius:22px;overflow:hidden;background:#f7f3ec;box-shadow:0 18px 40px rgba(0,0,0,.08)}
    .simple-ai-generated-assets img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}
    .simple-ai-generated-assets figcaption{padding:14px 16px;font:600 14px/1.35 system-ui,sans-serif;color:#173f34}
  </style>
  __CARDS__
</section>
""".replace("__CARDS__", "\n  ".join(cards))
    lower = html_text.lower()
    main_index = lower.find("<main")
    if main_index >= 0:
        main_close = lower.find(">", main_index)
        if main_close >= 0:
            return html_text[: main_close + 1] + section + html_text[main_close + 1 :]
    body_close = lower.rfind("</body>")
    if body_close >= 0:
        return html_text[:body_close] + section + html_text[body_close:]
    return html_text + section
