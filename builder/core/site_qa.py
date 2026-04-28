from __future__ import annotations

import re
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from builder.core.text import clean_text, normalize_for_match


WA_PLACEHOLDER_RE = re.compile(r"\(?0{2}\)?\s*0{4,5}-?0{4}\b")
IMG_TAG_RE = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
ATTR_RE = re.compile(r"([:\w-]+)\s*=\s*(['\"])(.*?)\2", re.DOTALL)


@dataclass
class SiteQAResult:
    html: str
    passed: bool
    repairs_applied: int = 0
    images_total: int = 0
    images_local: int = 0
    images_broken: int = 0
    external_images_replaced: int = 0
    cta_status: str = "ok"
    warnings: list[str] = field(default_factory=list)

    def usage_payload(self) -> dict[str, Any]:
        return {
            "passed": self.passed,
            "repairs_applied": self.repairs_applied,
            "images_total": self.images_total,
            "images_local": self.images_local,
            "images_broken": self.images_broken,
            "external_images_replaced": self.external_images_replaced,
            "cta_status": self.cta_status,
            "warnings": self.warnings,
        }


class _ImageCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images: list[dict[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "img":
            return
        attr_map = {key.lower(): value or "" for key, value in attrs}
        self.images.append(attr_map)


def repair_site_html(html: str, site_dir: Path, materialized_assets: Any, spec: dict[str, Any]) -> SiteQAResult:
    assets = _normalize_assets(materialized_assets)
    result = SiteQAResult(html=html, passed=True)

    html = _repair_image_tags(html, site_dir, assets, result)
    html = _repair_missing_asset_usage(html, assets, result)
    html = _repair_whatsapp_cta(html, spec, result)
    _flag_generic_sections(html, spec, result)

    result.html = html
    result.images_total, result.images_local, result.images_broken = _count_images(html, site_dir)
    result.passed = result.images_broken == 0
    if result.images_broken:
        result.warnings.append(f"{result.images_broken} imagem(ns) local(is) quebrada(s) restante(s)")
    return result


def _flag_generic_sections(html: str, spec: dict[str, Any], result: SiteQAResult) -> None:
    normalized_html = normalize_for_match(html)
    normalized_spec = normalize_for_match(str(spec))
    has_instagram_section = "instagram" in normalized_html or "feed" in normalized_html
    has_instagram_data = "instagram.com" in normalized_spec or "@" in str(spec) or "perfil" in normalized_spec
    if has_instagram_section and not has_instagram_data:
        result.warnings.append("Seção de Instagram/feed detectada sem perfil ou conteúdo concreto no briefing")

    generic_markers = (
        "solucoes inovadoras",
        "qualidade e compromisso",
        "excelencia em cada detalhe",
        "transforme sua experiencia",
    )
    for marker in generic_markers:
        if marker in normalized_html:
            result.warnings.append(f"Texto genérico detectado: {marker}")


def _normalize_assets(materialized_assets: Any) -> list[dict[str, str]]:
    if not isinstance(materialized_assets, list):
        return []
    assets: list[dict[str, str]] = []
    for asset in materialized_assets:
        if not isinstance(asset, dict) or not asset.get("url"):
            continue
        assets.append({
            "slot": clean_text(asset.get("slot") or f"asset-{len(assets) + 1}"),
            "url": clean_text(asset.get("url")),
            "alt": clean_text(asset.get("alt") or "Imagem do negócio"),
            "caption": clean_text(asset.get("caption") or asset.get("alt") or "Imagem do negócio"),
        })
    return assets


def _repair_image_tags(html: str, site_dir: Path, assets: list[dict[str, str]], result: SiteQAResult) -> str:
    if not assets:
        return html
    replacement_index = 0

    def replace_tag(match: re.Match[str]) -> str:
        nonlocal replacement_index
        tag = match.group(0)
        attrs = _parse_attrs(tag)
        src = attrs.get("src", "").strip()
        if not src:
            asset = assets[replacement_index % len(assets)]
            replacement_index += 1
            result.repairs_applied += 1
            result.images_broken += 1
            return _set_img_attrs(tag, asset["url"], attrs.get("alt") or asset["alt"])

        if _is_external_image(src):
            asset = _asset_for_tag(attrs, assets, replacement_index)
            replacement_index += 1
            result.repairs_applied += 1
            result.external_images_replaced += 1
            result.warnings.append(f"Imagem externa substituída: {src}")
            return _set_img_attrs(tag, asset["url"], attrs.get("alt") or asset["alt"])

        if _is_local_asset(src) and not _local_src_exists(site_dir, src):
            asset = _asset_for_tag(attrs, assets, replacement_index)
            replacement_index += 1
            result.repairs_applied += 1
            result.images_broken += 1
            result.warnings.append(f"Imagem local quebrada substituída: {src}")
            return _set_img_attrs(tag, asset["url"], attrs.get("alt") or asset["alt"])

        return tag

    return IMG_TAG_RE.sub(replace_tag, html)


def _repair_missing_asset_usage(html: str, assets: list[dict[str, str]], result: SiteQAResult) -> str:
    if not assets:
        return html
    used_assets = [asset for asset in assets if asset["url"] in html]
    if used_assets:
        return html
    result.repairs_applied += 1
    result.warnings.append("Nenhum asset gerado foi usado pelo HTML; seção de imagens inserida automaticamente")
    cards = []
    for asset in assets[:3]:
        cards.append(
            f'<figure><img src="{asset["url"]}" alt="{asset["alt"]}"><figcaption>{asset["caption"]}</figcaption></figure>'
        )
    section = """
<section class="simple-ai-generated-assets" aria-label="Imagens do negócio">
  <style>
    .simple-ai-generated-assets{padding:clamp(40px,7vw,88px) max(20px,calc((100vw - 1120px)/2));background:#fff;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}
    .simple-ai-generated-assets figure{margin:0;border-radius:22px;overflow:hidden;background:#f7f3ec;box-shadow:0 18px 40px rgba(0,0,0,.08)}
    .simple-ai-generated-assets img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}
    .simple-ai-generated-assets figcaption{padding:14px 16px;font:600 14px/1.35 system-ui,sans-serif;color:#173f34}
  </style>
  __CARDS__
</section>
""".replace("__CARDS__", "\n  ".join(cards))
    return _insert_after_opening_main_or_before_body_end(html, section)


def _repair_whatsapp_cta(html: str, spec: dict[str, Any], result: SiteQAResult) -> str:
    has_whatsapp_intent = "whatsapp" in normalize_for_match(str(spec)) or "wa.me" in html.lower()
    if not has_whatsapp_intent:
        return html

    phone_candidates = re.findall(r"\+?55?\s*\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}", str(spec))
    has_real_phone = any(not WA_PLACEHOLDER_RE.search(candidate) for candidate in phone_candidates)
    if has_real_phone:
        result.cta_status = "ok"
        return html

    result.cta_status = "missing_whatsapp_number"
    result.warnings.append("WhatsApp sem número real no briefing; CTAs mantidos como pedido de contato")
    html = WA_PLACEHOLDER_RE.sub("WhatsApp a confirmar", html)
    html = re.sub(r"href=(['\"])https://wa\.me/?\1", r"href=\1#contato\1", html, flags=re.IGNORECASE)
    html = re.sub(r"href=(['\"])https://wa\.me/\?text=[^'\"]+\1", r"href=\1#contato\1", html, flags=re.IGNORECASE)
    result.repairs_applied += 1
    return html


def _count_images(html: str, site_dir: Path) -> tuple[int, int, int]:
    parser = _ImageCollector()
    parser.feed(html)
    total = len(parser.images)
    local = 0
    broken = 0
    for image in parser.images:
        src = image.get("src", "")
        if _is_local_asset(src):
            local += 1
            if not _local_src_exists(site_dir, src):
                broken += 1
    return total, local, broken


def _parse_attrs(tag: str) -> dict[str, str]:
    return {match.group(1).lower(): match.group(3) for match in ATTR_RE.finditer(tag)}


def _set_img_attrs(tag: str, src: str, alt: str) -> str:
    if re.search(r"\bsrc\s*=", tag, re.IGNORECASE):
        tag = re.sub(r"\bsrc\s*=\s*(['\"]).*?\1", f'src="{src}"', tag, count=1, flags=re.IGNORECASE | re.DOTALL)
    else:
        tag = tag[:-1].rstrip() + f' src="{src}">'
    if re.search(r"\balt\s*=", tag, re.IGNORECASE):
        tag = re.sub(r"\balt\s*=\s*(['\"]).*?\1", f'alt="{alt}"', tag, count=1, flags=re.IGNORECASE | re.DOTALL)
    else:
        tag = tag[:-1].rstrip() + f' alt="{alt}">'
    return tag


def _asset_for_tag(attrs: dict[str, str], assets: list[dict[str, str]], fallback_index: int) -> dict[str, str]:
    alt = normalize_for_match(attrs.get("alt", ""))
    src = normalize_for_match(attrs.get("src", ""))
    for asset in assets:
        slot = normalize_for_match(asset.get("slot", ""))
        caption = normalize_for_match(asset.get("caption", ""))
        if slot and (slot in alt or slot in src or slot in caption):
            return asset
    return assets[fallback_index % len(assets)]


def _is_external_image(src: str) -> bool:
    parsed = urlparse(src)
    return parsed.scheme in {"http", "https"}


def _is_local_asset(src: str) -> bool:
    clean_src = src.split("?", 1)[0].split("#", 1)[0]
    return clean_src.startswith("./assets/") or clean_src.startswith("assets/") or "/assets/" in clean_src


def _local_src_exists(site_dir: Path, src: str) -> bool:
    clean_src = src.split("?", 1)[0].split("#", 1)[0]
    if clean_src.startswith("./"):
        clean_src = clean_src[2:]
    if "/assets/" in clean_src:
        clean_src = clean_src.split("/assets/", 1)[1]
        clean_src = f"assets/{clean_src}"
    return (site_dir / clean_src).exists()


def _insert_after_opening_main_or_before_body_end(html: str, section: str) -> str:
    lower = html.lower()
    main_index = lower.find("<main")
    if main_index >= 0:
        main_close = lower.find(">", main_index)
        if main_close >= 0:
            return html[: main_close + 1] + section + html[main_close + 1 :]
    body_close = lower.rfind("</body>")
    if body_close >= 0:
        return html[:body_close] + section + html[body_close:]
    return html + section
