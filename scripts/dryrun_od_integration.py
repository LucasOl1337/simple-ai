#!/usr/bin/env python3
"""Dry-run for the Open Design integration — no API calls, no API key needed.

Replicates exactly what the new OD augmentation block in
builder/agent/builder_agent.py:_collect_design_library_context does, but
prints the result instead of feeding it to Opus. Validates that:

  1. narrow_top3 picks 3 candidate design systems for each spec
  2. match_skill returns the expected skill_id
  3. load_skill_instructions reads the SKILL.md
  4. Anti-slop checklist + self-critique + LANGUAGE_OVERRIDE constants are present
  5. The composed augmentation block has the expected structure

Usage:
    python scripts/dryrun_od_integration.py
    python scripts/dryrun_od_integration.py tech       # single spec
    python scripts/dryrun_od_integration.py --verbose  # print full prompt blocks
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any


# Add repo root to sys.path so `builder.*` imports resolve when the script is
# run directly from the repo.
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


from builder.core.design_systems_catalog import (  # noqa: E402
    DesignSystemSpec,
    _classify_school,
    load_open_design_systems,
    narrow_top3,
)
from builder.core.od_skills_router import (  # noqa: E402
    match_skill,
    load_skill_instructions,
)
from builder.prompts.od_checklists import (  # noqa: E402
    ANTI_AI_SLOP_CHECKLIST_EN,
    SELF_CRITIQUE_PROTOCOL_EN,
    LANGUAGE_OVERRIDE,
)
from builder.prompts.builder import PROMPT_VERSION  # noqa: E402


VENDOR_ROOT = REPO_ROOT / "vendor" / "open-design"


# --- The 3 specs (mirror scripts/smoke_od_integration.sh) --------------------

SPEC_TECH: dict[str, Any] = {
    "business_name": "Voltri AI",
    "segment": "saas",
    "design_plan": {
        "layout_family": "conversion-landing",
        "visual_style": "tech_utility",
        "content_density": "compact",
        "has_pricing": True,
        "cta_strategy": {"type": "sell_subscription"},
    },
    "summary": {
        "brand_name": "Voltri AI",
        "business_type": "saas",
        "brand_tone": "tech",
        "content_volume": "medium",
        "primary_cta": "trial",
    },
}

SPEC_PADARIA: dict[str, Any] = {
    "business_name": "Padaria Recanto da Vovó",
    "segment": "padaria",
    "design_plan": {
        "layout_family": "image-led",
        "visual_style": "soft_warm",
        "content_density": "comfortable",
        "has_blog_intent": True,
        "cta_strategy": {"type": "contact_whatsapp"},
    },
    "summary": {
        "brand_name": "Padaria Recanto da Vovó",
        "business_type": "padaria",
        "brand_tone": "warm",
        "content_volume": "high",
        "primary_cta": "menu",
    },
}

SPEC_EDITORIAL: dict[str, Any] = {
    "business_name": "Capixaba Sonora",
    "segment": "editorial",
    "design_plan": {
        "layout_family": "editorial-onepage",
        "visual_style": "editorial_monocle",
        "content_density": "spacious",
        "cta_strategy": {"type": "launch_announcement"},
    },
    "summary": {
        "brand_name": "Capixaba Sonora",
        "business_type": "editorial",
        "brand_tone": "calm",
        "content_volume": "high",
        "primary_cta": "read_edition",
    },
}

LABELS = {
    "tech": (SPEC_TECH, "tech_utility", "saas-landing"),
    "padaria": (SPEC_PADARIA, "soft_warm", "blog-post"),
    "editorial": (SPEC_EDITORIAL, "editorial_monocle", "magazine-poster"),
}


# --- Augmentation block formatter (mirror builder_agent.py) ------------------

def format_top3_design_systems(systems: list[DesignSystemSpec]) -> str:
    if not systems:
        return ""
    lines = [
        "# BIBLIOTECA DE DESIGN: TOP-3 DESIGN SYSTEMS (OPEN DESIGN)",
        "",
        "Você recebe três sistemas candidatos. Escolha UM e use a paleta",
        "OKLch e a typography stack do escolhido. Insira um comentário HTML",
        "imediatamente antes de `<html>` no formato:",
        "    <!-- design_system_chosen: <id> -->",
        "para que a escolha fique auditável nos logs.",
        "",
    ]
    for rank, system in enumerate(systems, start=1):
        palette = ", ".join(
            f"{k}={v}" for k, v in sorted(system.palette_oklch.items())
        ) or "(sem paleta declarada)"
        typo = ", ".join(
            f"{k}={v}" for k, v in sorted(system.typography.items())
        ) or "(sem typography declarada)"
        lines.append(f"## #{rank} — {system.name} (id={system.id})")
        lines.append(f"- school: {system.school}")
        lines.append(f"- density: {system.density}")
        lines.append(f"- palette: {palette}")
        lines.append(f"- typography: {typo}")
        lines.append(f"- source: {system.source_url}")
        lines.append("")
    return "\n".join(lines).rstrip()


def assemble_augmentation_for_spec(spec: dict[str, Any]) -> dict[str, str]:
    """Return the four augmentation blocks the hook would append to the
    builder system prompt (in the same order)."""
    blocks: dict[str, str] = {}

    top3 = narrow_top3(spec)
    blocks["top3"] = format_top3_design_systems(top3)

    skill_id = match_skill(spec)
    try:
        skill_md = load_skill_instructions(skill_id, VENDOR_ROOT / "skills")
        blocks["skill"] = (
            f"# BIBLIOTECA DE DESIGN: SKILL ESCOLHIDA — {skill_id}\n{skill_md}"
        )
    except (ValueError, FileNotFoundError) as exc:
        blocks["skill"] = f"[skip skill — {skill_id} → {exc}]"

    blocks["anti_slop"] = (
        f"# BIBLIOTECA DE DESIGN: ANTI-AI-SLOP (OPEN DESIGN, EN)\n"
        f"{ANTI_AI_SLOP_CHECKLIST_EN}"
    )
    blocks["self_critique"] = (
        f"# BIBLIOTECA DE DESIGN: 5-DIM SELF-CRITIQUE (OPEN DESIGN, EN)\n"
        f"{SELF_CRITIQUE_PROTOCOL_EN}"
    )
    blocks["language_override"] = LANGUAGE_OVERRIDE

    blocks["_skill_id"] = skill_id  # metadata for the report
    return blocks


# --- Reporter ----------------------------------------------------------------

def banner(text: str, char: str = "=") -> str:
    bar = char * 70
    return f"\n{bar}\n{text}\n{bar}"


def report(label: str, expected_school: str, expected_skill: str, verbose: bool) -> dict:
    spec, _, _ = LABELS[label]
    print(banner(f"DRY-RUN: {label}  (expected_school={expected_school}, expected_skill={expected_skill})"))

    print("\nSpec input (key fields):")
    summary = spec["summary"]
    plan = spec.get("design_plan", {})
    print(f"  business_type: {summary.get('business_type')}")
    print(f"  brand_tone:    {summary.get('brand_tone')}")
    print(f"  content_volume:{summary.get('content_volume')}")
    print(f"  cta_strategy:  {plan.get('cta_strategy')}")
    print(f"  has_pricing:   {plan.get('has_pricing')}")
    print(f"  has_blog_intent:{plan.get('has_blog_intent')}")

    classified_school = _classify_school(spec)
    skill_id = match_skill(spec)
    print("\nClassification:")
    school_ok = "✓" if classified_school == expected_school else "✗"
    skill_ok = "✓" if skill_id == expected_skill else "✗"
    print(f"  School (heuristic): {classified_school}  {school_ok} (expected {expected_school})")
    print(f"  Skill  (lookup):    {skill_id}  {skill_ok} (expected {expected_skill})")

    top3 = narrow_top3(spec)
    print("\nTop-3 design systems:")
    for rank, system in enumerate(top3, start=1):
        n_palette = len(system.palette_oklch)
        n_typo = len(system.typography)
        print(
            f"  #{rank}: {system.name:30s}  id={system.id:18s}  school={system.school:18s}  "
            f"palette_n={n_palette}  typo_n={n_typo}"
        )

    blocks = assemble_augmentation_for_spec(spec)
    print("\nAugmentation blocks (what gets appended to the Opus system prompt):")
    for name in ("top3", "skill", "anti_slop", "self_critique", "language_override"):
        block = blocks[name]
        n_chars = len(block)
        first_line = block.split("\n", 1)[0][:80]
        print(f"  [{name:18s}] {n_chars:6d} chars   first line: {first_line!r}")

    total_chars = sum(len(blocks[k]) for k in ("top3", "skill", "anti_slop", "self_critique", "language_override"))
    print(f"\n  TOTAL augmentation: {total_chars:6d} chars  (~{total_chars // 4} tokens)")

    # Sanity assertions
    sanity = []
    sanity.append(("anti_slop in English",
                   "do not" in ANTI_AI_SLOP_CHECKLIST_EN.lower() or "don't" in ANTI_AI_SLOP_CHECKLIST_EN.lower()))
    sanity.append(("self_critique has 5 dims",
                   all(dim in SELF_CRITIQUE_PROTOCOL_EN.lower()
                       for dim in ("clarity", "hierarchy", "restraint", "surprise", "fit"))))
    sanity.append(("language_override mentions pt-BR",
                   "pt-BR" in LANGUAGE_OVERRIDE or "Brazilian Portuguese" in LANGUAGE_OVERRIDE))
    sanity.append(("language_override mentions English",
                   "english" in LANGUAGE_OVERRIDE.lower()))
    sanity.append(("PROMPT_VERSION updated",
                   PROMPT_VERSION == "builder-2026-04-28-v2-od"))
    sanity.append(("top3 has exactly 3 distinct systems",
                   len(top3) == 3 and len({s.id for s in top3}) == 3))
    sanity.append(("at least 2 of 3 match expected school",
                   sum(1 for s in top3 if s.school == expected_school) >= 2))
    print("\nSanity checks:")
    for label_, ok in sanity:
        mark = "✓" if ok else "✗"
        print(f"  {mark}  {label_}")

    if verbose:
        print(banner("FULL AUGMENTATION (verbose mode)", char="-"))
        for name in ("top3", "skill", "anti_slop", "self_critique", "language_override"):
            print(banner(name, char="-"))
            print(blocks[name])

    return {
        "label": label,
        "school_classified": classified_school,
        "school_expected": expected_school,
        "school_match": classified_school == expected_school,
        "skill": skill_id,
        "skill_expected": expected_skill,
        "skill_match": skill_id == expected_skill,
        "top3_ids": [s.id for s in top3],
        "top3_schools": [s.school for s in top3],
        "augmentation_total_chars": total_chars,
        "all_sanity_checks_pass": all(ok for _, ok in sanity),
    }


def summary_table(results: list[dict]) -> None:
    print(banner("SUMMARY"))
    print(f"PROMPT_VERSION = {PROMPT_VERSION}")
    print(f"Vendor root:    {VENDOR_ROOT}")
    print(f"Catalog size:   {len(load_open_design_systems(VENDOR_ROOT / 'design-systems'))} design systems")
    print()
    print(f"{'label':12s}  {'school':18s}  {'skill':18s}  {'top3 ids':50s}  {'sanity'}")
    print("-" * 110)
    for r in results:
        sch = f"{r['school_classified']}{' ' if r['school_match'] else '✗'}"
        skl = f"{r['skill']}{' ' if r['skill_match'] else '✗'}"
        ids = ", ".join(r["top3_ids"])[:48]
        san = "✓" if r["all_sanity_checks_pass"] else "✗"
        print(f"{r['label']:12s}  {sch:18s}  {skl:18s}  {ids:50s}  {san}")
    all_pass = all(r["all_sanity_checks_pass"] and r["school_match"] and r["skill_match"] for r in results)
    print()
    if all_pass:
        print("ALL CHECKS PASSED — integration wiring is healthy. Ready for real-API smoke when you have credits.")
    else:
        print("SOME CHECKS FAILED — review the rows marked with ✗ above.")


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    verbose = any(a in ("--verbose", "-v") for a in sys.argv[1:])
    target = args[0] if args else "all"

    if target not in {"all", "tech", "padaria", "editorial"}:
        print(f"Unknown target: {target!r}. Use one of: tech, padaria, editorial, all.")
        return 2

    results: list[dict] = []
    targets = ["tech", "padaria", "editorial"] if target == "all" else [target]
    for label in targets:
        spec, expected_school, expected_skill = LABELS[label]
        results.append(report(label, expected_school, expected_skill, verbose))

    if len(results) > 1:
        summary_table(results)

    return 0 if all(r["all_sanity_checks_pass"] for r in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
