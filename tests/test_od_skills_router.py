"""Unit tests for builder.core.od_skills_router."""
from __future__ import annotations

from pathlib import Path

import pytest

from builder.core.od_skills_router import SKILLS, match_skill, load_skill_instructions


def test_skills_constant_has_exactly_five_known_ids():
    assert SKILLS == [
        "pricing-page",
        "blog-post",
        "web-prototype",
        "saas-landing",
        "magazine-poster",
    ]


def test_match_skill_saas_with_pricing_returns_saas_landing():
    spec = {
        "summary": {"business_type": "saas"},
        "design_plan": {"has_pricing": True},
    }
    assert match_skill(spec) == "saas-landing"


def test_match_skill_sell_subscription_cta_returns_pricing_page():
    spec = {
        "summary": {"business_type": "service_local"},
        "design_plan": {"cta_strategy": {"type": "sell_subscription"}},
    }
    assert match_skill(spec) == "pricing-page"


def test_match_skill_editorial_business_returns_magazine_poster():
    spec = {"summary": {"business_type": "editorial"}}
    assert match_skill(spec) == "magazine-poster"


def test_match_skill_launch_announcement_cta_returns_magazine_poster():
    spec = {
        "summary": {"business_type": "service_local"},
        "design_plan": {"cta_strategy": {"type": "launch_announcement"}},
    }
    assert match_skill(spec) == "magazine-poster"


def test_match_skill_high_volume_padaria_returns_blog_post():
    spec = {
        "summary": {"business_type": "padaria", "content_volume": "high"},
        "design_plan": {"has_blog_intent": True},
    }
    assert match_skill(spec) == "blog-post"


def test_match_skill_default_returns_web_prototype():
    spec = {"summary": {"business_type": "auto_repair"}}
    assert match_skill(spec) == "web-prototype"


def test_match_skill_handles_missing_keys_gracefully():
    assert match_skill({}) == "web-prototype"
    assert match_skill({"summary": {}}) == "web-prototype"


def test_load_skill_instructions_returns_non_empty_string(skills_path: Path):
    text = load_skill_instructions("pricing-page", skills_path)
    assert isinstance(text, str)
    assert len(text.strip()) > 100


def test_load_skill_instructions_unknown_skill_raises(skills_path: Path):
    with pytest.raises(ValueError):
        load_skill_instructions("does-not-exist", skills_path)


def test_load_skill_instructions_caches_results(skills_path: Path):
    a = load_skill_instructions("blog-post", skills_path)
    b = load_skill_instructions("blog-post", skills_path)
    assert a is b  # same object → cached
