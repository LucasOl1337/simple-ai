from __future__ import annotations

import re
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from builder.core.text import normalize_for_match


MAX_DIMENSION_SCORE = 1000
DIMENSIONS = (
    "html_structure",
    "responsive_css",
    "non_generic_content",
    "valid_cta_links",
    "images",
    "required_sections",
    "typography",
    "colors_branding",
    "accessibility",
    "polish",
)

PLACEHOLDER_RE = re.compile(
    r"\b(lorem ipsum|placeholder|todo|em breve|coming soon|clique aqui|saiba mais sobre|"
    r"seu negocio|sua empresa|nome da empresa|telefone aqui|email aqui|endereco aqui|"
    r"exemplo\.com|0000-0000|00\s*00000-0000)\b",
    re.IGNORECASE,
)
GENERIC_RE = re.compile(
    r"\b(solucoes inovadoras|qualidade e compromisso|excelencia em cada detalhe|"
    r"transforme sua experiencia|atendimento personalizado|melhor solucao para voce|"
    r"profissionais qualificados|anos de experiencia|precos acessiveis)\b",
    re.IGNORECASE,
)
CSS_MEDIA_RE = re.compile(r"@media\s*\(|clamp\(|minmax\(|auto-fit|auto-fill", re.IGNORECASE)
CSS_COLOR_RE = re.compile(r"#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|linear-gradient\(", re.IGNORECASE)
FONT_RE = re.compile(r"font-family\s*:|fonts\.googleapis\.com|@font-face", re.IGNORECASE)
REMOTE_GENERIC_IMAGE_RE = re.compile(r"source\.unsplash\.com|images\.unsplash\.com", re.IGNORECASE)
ANCHOR_RE = re.compile(r"<a\b[^>]*\bhref\s*=\s*(['\"])(.*?)\1", re.IGNORECASE | re.DOTALL)
IMG_RE = re.compile(r"<img\b([^>]*)>", re.IGNORECASE | re.DOTALL)
ATTR_RE = re.compile(r"([:\w-]+)\s*=\s*(['\"])(.*?)\2", re.DOTALL)


@dataclass
class SiteScoreResult:
    score: int
    dimensions: dict[str, int]
    issues: dict[str, list[str]] = field(default_factory=dict)

    def usage_payload(self) -> dict[str, Any]:
        quality_bot = strict_quality_bot_score(self.score, self.dimensions, self.issues)
        return {
            "score": self.score,
            "max_score": len(DIMENSIONS) * MAX_DIMENSION_SCORE,
            "dimensions": self.dimensions,
            "issues": self.issues,
            "passed_8500": self.score >= 8500,
            "quality_bot": quality_bot,
        }


def strict_quality_bot_score(score: int, dimensions: dict[str, int], issues: dict[str, list[str]]) -> dict[str, Any]:
    issue_count = sum(len(items) for items in issues.values())
    weak_dimensions = [name for name, value in dimensions.items() if value < 900]
    almost_perfect = score >= 9900 and issue_count == 0 and not weak_dimensions
    strict_score = max(0, score - 5000 - issue_count * 300 - len(weak_dimensions) * 450)
    if almost_perfect:
        strict_score = min(10000, strict_score + 5000)
    strict_score = max(0, min(10000, strict_score))
    if strict_score >= 9000:
        verdict = "Impecavel"
    elif strict_score >= 7000:
        verdict = "Muito forte"
    elif strict_score >= 5000:
        verdict = "Bom, mas ainda comum"
    elif strict_score >= 3000:
        verdict = "Normal"
    else:
        verdict = "Fraco"
    return {
        "agent": "Agente 03 - avaliador de qualidade",
        "score": strict_score,
        "max_score": 10000,
        "verdict": verdict,
        "raw_technical_score": score,
        "issue_count": issue_count,
        "weak_dimensions": weak_dimensions,
    }


class _StructureParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.tags: list[str] = []
        self.ids: set[str] = set()
        self.classes: list[str] = []
        self.text_parts: list[str] = []
        self.links: list[dict[str, str]] = []
        self.images: list[dict[str, str]] = []
        self.inputs_without_labels = 0
        self.labels = 0
        self.heading_levels: list[int] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        attr_map = {key.lower(): value or "" for key, value in attrs}
        self.tags.append(tag)
        if attr_map.get("id"):
            self.ids.add(attr_map["id"].lower())
        if attr_map.get("class"):
            self.classes.extend(attr_map["class"].lower().split())
        if tag == "a":
            self.links.append(attr_map)
        elif tag == "img":
            self.images.append(attr_map)
        elif tag in {"input", "textarea", "select"} and not attr_map.get("aria-label"):
            self.inputs_without_labels += 1
        elif tag == "label":
            self.labels += 1
        elif re.fullmatch(r"h[1-6]", tag):
            self.heading_levels.append(int(tag[1]))

    def handle_data(self, data: str) -> None:
        cleaned = " ".join(data.split())
        if cleaned:
            self.text_parts.append(cleaned)


def score_site_html(
    html: str,
    site_dir: Path | str | None = None,
    spec: dict[str, Any] | None = None,
    materialized_assets: Any = None,
) -> SiteScoreResult:
    parser = _StructureParser()
    parser.feed(html or "")
    normalized = normalize_for_match(html or "")
    text = " ".join(parser.text_parts)
    site_path = Path(site_dir) if site_dir else None
    spec = spec or {}
    issues: dict[str, list[str]] = {dimension: [] for dimension in DIMENSIONS}

    dimensions = {
        "html_structure": _score_html_structure(html, parser, issues),
        "responsive_css": _score_responsive_css(html, issues),
        "non_generic_content": _score_content(text, spec, issues),
        "valid_cta_links": _score_links(parser.links, issues),
        "images": _score_images(parser.images, html, site_path, materialized_assets, issues),
        "required_sections": _score_required_sections(parser, normalized, issues),
        "typography": _score_typography(html, issues),
        "colors_branding": _score_colors_branding(html, spec, issues),
        "accessibility": _score_accessibility(parser, html, issues),
        "polish": _score_polish(html, text, issues),
    }
    clean_issues = {key: value for key, value in issues.items() if value}
    return SiteScoreResult(score=sum(dimensions.values()), dimensions=dimensions, issues=clean_issues)


def _score_html_structure(html: str, parser: _StructureParser, issues: dict[str, list[str]]) -> int:
    score = 0
    checks = [
        (html.lower().lstrip().startswith("<!doctype"), 150, "sem <!doctype>"),
        ("html" in parser.tags, 100, "sem tag html"),
        ("head" in parser.tags and "body" in parser.tags, 150, "sem head/body"),
        ("title" in parser.tags, 100, "sem title"),
        ("main" in parser.tags, 150, "sem main"),
        ("header" in parser.tags or "nav" in parser.tags, 100, "sem header/nav"),
        ("footer" in parser.tags, 100, "sem footer"),
        (parser.heading_levels[:1] == [1], 150, "sem h1 inicial claro"),
    ]
    for ok, points, issue in checks:
        if ok:
            score += points
        else:
            issues["html_structure"].append(issue)
    return min(score, MAX_DIMENSION_SCORE)


def _score_responsive_css(html: str, issues: dict[str, list[str]]) -> int:
    score = 250 if "viewport" in html.lower() else 0
    if not score:
        issues["responsive_css"].append("sem meta viewport")
    score += min(len(CSS_MEDIA_RE.findall(html)) * 150, 450)
    score += 150 if re.search(r"display\s*:\s*(grid|flex)", html, re.IGNORECASE) else 0
    score += 150 if re.search(r"max-width\s*:|width\s*:\s*100%|min\(", html, re.IGNORECASE) else 0
    if score < 700:
        issues["responsive_css"].append("poucos sinais de responsividade")
    return min(score, MAX_DIMENSION_SCORE)


def _score_content(text: str, spec: dict[str, Any], issues: dict[str, list[str]]) -> int:
    words = re.findall(r"\w+", text, re.UNICODE)
    score = min(len(words) * 3, 450)
    if len(words) < 180:
        issues["non_generic_content"].append("conteudo curto")
    brand = normalize_for_match(str(spec.get("business_name") or spec.get("summary", {}).get("brand_name") or ""))
    segment = normalize_for_match(str(spec.get("segment") or spec.get("business_type") or ""))
    normalized_text = normalize_for_match(text)
    if brand and brand in normalized_text:
        score += 200
    else:
        issues["non_generic_content"].append("marca pouco presente")
    if segment and segment in normalized_text:
        score += 150
    generic_hits = len(GENERIC_RE.findall(text))
    score += max(0, 200 - generic_hits * 80)
    if generic_hits:
        issues["non_generic_content"].append("frases genericas detectadas")
    return min(score, MAX_DIMENSION_SCORE)


def _score_links(links: list[dict[str, str]], issues: dict[str, list[str]]) -> int:
    if not links:
        issues["valid_cta_links"].append("sem links/CTAs")
        return 250
    score = 300
    valid = 0
    invalid = 0
    cta = 0
    for link in links:
        href = (link.get("href") or "").strip()
        if _valid_href(href):
            valid += 1
        else:
            invalid += 1
        if href.startswith(("#", "tel:", "mailto:", "https://wa.me", "http://wa.me")):
            cta += 1
    score += min(valid * 100, 400) + min(cta * 100, 200) - min(invalid * 150, 500)
    if invalid:
        issues["valid_cta_links"].append(f"{invalid} link(s) invalidos")
    if cta == 0:
        issues["valid_cta_links"].append("sem CTA acionavel")
    return max(0, min(score, MAX_DIMENSION_SCORE))


def _score_images(
    images: list[dict[str, str]], html: str, site_dir: Path | None, materialized_assets: Any, issues: dict[str, list[str]]
) -> int:
    if not images:
        issues["images"].append("sem imagens")
        return 150
    missing_alt = sum(1 for image in images if not (image.get("alt") or "").strip())
    broken = sum(1 for image in images if _is_broken_local_src(image.get("src", ""), site_dir))
    generic_remote = sum(1 for image in images if REMOTE_GENERIC_IMAGE_RE.search(image.get("src", "")))
    generated_assets = _asset_urls(materialized_assets)
    used_generated = sum(1 for url in generated_assets if url and url in html)
    score = 350 + min(len(images) * 120, 300) + (250 if used_generated or not generated_assets else 0)
    score -= min(missing_alt * 120, 350) + min(broken * 250, 600) + min(generic_remote * 250, 800)
    if missing_alt:
        issues["images"].append(f"{missing_alt} imagem(ns) sem alt")
    if broken:
        issues["images"].append(f"{broken} imagem(ns) local(is) quebrada(s)")
    if generated_assets and not used_generated:
        issues["images"].append("assets gerados nao usados")
    if generic_remote:
        issues["images"].append(f"{generic_remote} imagem(ns) remota(s) generica(s)")
    return max(0, min(score, MAX_DIMENSION_SCORE))


def _score_required_sections(parser: _StructureParser, normalized: str, issues: dict[str, list[str]]) -> int:
    signals = set(parser.tags) | parser.ids | set(parser.classes)
    requirements = {
        "hero": ("hero", "inicio", "home"),
        "servicos/produtos": ("servicos", "servico", "produtos", "catalogo", "cardapio"),
        "sobre/prova": ("sobre", "historia", "depoimentos", "clientes", "prova"),
        "contato": ("contato", "whatsapp", "localizacao", "endereco"),
    }
    score = 200 if parser.tags.count("section") >= 3 else 0
    for label, options in requirements.items():
        found = any(option in signals or option in normalized for option in options)
        if found:
            score += 200
        else:
            issues["required_sections"].append(f"sem secao de {label}")
    return min(score, MAX_DIMENSION_SCORE)


def _score_typography(html: str, issues: dict[str, list[str]]) -> int:
    score = 350 if FONT_RE.search(html) else 0
    score += 250 if re.search(r"font-size\s*:\s*(clamp\(|var\(|[\d.]+rem)", html, re.IGNORECASE) else 0
    score += 200 if re.search(r"line-height\s*:", html, re.IGNORECASE) else 0
    score += 200 if re.search(r"font-weight\s*:", html, re.IGNORECASE) else 0
    if score < 650:
        issues["typography"].append("tipografia pouco definida")
    return min(score, MAX_DIMENSION_SCORE)


def _score_colors_branding(html: str, spec: dict[str, Any], issues: dict[str, list[str]]) -> int:
    color_count = len(set(CSS_COLOR_RE.findall(html)))
    score = min(color_count * 120, 480)
    score += 220 if re.search(r":root\s*{|--[\w-]+\s*:", html, re.IGNORECASE) else 0
    score += 150 if "gradient" in html.lower() or "box-shadow" in html.lower() else 0
    brand = normalize_for_match(str(spec.get("business_name") or spec.get("summary", {}).get("brand_name") or ""))
    if brand and brand in normalize_for_match(html):
        score += 150
    if score < 650:
        issues["colors_branding"].append("branding visual fraco")
    return min(score, MAX_DIMENSION_SCORE)


def _score_accessibility(parser: _StructureParser, html: str, issues: dict[str, list[str]]) -> int:
    score = 200 if parser.heading_levels and parser.heading_levels[0] == 1 else 0
    score += 200 if "lang=" in html.lower() else 0
    score += 200 if all((image.get("alt") or "").strip() for image in parser.images) else 0
    score += 150 if "aria-" in html.lower() or parser.labels >= parser.inputs_without_labels else 0
    score += 150 if "nav" in parser.tags or "footer" in parser.tags else 0
    score += 100 if re.search(r":focus|focus-visible", html, re.IGNORECASE) else 0
    if score < 700:
        issues["accessibility"].append("sinais basicos de acessibilidade insuficientes")
    return min(score, MAX_DIMENSION_SCORE)


def _score_polish(html: str, text: str, issues: dict[str, list[str]]) -> int:
    placeholders = len(PLACEHOLDER_RE.findall(html))
    score = 450 if placeholders == 0 else max(0, 450 - placeholders * 120)
    score += 150 if "box-shadow" in html.lower() else 0
    score += 150 if "border-radius" in html.lower() else 0
    score += 100 if "transition" in html.lower() or "animation" in html.lower() else 0
    score += 150 if len(text) > 1200 and len(html) > 7000 else 0
    if placeholders:
        issues["polish"].append(f"{placeholders} placeholder(s) detectado(s)")
    if REMOTE_GENERIC_IMAGE_RE.search(html):
        score -= 450
        issues["polish"].append("imagem remota generica detectada")
    if "source.unsplash.com" in html.lower():
        score -= 350
        issues["polish"].append("fallback visual remoto pode renderizar vazio/quebrado")
    return max(0, min(score, MAX_DIMENSION_SCORE))


def _valid_href(href: str) -> bool:
    if not href or href in {"#", "javascript:void(0)"}:
        return False
    if href.startswith("#"):
        return len(href) > 1
    parsed = urlparse(href)
    return parsed.scheme in {"http", "https", "mailto", "tel"}


def _is_broken_local_src(src: str, site_dir: Path | None) -> bool:
    if not src or not site_dir:
        return False
    parsed = urlparse(src)
    if parsed.scheme or src.startswith("data:"):
        return False
    clean_src = parsed.path.lstrip("/")
    return not (site_dir / clean_src).exists()


def _asset_urls(materialized_assets: Any) -> list[str]:
    if not isinstance(materialized_assets, list):
        return []
    return [str(asset.get("url") or "") for asset in materialized_assets if isinstance(asset, dict) and asset.get("url")]
