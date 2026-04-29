"""Unit tests for builder.core.design_systems_catalog."""
from __future__ import annotations

from pathlib import Path

import pytest

from builder.core.design_systems_catalog import (
    DesignSystemSpec,
    SCHOOLS,
    _classify_school,
    _score,
    load_open_design_systems,
    narrow_top3,
)


SCHOOL_LABELS = {
    "tech_utility",
    "soft_warm",
    "editorial_monocle",
    "modern_minimal",
    "brutalist",
}


def test_schools_constant_matches_expected_set():
    assert set(SCHOOLS) == SCHOOL_LABELS


@pytest.mark.parametrize("brand_tone, expected_school", [
    ("tech", "tech_utility"),
    ("minimal", "tech_utility"),
    ("engineered", "tech_utility"),
])
def test_classify_school_tech_utility(brand_tone, expected_school):
    spec = {"summary": {"brand_tone": brand_tone, "business_type": "saas"}}
    assert _classify_school(spec) == expected_school


def test_classify_school_editorial_business_type():
    spec = {"summary": {"brand_tone": "calm", "business_type": "editorial"}}
    assert _classify_school(spec) == "editorial_monocle"


def test_classify_school_brutalist_for_fashion():
    spec = {"summary": {"brand_tone": "bold", "business_type": "fashion"}}
    assert _classify_school(spec) == "brutalist"


def test_classify_school_modern_minimal_for_corporate():
    spec = {"summary": {"brand_tone": "trustworthy", "business_type": "fintech"}}
    assert _classify_school(spec) == "modern_minimal"


def test_classify_school_default_is_soft_warm():
    spec = {"summary": {"brand_tone": "warm", "business_type": "padaria"}}
    assert _classify_school(spec) == "soft_warm"


def test_classify_school_handles_missing_keys():
    assert _classify_school({}) == "soft_warm"
    assert _classify_school({"summary": {}}) == "soft_warm"


def test_load_open_design_systems_finds_at_least_50(design_systems_path: Path):
    catalog = load_open_design_systems(design_systems_path)
    assert isinstance(catalog, list)
    assert len(catalog) >= 50, (
        f"Expected ~71 systems vendored; got {len(catalog)}. "
        "Verify the .gitignore allow-list and Task 1 step 6."
    )
    for system in catalog:
        assert isinstance(system, DesignSystemSpec)
        assert system.id and system.name
        assert system.school in SCHOOL_LABELS


def test_score_is_a_finite_number():
    system = DesignSystemSpec(
        id="x", name="X", palette_oklch={"primary": "oklch(0 0 0)"},
        typography={"display": "Inter", "body": "Inter"},
        density="comfortable", vibe_tags=("tech", "minimal"),
        school="tech_utility", source_url="",
    )
    spec = {"summary": {"brand_tone": "tech", "content_volume": "low"}}
    s = _score(system, spec)
    assert isinstance(s, float)
    assert s == s  # not NaN
    assert 0 <= s <= 1.5


def test_narrow_top3_returns_exactly_three(design_systems_path: Path):
    spec = {"summary": {"brand_tone": "tech", "business_type": "saas"}}
    catalog = load_open_design_systems(design_systems_path)
    top3 = narrow_top3(spec, catalog)
    assert len(top3) == 3
    assert len({s.id for s in top3}) == 3  # distinct
    for s in top3:
        assert isinstance(s, DesignSystemSpec)


def test_narrow_top3_prefers_school_match(design_systems_path: Path):
    spec = {"summary": {"brand_tone": "tech", "business_type": "saas"}}
    catalog = load_open_design_systems(design_systems_path)
    top3 = narrow_top3(spec, catalog)
    school = _classify_school(spec)
    same_school = sum(1 for s in top3 if s.school == school)
    assert same_school >= 2


def test_narrow_top3_works_when_school_has_few_members(design_systems_path: Path):
    """Even if a school has < 3 systems, narrow_top3 always returns 3."""
    catalog = load_open_design_systems(design_systems_path)
    spec = {"summary": {"brand_tone": "bold", "business_type": "fashion"}}
    top3 = narrow_top3(spec, catalog)
    assert len(top3) == 3
