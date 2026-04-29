"""Unit tests for builder.prompts.od_checklists."""
from __future__ import annotations

import re

from builder.prompts.od_checklists import (
    ANTI_AI_SLOP_CHECKLIST_EN,
    SELF_CRITIQUE_PROTOCOL_EN,
    LANGUAGE_OVERRIDE,
)


def test_anti_slop_checklist_is_non_empty_string():
    assert isinstance(ANTI_AI_SLOP_CHECKLIST_EN, str)
    assert len(ANTI_AI_SLOP_CHECKLIST_EN.strip()) > 200, (
        "Anti-slop checklist looks too short to be the real content"
    )


def test_anti_slop_checklist_is_in_english():
    # Heuristic: must contain English don't-words and not have pt-BR markers.
    text = ANTI_AI_SLOP_CHECKLIST_EN.lower()
    english_markers = ["don't", "do not", "avoid", "never"]
    assert any(m in text for m in english_markers), (
        "Anti-slop checklist must contain English negation markers"
    )
    pt_markers = ["você", "não use", "padrão"]
    assert not any(m in text for m in pt_markers), (
        "Anti-slop checklist must remain in English originals; pt-BR found"
    )


def test_self_critique_has_5_dimensions():
    text = SELF_CRITIQUE_PROTOCOL_EN.lower()
    # 5 named dimensions per the spec: clarity, hierarchy, restraint, surprise, fit.
    for dim in ("clarity", "hierarchy", "restraint", "surprise", "fit"):
        assert dim in text, f"5-dim self-critique missing dimension: {dim}"


def test_language_override_enforces_pt_br_output():
    assert "pt-BR" in LANGUAGE_OVERRIDE or "Brazilian Portuguese" in LANGUAGE_OVERRIDE
    assert "english" in LANGUAGE_OVERRIDE.lower(), (
        "LANGUAGE_OVERRIDE must explicitly mention checklists are in English"
    )
