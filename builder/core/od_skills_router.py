"""Open Design skills router.

Maps a build spec to one of 5 vendored skills via a deterministic lookup
table. No LLM call. The chosen skill's SKILL.md is injected into the
builder system prompt by the caller.

Skills (vendored under vendor/open-design/skills/):
    pricing-page, blog-post, web-prototype, saas-landing, magazine-poster
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any


SKILLS: list[str] = [
    "pricing-page",
    "blog-post",
    "web-prototype",
    "saas-landing",
    "magazine-poster",
]

_SAAS_TYPES = {"saas", "software", "platform", "tool"}
_EDITORIAL_TYPES = {"editorial", "magazine", "news", "agency_creative"}
_BLOG_FRIENDLY_TYPES = {
    "padaria",
    "restaurant",
    "salon",
    "services_local",
    "hospitality",
}
_PRICING_CTAS = {"sell_subscription", "tier_compare", "view_pricing"}


def _summary(spec: dict[str, Any]) -> dict[str, Any]:
    s = spec.get("summary")
    return s if isinstance(s, dict) else {}


def _design_plan(spec: dict[str, Any]) -> dict[str, Any]:
    d = spec.get("design_plan") or _summary(spec).get("design_plan")
    return d if isinstance(d, dict) else {}


def _cta_type(spec: dict[str, Any]) -> str:
    plan = _design_plan(spec)
    cta = plan.get("cta_strategy") or {}
    if isinstance(cta, dict):
        return str(cta.get("type") or "").strip().lower()
    return ""


def match_skill(spec: dict[str, Any]) -> str:
    """Return one of SKILLS based on spec content. Precedence top-to-bottom."""
    summary = _summary(spec)
    plan = _design_plan(spec)
    business_type = str(summary.get("business_type") or "").strip().lower()
    cta_type = _cta_type(spec)
    has_pricing = bool(plan.get("has_pricing"))
    content_volume = str(summary.get("content_volume") or "").strip().lower()
    has_blog_intent = bool(plan.get("has_blog_intent"))

    if business_type in _SAAS_TYPES and has_pricing:
        return "saas-landing"

    if cta_type in _PRICING_CTAS:
        return "pricing-page"

    if business_type in _EDITORIAL_TYPES or cta_type == "launch_announcement":
        return "magazine-poster"

    if content_volume == "high" and (
        has_blog_intent or business_type in _BLOG_FRIENDLY_TYPES
    ):
        return "blog-post"

    return "web-prototype"


@lru_cache(maxsize=8)
def _load_skill_md(skill_id: str, vendor_path_str: str) -> str:
    md_path = Path(vendor_path_str) / skill_id / "SKILL.md"
    if not md_path.exists():
        raise ValueError(
            f"SKILL.md not found for skill_id={skill_id!r} at {md_path}"
        )
    return md_path.read_text(encoding="utf-8")


def load_skill_instructions(skill_id: str, vendor_path: Path) -> str:
    """Read SKILL.md for the given skill_id from the vendored skills folder.

    Cached. Raises ValueError if the skill_id is unknown or the file is
    missing.
    """
    if skill_id not in SKILLS:
        raise ValueError(
            f"Unknown skill_id={skill_id!r}. Expected one of {SKILLS}."
        )
    return _load_skill_md(skill_id, str(vendor_path))
