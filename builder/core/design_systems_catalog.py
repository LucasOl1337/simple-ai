"""Catalog of vendored Open Design systems with heuristic top-3 narrowing.

Loads the 71 DESIGN.md files at vendor/open-design/design-systems/ once and
classifies each into one of 5 visual schools. Exposes narrow_top3(spec)
which returns three candidate systems for the builder's single Opus 4.7 call.

Parser is intentionally pragmatic: DESIGN.md files use rich prose, not strict
front-matter. We extract folder-name as ID, h1 as name, hex/oklch colors and
known font names from anywhere in the body, and derive vibe tags + school
from the category line, h1, and intro paragraph.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any


SCHOOLS: tuple[str, ...] = (
    "tech_utility",
    "soft_warm",
    "editorial_monocle",
    "modern_minimal",
    "brutalist",
)


@dataclass(frozen=True)
class DesignSystemSpec:
    id: str
    name: str
    palette_oklch: dict[str, str]      # color slot → hex/oklch literal
    typography: dict[str, str]         # role → font family name
    density: str                       # compact | comfortable | spacious
    vibe_tags: tuple[str, ...]
    school: str                        # one of SCHOOLS
    source_url: str
    raw_markdown: str = field(default="", repr=False, compare=False)


_TECH_TONES = {"tech", "minimal", "engineered", "sharp", "developer", "saas"}
_EDITORIAL_TYPES = {"editorial", "agency", "media", "magazine", "publication"}
_BRUTALIST_TYPES = {"fashion", "creative", "cultural", "art_gallery", "disruptive"}
_CORPORATE_TYPES = {"corporate", "institutional", "fintech", "legal", "consulting"}


def _summary(spec: dict[str, Any]) -> dict[str, Any]:
    s = spec.get("summary")
    return s if isinstance(s, dict) else {}


def _classify_school(spec: dict[str, Any]) -> str:
    """Map (brand_tone, business_type) → one of 5 schools.

    Precedence (first match wins):
        brand_tone in _TECH_TONES                  → tech_utility
        business_type in _EDITORIAL_TYPES          → editorial_monocle
        business_type in _BRUTALIST_TYPES          → brutalist
        business_type in _CORPORATE_TYPES          → modern_minimal
        default                                    → soft_warm
    """
    summary = _summary(spec)
    brand_tone = str(summary.get("brand_tone") or "").strip().lower()
    business_type = str(summary.get("business_type") or "").strip().lower()

    if brand_tone in _TECH_TONES:
        return "tech_utility"
    if business_type in _EDITORIAL_TYPES:
        return "editorial_monocle"
    if business_type in _BRUTALIST_TYPES:
        return "brutalist"
    if business_type in _CORPORATE_TYPES:
        return "modern_minimal"
    return "soft_warm"


# --- Pragmatic DESIGN.md parser ----------------------------------------------

_HEX_RE = re.compile(r"#[0-9a-fA-F]{3,8}\b")
_OKLCH_RE = re.compile(r"oklch\([^)]+\)", re.IGNORECASE)
_H1_RE = re.compile(r"^\s*#\s+(.+?)\s*$", re.MULTILINE)
_CATEGORY_RE = re.compile(r"^>\s*Category:\s*(.+?)\s*$", re.MULTILINE | re.IGNORECASE)

_KNOWN_FONTS = (
    "Inter Variable", "Inter", "SF Pro Display", "SF Pro Text", "SF Pro", "SF Mono",
    "Roboto Mono", "Roboto", "Helvetica Neue", "Helvetica", "Arial",
    "Berkeley Mono", "JetBrains Mono", "Monaco", "Menlo", "Consolas",
    "Geist Mono", "Geist", "Söhne Mono", "Söhne", "Sohne",
    "Times New Roman", "Times", "Garamond", "EB Garamond", "Cormorant",
    "Playfair Display", "Playfair", "Merriweather", "Source Serif", "Source Sans",
    "IBM Plex Mono", "IBM Plex Sans", "IBM Plex Serif", "IBM Plex",
    "Manrope", "Outfit", "Bricolage Grotesque", "Bricolage",
    "Instrument Serif", "Public Sans", "Work Sans",
    "DM Mono", "DM Sans", "DM Serif Display", "DM Serif",
    "Lora", "Crimson Pro", "Crimson", "Spectral", "Karla", "Mulish",
    "Space Grotesk", "Space Mono", "JetBrains", "Fira Code", "Fira Sans",
    "Cabinet Grotesk", "Satoshi", "Söhne Breit", "Söhne Schmal",
    "Neue Haas Grotesk", "Neue Haas", "Suisse Int'l", "Suisse",
    "GT America", "GT Sectra", "GT Walsheim",
    "Editorial New", "PP Editorial", "PP Neue Montreal",
)
# Sort by length descending so longest-match wins (e.g., "Inter Variable" before "Inter")
_KNOWN_FONTS_SORTED = tuple(sorted(_KNOWN_FONTS, key=len, reverse=True))

_SCHOOL_KEYWORDS = {
    "tech_utility": ("saas", "developer", "tech", "software", "engineering", "linear",
                     "stripe", "vercel", "cursor", "github", "ai", "platform", "tool",
                     "monochrome", "minimal", "engineered", "console", "productivity",
                     "workspace", "data", "cloud", "api", "devtool", "command"),
    "soft_warm": ("warm", "artisan", "soft", "cream", "earthy", "hospitality",
                  "bakery", "comfort", "home", "wellness", "natural", "organic",
                  "coffee", "artisanal", "cozy", "gentle", "friendly"),
    "editorial_monocle": ("editorial", "magazine", "publication", "monocle", "newsprint",
                          "serif", "verge", "wired", "media", "journalism",
                          "culture", "news", "article", "reader", "blog"),
    "modern_minimal": ("corporate", "institutional", "trust", "fintech", "banking",
                       "minimal", "professional", "stripe", "wise", "revolut", "kraken",
                       "enterprise", "business", "finance", "insurance", "legal"),
    "brutalist": ("brutalist", "bold", "raw", "fashion", "disruptive", "motorsport",
                  "luxury", "supercar", "ferrari", "lamborghini", "bugatti", "playstation",
                  "tesla", "spacex", "high-impact", "sport", "performance", "gaming",
                  "automotive", "electric", "racing"),
}


def _classify_system_school(vibe_pool: str, folder_name: str) -> str:
    """Classify a single design system into a school based on keyword overlap.

    vibe_pool is a normalized string of category line + h1 + intro paragraph
    + folder name. School with the most keyword hits wins. Ties broken by
    SCHOOLS declaration order (tech_utility, soft_warm, editorial_monocle,
    modern_minimal, brutalist).
    """
    haystack = (vibe_pool + " " + folder_name).lower()
    best_school = "soft_warm"
    best_score = 0
    for school in SCHOOLS:
        score = sum(1 for kw in _SCHOOL_KEYWORDS[school] if kw in haystack)
        if score > best_score:
            best_score = score
            best_school = school
    return best_school


def _extract_palette(md: str, max_colors: int = 5) -> dict[str, str]:
    palette: dict[str, str] = {}
    seen: set[str] = set()
    # OKLch first (rare but high signal)
    for color in _OKLCH_RE.findall(md):
        if color.lower() not in seen and len(palette) < max_colors:
            palette[f"color_{len(palette) + 1}"] = color
            seen.add(color.lower())
    # Then hex
    for color in _HEX_RE.findall(md):
        norm = color.lower()
        if norm not in seen and len(palette) < max_colors:
            palette[f"color_{len(palette) + 1}"] = color
            seen.add(norm)
    return palette


def _extract_typography(md: str, max_fonts: int = 3) -> dict[str, str]:
    typography: dict[str, str] = {}
    seen: set[str] = set()
    for font in _KNOWN_FONTS_SORTED:
        if font in md and font.lower() not in seen and len(typography) < max_fonts:
            slot = (
                "display" if "display" not in typography
                else ("body" if "body" not in typography else "mono")
            )
            typography[slot] = font
            seen.add(font.lower())
    if not typography:
        typography["body"] = "Inter"  # universal fallback
    return typography


def _extract_density(md: str) -> str:
    body = md.lower()
    if any(w in body for w in ("compact", "dense", "tight", "information density")):
        return "compact"
    if any(w in body for w in ("spacious", "airy", "generous spacing", "breathing room")):
        return "spacious"
    return "comfortable"


def _extract_vibe_pool(md: str, folder_name: str) -> str:
    parts = [folder_name]
    h1_match = _H1_RE.search(md)
    if h1_match:
        parts.append(h1_match.group(1))
    cat_match = _CATEGORY_RE.search(md)
    if cat_match:
        parts.append(cat_match.group(1))
    # Grab the first ~400 chars of body prose (after frontmatter-like quotes)
    body_lines = [
        line for line in md.splitlines()
        if line and not line.startswith("#") and not line.startswith(">")
    ]
    body = " ".join(body_lines)[:400]
    parts.append(body)
    return " ".join(parts)


_GENERIC_TOKENS = {
    "this", "that", "with", "from", "have", "been", "were", "they", "their",
    "design", "system", "where", "which", "what", "more", "most", "into",
    "than", "while", "about", "every", "such", "much", "very", "just",
    "also", "even", "make", "made", "built", "uses", "used", "creates",
    "across", "throughout", "between", "without", "rather", "despite",
}


def _extract_vibe_tags(vibe_pool: str, max_tags: int = 10) -> tuple[str, ...]:
    tokens = re.findall(r"[a-zA-Z][a-zA-Z\-]{3,15}", vibe_pool.lower())
    seen: list[str] = []
    for tok in tokens:
        if tok in _GENERIC_TOKENS or tok in seen:
            continue
        seen.append(tok)
        if len(seen) >= max_tags:
            break
    return tuple(seen)


def _parse_design_md(md: str, folder_name: str, source_url: str) -> DesignSystemSpec:
    h1_match = _H1_RE.search(md)
    raw_name = h1_match.group(1).strip() if h1_match else folder_name
    name = re.sub(
        r"^Design System\s*(Inspired by\s+)?", "", raw_name, flags=re.IGNORECASE
    ).strip() or raw_name

    palette = _extract_palette(md)
    typography = _extract_typography(md)
    density = _extract_density(md)
    vibe_pool = _extract_vibe_pool(md, folder_name)
    vibe_tags = _extract_vibe_tags(vibe_pool)
    school = _classify_system_school(vibe_pool, folder_name)
    system_id = folder_name

    return DesignSystemSpec(
        id=system_id,
        name=name,
        palette_oklch=palette,
        typography=typography,
        density=density,
        vibe_tags=vibe_tags,
        school=school,
        source_url=source_url,
        raw_markdown=md,
    )


@lru_cache(maxsize=1)
def _cached_load(design_systems_root_str: str) -> tuple[DesignSystemSpec, ...]:
    root = Path(design_systems_root_str)
    if not root.exists():
        return tuple()
    out: list[DesignSystemSpec] = []
    for child in sorted(root.iterdir()):
        if not child.is_dir():
            continue
        md_path = child / "DESIGN.md"
        if not md_path.exists():
            continue
        md = md_path.read_text(encoding="utf-8")
        source_url = (
            f"https://github.com/nexu-io/open-design/tree/main/"
            f"design-systems/{child.name}"
        )
        out.append(_parse_design_md(md, child.name, source_url))
    return tuple(out)


def load_open_design_systems(path: Path) -> list[DesignSystemSpec]:
    """Load and cache the DESIGN.md catalogs from the vendored folder."""
    return list(_cached_load(str(path)))


# --- scoring + narrowing ------------------------------------------------------

def _score(system: DesignSystemSpec, spec: dict[str, Any]) -> float:
    """Score a system against a build spec. Range ~0..1.5."""
    summary = _summary(spec)
    brand_tone = str(summary.get("brand_tone") or "").lower()
    content_volume = str(summary.get("content_volume") or "").lower()

    # Sub-score 1: vibe ∩ brand_tone tokens (weight 0.4)
    tone_tokens = set(re.split(r"[\s,/]+", brand_tone)) if brand_tone else set()
    vibe_set = set(system.vibe_tags)
    vibe_overlap = (
        len(vibe_set & tone_tokens) / max(len(vibe_set), 1)
    )
    vibe_score = min(vibe_overlap, 1.0) * 0.4

    # Sub-score 2: density vs content volume (weight 0.3)
    volume_to_density = {
        "low": "spacious",
        "medium": "comfortable",
        "high": "compact",
    }
    expected_density = volume_to_density.get(content_volume, "comfortable")
    density_score = 0.3 if system.density == expected_density else 0.15

    # Sub-score 3: typography presence (weight 0.3)
    has_display = bool(system.typography.get("display"))
    has_body = bool(system.typography.get("body"))
    typo_score = (0.15 if has_display else 0.0) + (0.15 if has_body else 0.0)

    # School-match bonus (weight 0.2)
    school = _classify_school(spec)
    bonus = 0.2 if system.school == school else 0.0

    return vibe_score + density_score + typo_score + bonus


def narrow_top3(
    spec: dict[str, Any],
    catalog: list[DesignSystemSpec] | None = None,
) -> list[DesignSystemSpec]:
    """Return exactly 3 design systems ranked for the given spec.

    1) Classify school via _classify_school.
    2) Filter catalog to systems with system.school == classified school.
    3) Score and sort descending.
    4) If filtered set has < 3, top up by ranking ALL remaining systems
       (any school) and appending highest-scored until len == 3.
    """
    if catalog is None:
        default_path = (
            Path(__file__).resolve().parents[2]
            / "vendor"
            / "open-design"
            / "design-systems"
        )
        catalog = load_open_design_systems(default_path)

    if not catalog:
        placeholder = DesignSystemSpec(
            id="fallback",
            name="Fallback",
            palette_oklch={},
            typography={"body": "Inter"},
            density="comfortable",
            vibe_tags=(),
            school=_classify_school(spec),
            source_url="",
        )
        return [placeholder, placeholder, placeholder]

    school = _classify_school(spec)
    same_school = sorted(
        (s for s in catalog if s.school == school),
        key=lambda s: _score(s, spec),
        reverse=True,
    )

    chosen = list(same_school[:3])

    if len(chosen) < 3:
        chosen_ids = {s.id for s in chosen}
        remainder = sorted(
            (s for s in catalog if s.id not in chosen_ids),
            key=lambda s: _score(s, spec),
            reverse=True,
        )
        for s in remainder:
            chosen.append(s)
            if len(chosen) == 3:
                break

    return chosen[:3]
