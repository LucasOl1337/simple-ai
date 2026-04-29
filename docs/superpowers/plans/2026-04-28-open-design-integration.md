# Open Design Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Augment the simple-ai builder's prompt stack with content vendored from Open Design (71 design systems, 5 skills, anti-AI-slop checklist, 5-dimensional self-critique) so generated websites have stronger palette, typography, and structural fidelity — without touching the frontend, planner, or `BuildRequest` contract.

**Architecture:** Vendor Open Design content into `vendor/open-design/` (commit-pinned shallow clone, Apache-2.0 preserved). Add three pure-function modules under `builder/`: a 71-system catalog with heuristic top-3 narrowing, a 5-skill router via lookup table, and a checklists module with English-original content. Hook these into `_collect_design_library_context` and `_build_system_prompt_for_job` so the existing single Opus 4.7 call receives an enriched system prompt that lets Opus pick one design system from the top-3 and generate HTML in one hop. Bump `PROMPT_VERSION` to invalidate Anthropic's prompt cache. Add non-blocking anti-slop warnings in `site_qa.py`.

**Tech Stack:** Python 3.10+, FastAPI (existing), Anthropic SDK (existing, Opus 4.7), `pytest` (NEW dev-only dependency for module unit tests), git worktree on branch `L-SOUZA` at `/Users/luskoliveira/simple-ai-lsouza`.

**Spec reference:** `docs/superpowers/specs/2026-04-28-open-design-integration-design.md` (commit `9279cd2`).

**Hard guard-rails (memory-enforced):**
- Every `git add`/`git commit`/`git push`/`git revert` requires explicit per-action user approval. The implementer MUST pause and ask before every git mutation step.
- All work happens on branch `L-SOUZA`. Never `main`. Verify with `git branch --show-current` before any commit.
- Never paste the value of `ANTHROPIC_API_KEY` in conversation. Verify presence only.

---

### Task 1: Vendor Open Design (commit-pinned shallow clone)

**Files:**
- Create: `vendor/open-design/` (cloned from upstream, allow-listed)
- Create: `vendor/open-design/README-VENDORING.md`
- Modify: `.gitignore` (root)

- [ ] **Step 1: Verify branch and clean working tree for vendor**

```bash
cd /Users/luskoliveira/simple-ai-lsouza
git branch --show-current
```

Expected: `L-SOUZA`. If anything else, STOP and ask the user.

```bash
ls vendor/ 2>/dev/null && echo "EXISTS" || echo "absent"
```

Expected: `absent`. If `EXISTS`, STOP — somebody else may have set up vendoring already; ask the user.

- [ ] **Step 2: Create vendor directory and shallow-clone Open Design**

```bash
mkdir -p /Users/luskoliveira/simple-ai-lsouza/vendor
git clone --depth 1 https://github.com/nexu-io/open-design.git \
  /Users/luskoliveira/simple-ai-lsouza/vendor/open-design
```

Expected: `Cloning into '...vendor/open-design'... done.` Single commit on default branch.

- [ ] **Step 3: Capture upstream SHA pin**

```bash
cd /Users/luskoliveira/simple-ai-lsouza/vendor/open-design
git rev-parse HEAD
```

Save the printed SHA — it goes into `README-VENDORING.md` in step 4.

```bash
cd /Users/luskoliveira/simple-ai-lsouza
```

- [ ] **Step 4: Write `vendor/open-design/README-VENDORING.md`**

Replace `<SHA>` with the value captured in step 3 and `<DATE>` with today (`date +%Y-%m-%d`).

```markdown
# Vendored: Open Design

**Upstream:** https://github.com/nexu-io/open-design
**Pinned commit:** `<SHA>`
**Pinned date:** `<DATE>`
**Upstream license:** Apache-2.0 (see `LICENSE` in this folder)

## Why vendored

Per the spec at `docs/superpowers/specs/2026-04-28-open-design-integration-design.md`,
simple-ai vendors a curated subset of Open Design's content into the builder's
prompt stack. The integration is content-only: no daemon, no CLI delegation,
no UI changes. Open Design's runtime is NOT used.

## What is committed (allow-list)

- `LICENSE` — Apache-2.0, preserved verbatim from upstream
- `README-VENDORING.md` — this file
- `design-systems/` — 71 brand-grade design systems (DESIGN.md + assets)
- `skills/pricing-page/` — pricing-page skill bundle
- `skills/blog-post/` — blog-post skill bundle
- `skills/web-prototype/` — generic landing skill bundle (default)
- `skills/saas-landing/` — SaaS landing skill bundle
- `skills/magazine-poster/` — editorial poster skill bundle
- `src/prompts/discovery.ts` — source for anti-AI-slop checklist + 5-dimensional self-critique

## What is gitignored

Everything else inside `vendor/open-design/`. The `.gitignore` at the repo
root uses an allow-list pattern (see `vendor/open-design/*` and the
explicit `!`-prefixed entries).

## Updating

This vendor is manual. To update to a newer upstream commit:

1. `cd vendor/open-design && git pull --depth 1 origin <branch>`
2. Capture the new SHA: `git rev-parse HEAD`
3. Update the **Pinned commit** and **Pinned date** fields above
4. Re-run smoke tests in the spec's §10
5. Commit the bump on branch `L-SOUZA` (with explicit user approval)

## Attribution

Open Design © its authors. Vendored under the Apache License, Version 2.0.
The `LICENSE` file in this directory is the upstream LICENSE preserved
verbatim.
```

- [ ] **Step 5: Add allow-list entries to root `.gitignore`**

Append the following block at the end of `/Users/luskoliveira/simple-ai-lsouza/.gitignore`:

```gitignore
# vendor: open-design (allow-list)
vendor/open-design/*
!vendor/open-design/LICENSE
!vendor/open-design/README-VENDORING.md
!vendor/open-design/design-systems/
!vendor/open-design/skills/pricing-page/
!vendor/open-design/skills/blog-post/
!vendor/open-design/skills/web-prototype/
!vendor/open-design/skills/saas-landing/
!vendor/open-design/skills/magazine-poster/
!vendor/open-design/src/prompts/discovery.ts
```

If `.gitignore` does not exist at the root, create it with that block as its only content.

- [ ] **Step 6: Verify gitignore allow-list works**

```bash
cd /Users/luskoliveira/simple-ai-lsouza
git check-ignore -v vendor/open-design/LICENSE
git check-ignore -v vendor/open-design/README-VENDORING.md
git check-ignore -v vendor/open-design/design-systems/linear/DESIGN.md 2>/dev/null || \
  git check-ignore -v vendor/open-design/design-systems/$(ls vendor/open-design/design-systems/ | head -1)/DESIGN.md
git check-ignore -v vendor/open-design/skills/pricing-page/SKILL.md
git check-ignore -v vendor/open-design/.git/HEAD
```

Expected:
- The first 4 commands print **nothing** (file is NOT ignored, allow-listed)
- The last command prints a rule (`.git/HEAD` IS ignored, since it's outside the allow-list — actually `.git` itself is ignored by Git's internal rules)

Run this for sanity:
```bash
git status --short vendor/ | head -20
```

Expected: a list of `??` (untracked) lines covering only the allow-listed paths. No `??` lines for OD's `node_modules`, `.git`, `dist`, etc.

- [ ] **Step 7: Stage vendor + .gitignore**

```bash
cd /Users/luskoliveira/simple-ai-lsouza
git add .gitignore vendor/open-design/LICENSE vendor/open-design/README-VENDORING.md \
  vendor/open-design/design-systems/ vendor/open-design/skills/pricing-page/ \
  vendor/open-design/skills/blog-post/ vendor/open-design/skills/web-prototype/ \
  vendor/open-design/skills/saas-landing/ vendor/open-design/skills/magazine-poster/ \
  vendor/open-design/src/prompts/discovery.ts
git status --short | head -30
```

Expected: only the allow-listed paths show as `A` (added). No spurious files staged.

- [ ] **Step 8: Commit (REQUIRES EXPLICIT USER APPROVAL)**

Show the user the staged file count and ask explicitly: *"Approving the vendor commit on L-SOUZA?"* — wait for "yes" or equivalent before running:

```bash
git commit -m "$(cat <<'EOF'
vendor: pin Open Design (Apache-2.0) for builder prompt augmentation

Adds vendor/open-design/ with allow-listed subset:
- 71 design systems (DESIGN.md + assets)
- 5 skills (pricing-page, blog-post, web-prototype, saas-landing, magazine-poster)
- src/prompts/discovery.ts (source of anti-slop + self-critique)
- LICENSE + README-VENDORING.md (SHA pin, attribution)

Per spec docs/superpowers/specs/2026-04-28-open-design-integration-design.md.
No runtime, no daemon, no CLI. Content-only vendor.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git log --oneline -1
```

Expected: 1 new commit on `L-SOUZA` with the message above.

---

### Task 2: Add pytest dev dependency and tests/ scaffolding

**Files:**
- Modify: `api/requirements.txt`
- Create: `tests/__init__.py`
- Create: `tests/conftest.py`
- Create: `pyproject.toml` (only if not present)

- [ ] **Step 1: Check if pyproject.toml exists**

```bash
cd /Users/luskoliveira/simple-ai-lsouza
ls pyproject.toml 2>/dev/null && echo EXISTS || echo absent
```

If `EXISTS`: skip the pyproject creation in step 4.
If `absent`: create it in step 4.

- [ ] **Step 2: Append pytest to api/requirements.txt**

Append at the bottom of `api/requirements.txt`:

```
# dev: unit tests for builder modules
pytest>=7.0,<9
```

- [ ] **Step 3: Install pytest in the local venv**

```bash
pip install "pytest>=7.0,<9"
pytest --version
```

Expected: `pytest 7.x.y` or `pytest 8.x.y` printed.

- [ ] **Step 4: Create `pyproject.toml` if absent (else SKIP)**

Only run this step if step 1 reported `absent`. Create `/Users/luskoliveira/simple-ai-lsouza/pyproject.toml`:

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
```

- [ ] **Step 5: Create tests/ scaffolding**

Create `/Users/luskoliveira/simple-ai-lsouza/tests/__init__.py` as an empty file.

Create `/Users/luskoliveira/simple-ai-lsouza/tests/conftest.py`:

```python
"""Shared pytest fixtures for builder module tests."""
from __future__ import annotations

from pathlib import Path

import pytest


@pytest.fixture
def vendor_path() -> Path:
    """Return the vendored Open Design root."""
    root = Path(__file__).resolve().parent.parent
    return root / "vendor" / "open-design"


@pytest.fixture
def design_systems_path(vendor_path: Path) -> Path:
    return vendor_path / "design-systems"


@pytest.fixture
def skills_path(vendor_path: Path) -> Path:
    return vendor_path / "skills"
```

- [ ] **Step 6: Verify pytest discovers tests/**

```bash
cd /Users/luskoliveira/simple-ai-lsouza
pytest tests/ --collect-only -q
```

Expected: `0 tests collected` (no test files yet, but no errors).

- [ ] **Step 7: Stage and commit (REQUIRES EXPLICIT USER APPROVAL)**

```bash
git add api/requirements.txt tests/__init__.py tests/conftest.py
[ -f pyproject.toml ] && git add pyproject.toml
git status --short
```

Ask the user: *"Approving the pytest scaffolding commit on L-SOUZA?"* — wait for confirmation.

```bash
git commit -m "$(cat <<'EOF'
chore: add pytest dev dep and tests/ scaffolding

Adds pytest>=7.0 to api/requirements.txt and creates tests/__init__.py +
tests/conftest.py with vendor_path / design_systems_path / skills_path
fixtures. Pytest config in pyproject.toml (or root pytest.ini).

Foundation for unit tests on the new builder modules
(design_systems_catalog, od_skills_router, od_checklists).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Implement `od_checklists` module (TDD)

**Files:**
- Create: `builder/prompts/od_checklists.py`
- Test: `tests/test_od_checklists.py`

The constants extracted here come from `vendor/open-design/src/prompts/discovery.ts` (vendored in Task 1). Read that file first:

```bash
cat /Users/luskoliveira/simple-ai-lsouza/vendor/open-design/src/prompts/discovery.ts
```

Identify the section that lists anti-AI-slop don'ts (often inside a constant exported as `ANTI_AI_SLOP` or embedded in a system-prompt string) and the section that describes the 5-dimensional self-critique (often labeled "5 dimensions" or "self-critique"). Copy verbatim, adapting only formatting (TS template literal → Python triple-quoted string).

- [ ] **Step 1: Write failing tests**

Create `tests/test_od_checklists.py`:

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/luskoliveira/simple-ai-lsouza
pytest tests/test_od_checklists.py -v
```

Expected: `ERRORS` collecting (module does not exist yet) or `FAILED` with `ModuleNotFoundError: builder.prompts.od_checklists`.

- [ ] **Step 3: Read source content from discovery.ts**

```bash
cat /Users/luskoliveira/simple-ai-lsouza/vendor/open-design/src/prompts/discovery.ts | head -300
```

Identify two regions:
1. The anti-AI-slop don't-list (typically a paragraph or bullet list of "do not" rules)
2. The 5-dimensional self-critique (typically labeled with the dimension names: clarity, hierarchy, restraint, surprise, fit)

Extract their content verbatim into Python triple-quoted strings.

- [ ] **Step 4: Implement `builder/prompts/od_checklists.py`**

Create `/Users/luskoliveira/simple-ai-lsouza/builder/prompts/od_checklists.py`:

```python
"""Open Design checklists vendored as English prompt content.

Source: vendor/open-design/src/prompts/discovery.ts (commit-pinned).
Kept in English by design (spec decision #9): bilingual prompts work
well with Anthropic models; pt-BR output is enforced separately by
LANGUAGE_OVERRIDE.
"""
from __future__ import annotations


ANTI_AI_SLOP_CHECKLIST_EN = """\
# ANTI AI-SLOP CHECKLIST (Open Design)

Do NOT generate any of the following unless the brief explicitly demands them:

- Inter, Roboto, Arial, or system-default sans-serif as the only typographic choice
- Purple-to-blue gradients on white or black backgrounds
- Generic card grids with rounded corners and soft blue shadows
- Centered hero blocks with placeholder copy ("Lorem ipsum...", "Welcome to...")
- The predictable sequence: hero + 3 identical feature cards + testimonial + CTA, with no visual variation
- Cream + serif typography outside an editorial context
- Excessive use of emojis in headings or section titles
- Faux-glass / glassmorphism backgrounds without an editorial-tech rationale
- Stock unsplash-style hero photography when the brief includes assets
- "Boost your X" / "Take your X to the next level" marketing clichés

Choose tone, color, and typography that fit the SEGMENT and AUDIENCE in the brief.
A bakery is warm and artisanal. A dentist is clean, calm, blue/green-led. A mechanic
is industrial and dark with an orange accent. Your visual choices must be defensible
against the brief — not borrowed from a generic AI portfolio aesthetic.
"""


SELF_CRITIQUE_PROTOCOL_EN = """\
# 5-DIMENSIONAL SELF-CRITIQUE (Open Design)

Before emitting the final HTML, silently grade your composition along these
five axes. If any axis fails, fix it before output. Do NOT print the grade.

1. CLARITY — Can a first-time visitor understand what this business does in
   under 10 seconds? Hero copy + primary CTA must answer "what" and "why now".

2. HIERARCHY — Visual scale matches importance. Headline > subhead > body.
   Primary CTA dominates secondary actions. No competing focal points.

3. RESTRAINT — Three colors maximum (primary, neutral, accent). One typeface
   family. Padding generous. Effects (shadows, gradients, animation) used
   sparingly and only where they aid comprehension or delight.

4. SURPRISE — The composition has at least one defensible non-default choice
   that fits the segment: an editorial pull quote, an asymmetric hero, a
   menu-board layout, a timeline, a mosaic. Avoid the predictable template.

5. FIT — Color, typography, density, and tone all match the segment and
   audience in the brief. A bakery does not look like a SaaS landing.
"""


LANGUAGE_OVERRIDE = """\
# OUTPUT LANGUAGE

The output HTML MUST be written in pt-BR (Brazilian Portuguese).

The checklists above (anti-slop and self-critique) are intentionally kept in
their English originals — apply their rules to the structure, palette, and
visual choices, but write all visible content (headlines, body copy, CTAs,
microcopy, alt text) in pt-BR appropriate for Brazilian SMB audiences.
"""
```

> **Implementation note:** if the actual content extracted from `discovery.ts`
> differs in wording from the body above, prefer the upstream wording. The
> tests in step 1 only enforce structural invariants (English, 5 dimensions,
> pt-BR override), not exact wording.

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/luskoliveira/simple-ai-lsouza
pytest tests/test_od_checklists.py -v
```

Expected: 4 PASSED.

- [ ] **Step 6: Stage and commit (REQUIRES EXPLICIT USER APPROVAL)**

```bash
git add builder/prompts/od_checklists.py tests/test_od_checklists.py
git status --short
```

Ask: *"Approving od_checklists commit on L-SOUZA?"*

```bash
git commit -m "$(cat <<'EOF'
feat(builder): add od_checklists module (anti-slop + self-critique)

Vendored from vendor/open-design/src/prompts/discovery.ts. Kept in
English originals; pt-BR output enforced via LANGUAGE_OVERRIDE constant.

Tests cover: non-empty checklists, English markers present, pt-BR
markers absent, 5 dimensions present in self-critique.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Implement `od_skills_router` module (TDD)

**Files:**
- Create: `builder/core/od_skills_router.py`
- Test: `tests/test_od_skills_router.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_od_skills_router.py`:

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_od_skills_router.py -v
```

Expected: `ModuleNotFoundError: builder.core.od_skills_router`.

- [ ] **Step 3: Implement `builder/core/od_skills_router.py`**

Create `/Users/luskoliveira/simple-ai-lsouza/builder/core/od_skills_router.py`:

```python
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_od_skills_router.py -v
```

Expected: 11 PASSED.

If `test_load_skill_instructions_returns_non_empty_string` fails because `vendor/open-design/skills/pricing-page/SKILL.md` is missing, re-verify Task 1 step 6 — the allow-list might have skipped it.

- [ ] **Step 5: Stage and commit (REQUIRES EXPLICIT USER APPROVAL)**

```bash
git add builder/core/od_skills_router.py tests/test_od_skills_router.py
git status --short
```

Ask: *"Approving od_skills_router commit on L-SOUZA?"*

```bash
git commit -m "$(cat <<'EOF'
feat(builder): add od_skills_router with deterministic lookup

5 vendored skills: pricing-page, blog-post, web-prototype, saas-landing,
magazine-poster. match_skill() returns one via top-to-bottom precedence
on business_type + cta_type + content_volume. load_skill_instructions()
reads SKILL.md from vendor/open-design/skills/ and caches.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Implement `design_systems_catalog` module (TDD)

**Files:**
- Create: `builder/core/design_systems_catalog.py`
- Test: `tests/test_design_systems_catalog.py`

- [ ] **Step 1: Inspect a sample DESIGN.md to learn its format**

```bash
ls /Users/luskoliveira/simple-ai-lsouza/vendor/open-design/design-systems/ | head -10
SAMPLE=$(ls /Users/luskoliveira/simple-ai-lsouza/vendor/open-design/design-systems/ | head -1)
cat "/Users/luskoliveira/simple-ai-lsouza/vendor/open-design/design-systems/$SAMPLE/DESIGN.md" | head -120
```

Note the front-matter / heading structure. Most OD design systems follow a pattern like:

```markdown
# <Name> Design System
## Palette (OKLch)
- primary: oklch(...)
- surface: oklch(...)
...
## Typography
- display: <font name>
- body: <font name>
...
## Density
<one of compact / comfortable / spacious>
## Vibe
<comma-separated tags>
```

Adapt the parser regexes in step 3 to whatever format the actual files use. If a key field is missing, default to a sensible value (don't crash).

- [ ] **Step 2: Write failing tests**

Create `tests/test_design_systems_catalog.py`:

```python
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
        density="comfortable", vibe_tags=["tech", "minimal"],
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
    # At least 2 of the 3 should match the classified school.
    school = _classify_school(spec)
    same_school = sum(1 for s in top3 if s.school == school)
    assert same_school >= 2


def test_narrow_top3_works_when_school_has_few_members(design_systems_path: Path):
    """Even if a school has < 3 systems, narrow_top3 always returns 3."""
    catalog = load_open_design_systems(design_systems_path)
    spec = {"summary": {"brand_tone": "bold", "business_type": "fashion"}}  # brutalist
    top3 = narrow_top3(spec, catalog)
    assert len(top3) == 3
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pytest tests/test_design_systems_catalog.py -v
```

Expected: `ModuleNotFoundError`.

- [ ] **Step 4: Implement `builder/core/design_systems_catalog.py`**

Create `/Users/luskoliveira/simple-ai-lsouza/builder/core/design_systems_catalog.py`:

```python
"""Catalog of vendored Open Design systems with heuristic top-3 narrowing.

Loads the 71 DESIGN.md files at vendor/open-design/design-systems/ once at
import time, classifies each into one of 5 visual schools, and exposes
narrow_top3(spec) which returns three candidate systems for the builder to
choose from in its single Opus 4.7 call.
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
    palette_oklch: dict[str, str]
    typography: dict[str, str]
    density: str
    vibe_tags: tuple[str, ...]
    school: str
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


# --- DESIGN.md parser ---------------------------------------------------------

_OKLCH_RE = re.compile(r"oklch\([^\)]+\)", re.IGNORECASE)
_PALETTE_LINE_RE = re.compile(
    r"-\s*([\w-]+)\s*[:=]\s*(oklch\([^\)]+\))", re.IGNORECASE
)
_TYPO_LINE_RE = re.compile(
    r"-\s*(display|body|mono|heading)\s*[:=]\s*([^\n]+)", re.IGNORECASE
)
_DENSITY_RE = re.compile(
    r"(?:^|\n)\s*##\s*Density\s*\n+\s*([a-zA-Z]+)", re.IGNORECASE
)
_VIBE_RE = re.compile(
    r"(?:^|\n)\s*##\s*Vibe\s*\n+\s*([^\n]+)", re.IGNORECASE
)
_NAME_RE = re.compile(r"^\s*#\s+(.+?)(?:\s+Design System)?\s*$", re.MULTILINE)

_SCHOOL_VIBE_TAGS = {
    "tech_utility": {"tech", "saas", "developer", "minimal", "monochrome", "engineered"},
    "soft_warm": {"warm", "artisan", "soft", "bakery", "hospitality", "comfort"},
    "editorial_monocle": {"editorial", "newsprint", "serif", "magazine", "monocle"},
    "modern_minimal": {"corporate", "institutional", "minimal", "trust", "fintech"},
    "brutalist": {"brutalist", "bold", "raw", "disruptive", "fashion"},
}


def _classify_system_school(vibe_tags: tuple[str, ...], name: str) -> str:
    tags = {t.lower() for t in vibe_tags}
    name_l = name.lower()
    best_school = "soft_warm"
    best_score = 0
    for school, school_tags in _SCHOOL_VIBE_TAGS.items():
        score = len(tags & school_tags)
        # Bias by well-known name heuristics
        if school == "tech_utility" and any(
            n in name_l for n in ("linear", "stripe", "vercel", "cursor", "github")
        ):
            score += 2
        if school == "editorial_monocle" and any(
            n in name_l for n in ("monocle", "magazine", "newsprint")
        ):
            score += 2
        if school == "brutalist" and "brutalist" in name_l:
            score += 2
        if score > best_score:
            best_score = score
            best_school = school
    return best_school


def _parse_design_md(md: str, source_url: str) -> DesignSystemSpec:
    name_match = _NAME_RE.search(md)
    name = name_match.group(1).strip() if name_match else "Unnamed"

    palette: dict[str, str] = {}
    for m in _PALETTE_LINE_RE.finditer(md):
        palette[m.group(1).lower()] = m.group(2)

    typography: dict[str, str] = {}
    for m in _TYPO_LINE_RE.finditer(md):
        typography[m.group(1).lower()] = m.group(2).strip()

    density_match = _DENSITY_RE.search(md)
    density = (
        density_match.group(1).strip().lower() if density_match else "comfortable"
    )

    vibe_match = _VIBE_RE.search(md)
    vibe_raw = vibe_match.group(1) if vibe_match else ""
    vibe_tags: tuple[str, ...] = tuple(
        t.strip().lower() for t in re.split(r"[,\s]+", vibe_raw) if t.strip()
    )

    system_id = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "unknown"
    school = _classify_system_school(vibe_tags, name)

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
        out.append(_parse_design_md(md, source_url))
    return tuple(out)


def load_open_design_systems(path: Path) -> list[DesignSystemSpec]:
    """Load and cache the 71 DESIGN.md catalogs from the vendored folder."""
    return list(_cached_load(str(path)))


# --- scoring + narrowing ------------------------------------------------------

def _score(system: DesignSystemSpec, spec: dict[str, Any]) -> float:
    """Score a system against a build spec. Range ~0..1.5."""
    summary = _summary(spec)
    brand_tone = str(summary.get("brand_tone") or "").lower()
    content_volume = str(summary.get("content_volume") or "").lower()

    # Sub-score 1: vibe ∩ brand_tone tokens (weight 0.4)
    tone_tokens = set(re.split(r"[\s,/]+", brand_tone)) if brand_tone else set()
    vibe_overlap = (
        len(set(system.vibe_tags) & tone_tokens) / max(len(system.vibe_tags), 1)
    )
    vibe_score = min(vibe_overlap, 1.0) * 0.4

    # Sub-score 2: density vs content volume (weight 0.3)
    volume_to_density = {
        "low": "spacious",
        "medium": "comfortable",
        "high": "compact",
    }
    expected_density = volume_to_density.get(content_volume, "comfortable")
    density_score = (0.3 if system.density == expected_density else 0.15)

    # Sub-score 3: typography presence (weight 0.3)
    has_display = bool(system.typography.get("display"))
    has_body = bool(system.typography.get("body"))
    typo_score = (0.15 if has_display else 0) + (0.15 if has_body else 0)

    # School-match bonus (boosts the same-school filter result downstream)
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
        # Caller forgot to pass — try the default vendored path.
        default_path = (
            Path(__file__).resolve().parents[2]
            / "vendor"
            / "open-design"
            / "design-systems"
        )
        catalog = load_open_design_systems(default_path)

    if not catalog:
        # Empty catalog — return a synthetic placeholder list to avoid
        # downstream crashes. Caller should log and continue.
        placeholder = DesignSystemSpec(
            id="fallback",
            name="Fallback",
            palette_oklch={},
            typography={},
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

    chosen = same_school[:3]

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
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pytest tests/test_design_systems_catalog.py -v
```

Expected: 12 PASSED.

If `test_load_open_design_systems_finds_at_least_50` fails with a count below 50, the parser regex did not match the actual DESIGN.md format. Inspect a sample DESIGN.md again and adjust the regexes (`_PALETTE_LINE_RE`, `_TYPO_LINE_RE`, `_DENSITY_RE`, `_VIBE_RE`, `_NAME_RE`).

- [ ] **Step 6: Stage and commit (REQUIRES EXPLICIT USER APPROVAL)**

```bash
git add builder/core/design_systems_catalog.py tests/test_design_systems_catalog.py
git status --short
```

Ask: *"Approving design_systems_catalog commit on L-SOUZA?"*

```bash
git commit -m "$(cat <<'EOF'
feat(builder): add design_systems_catalog with heuristic top-3

Parses 71 DESIGN.md files from vendor/open-design/design-systems/ at
import time, classifies each into one of 5 visual schools (tech_utility,
soft_warm, editorial_monocle, modern_minimal, brutalist), and exposes
narrow_top3(spec) which returns 3 candidate systems for the builder.

Scoring weights: vibe overlap (0.4) + density fit (0.3) + typography
presence (0.3) + same-school bonus (0.2). Falls back to global ranking
when school has < 3 members.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Hook into `_collect_design_library_context` (integration)

**Files:**
- Modify: `builder/agent/builder_agent.py:370-429`

This is integration glue, not a new pure module — validated by smoke tests in Task 10, not unit tests.

- [ ] **Step 1: Read the current function**

```bash
sed -n '370,430p' /Users/luskoliveira/simple-ai-lsouza/builder/agent/builder_agent.py
```

The current function returns a `str` built by joining `sections` with `\n\n`. We append three NEW sections at the end before the join, all using the same `# BIBLIOTECA DE DESIGN: ...` header convention.

- [ ] **Step 2: Add imports at the top of the file**

Find the existing imports block in `builder/agent/builder_agent.py` (around lines 1-30) and add:

```python
from builder.core.design_systems_catalog import narrow_top3, DesignSystemSpec
from builder.core.od_skills_router import match_skill, load_skill_instructions
from builder.prompts.od_checklists import (
    ANTI_AI_SLOP_CHECKLIST_EN,
    SELF_CRITIQUE_PROTOCOL_EN,
    LANGUAGE_OVERRIDE,
)
```

Do not duplicate imports already present.

- [ ] **Step 3: Add a helper that formats top-3 systems as a prompt block**

Add this helper method to the same class as `_collect_design_library_context` (find the class via `grep -n "def _collect_design_library_context" builder/agent/builder_agent.py`), positioned **immediately above** `_collect_design_library_context`:

```python
    def _format_top3_design_systems(
        self, systems: list["DesignSystemSpec"]
    ) -> str:
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
```

- [ ] **Step 4: Modify `_collect_design_library_context` to append the new sections**

Locate the line `return "\n\n".join(section for section in sections if section).strip()` (currently line 429). **Immediately before** that line, insert:

```python
        # === Open Design augmentation (vendor-only, server-side) ===
        try:
            vendor_root = self._project_root / "vendor" / "open-design"

            top3_systems = narrow_top3(job.spec)
            top3_block = self._format_top3_design_systems(top3_systems)
            if top3_block:
                sections.append(top3_block)

            skill_id = match_skill(job.spec)
            try:
                skill_md = load_skill_instructions(
                    skill_id, vendor_root / "skills"
                )
                sections.append(
                    f"# BIBLIOTECA DE DESIGN: SKILL ESCOLHIDA — {skill_id}\n"
                    f"{skill_md}"
                )
            except (ValueError, FileNotFoundError):
                # Skill MD missing or unknown → skip silently; smoke logs catch it
                pass

            sections.append(
                "# BIBLIOTECA DE DESIGN: ANTI-AI-SLOP (OPEN DESIGN, EN)\n"
                f"{ANTI_AI_SLOP_CHECKLIST_EN}"
            )
            sections.append(
                "# BIBLIOTECA DE DESIGN: 5-DIM SELF-CRITIQUE (OPEN DESIGN, EN)\n"
                f"{SELF_CRITIQUE_PROTOCOL_EN}"
            )
            sections.append(LANGUAGE_OVERRIDE)
        except Exception as exc:  # noqa: BLE001 — smoke-only path, never crash builds
            # If anything in the OD path fails, the prompt remains unchanged.
            # The exception is logged but does not break the build.
            try:
                self._logger.warning(  # type: ignore[attr-defined]
                    "OD augmentation failed: %s", exc
                )
            except Exception:
                pass
        # === End Open Design augmentation ===
```

> **Note on `self._project_root` / `self._logger`:** confirm both exist on the
> class. Search with:
> ```bash
> grep -n "_project_root\|_logger" builder/agent/builder_agent.py | head -10
> ```
> If `_logger` does not exist, replace the `try/except` log call with a
> `print(f"[OD] augmentation failed: {exc}", file=sys.stderr)` (and add
> `import sys` to imports if missing). If `_project_root` does not exist,
> replace it with `Path(__file__).resolve().parents[2]`.

- [ ] **Step 5: Verify the file still parses**

```bash
cd /Users/luskoliveira/simple-ai-lsouza
python -c "from builder.agent.builder_agent import BuilderAgent; print('OK')"
```

Expected: `OK`. Any `SyntaxError` or `ImportError` means step 4 patched the wrong location — re-read the function and adjust.

- [ ] **Step 6: Stage and commit (REQUIRES EXPLICIT USER APPROVAL)**

```bash
git add builder/agent/builder_agent.py
git status --short
```

Ask: *"Approving the _collect_design_library_context hook commit on L-SOUZA?"*

```bash
git commit -m "$(cat <<'EOF'
feat(builder): hook OD augmentation into _collect_design_library_context

Adds top-3 design systems block, matched OD skill SKILL.md, English
anti-slop checklist, English 5-dim self-critique, and pt-BR LANGUAGE_OVERRIDE
to the design library prompt sections. Wraps the entire OD path in a
try/except so any failure leaves the existing prompt unchanged
(builds never break because of OD).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Bump `PROMPT_VERSION` to invalidate Anthropic cache

**Files:**
- Modify: `builder/prompts/builder.py:16`

- [ ] **Step 1: Read the current line**

```bash
sed -n '16p' /Users/luskoliveira/simple-ai-lsouza/builder/prompts/builder.py
```

Expected: `PROMPT_VERSION = "builder-2026-04-25-v1"`.

- [ ] **Step 2: Update the constant**

Edit `builder/prompts/builder.py` line 16:

Replace:
```python
PROMPT_VERSION = "builder-2026-04-25-v1"
```

With:
```python
PROMPT_VERSION = "builder-2026-04-28-v2-od"
```

- [ ] **Step 3: Verify**

```bash
grep -n "^PROMPT_VERSION" /Users/luskoliveira/simple-ai-lsouza/builder/prompts/builder.py
```

Expected: `16:PROMPT_VERSION = "builder-2026-04-28-v2-od"`.

- [ ] **Step 4: Stage and commit (REQUIRES EXPLICIT USER APPROVAL)**

```bash
git add builder/prompts/builder.py
git diff --cached
```

Show the diff to the user. Ask: *"Approving the PROMPT_VERSION bump on L-SOUZA?"*

```bash
git commit -m "$(cat <<'EOF'
feat(builder): bump PROMPT_VERSION for OD-augmented prompt

builder-2026-04-25-v1 → builder-2026-04-28-v2-od

Invalidates Anthropic's prompt cache so the next N builds rewarm with
the new OD-augmented system prompt composition. One-time cache miss
cost; expected to amortize within the first 5-10 builds.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Add anti-slop warnings to `site_qa.py` (non-blocking)

**Files:**
- Modify: `builder/core/site_qa.py:55-69` (`repair_site_html`)
- Modify: `builder/core/site_qa.py` (add new helper at end)
- Test: `tests/test_site_qa_anti_slop.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_site_qa_anti_slop.py`:

```python
"""Tests for the new anti-slop warnings in site_qa."""
from __future__ import annotations

from pathlib import Path

from builder.core.site_qa import _flag_anti_slop, SiteQAResult


def _r() -> SiteQAResult:
    return SiteQAResult(html="", passed=True)


def test_flags_emoji_in_h1():
    html = "<html><body><h1>🚀 Bem-vindo</h1></body></html>"
    result = _r()
    _flag_anti_slop(html, result)
    assert any("emoji em heading" in w.lower() for w in result.warnings)


def test_does_not_flag_emoji_in_body_paragraph():
    html = "<html><body><p>Adoramos café ☕ pela manhã</p></body></html>"
    result = _r()
    _flag_anti_slop(html, result)
    assert not any("emoji em heading" in w.lower() for w in result.warnings)


def test_flags_section_without_heading():
    html = (
        "<html><body>"
        "<section><p>Texto sem cabeçalho</p></section>"
        "<section><h2>Com cabeçalho</h2><p>texto</p></section>"
        "</body></html>"
    )
    result = _r()
    _flag_anti_slop(html, result)
    assert any("section sem heading" in w.lower() for w in result.warnings)


def test_does_not_flag_section_with_aria_label_only():
    # Sections that delegate semantics to aria-label are acceptable.
    html = (
        "<html><body>"
        "<section aria-label='Galeria'><img src='./assets/x.jpg' alt='x'></section>"
        "</body></html>"
    )
    result = _r()
    _flag_anti_slop(html, result)
    assert not any("section sem heading" in w.lower() for w in result.warnings)


def test_warnings_do_not_set_passed_false():
    # Anti-slop warnings are non-blocking. passed stays True unless other
    # repairs flag broken images.
    html = "<html><body><h1>🚀 Welcome</h1><section><p>x</p></section></body></html>"
    result = SiteQAResult(html="", passed=True)
    _flag_anti_slop(html, result)
    assert result.passed is True
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_site_qa_anti_slop.py -v
```

Expected: `ImportError: cannot import name '_flag_anti_slop'`.

- [ ] **Step 3: Add the helper at the end of `builder/core/site_qa.py`**

Append at the end of `/Users/luskoliveira/simple-ai-lsouza/builder/core/site_qa.py`:

```python
# --- Anti-AI-slop warnings (Open Design integration, non-blocking) ----------

_EMOJI_RE = re.compile(
    "["
    "\U0001F300-\U0001F5FF"  # symbols & pictographs
    "\U0001F600-\U0001F64F"  # emoticons
    "\U0001F680-\U0001F6FF"  # transport & map symbols
    "\U0001F700-\U0001F77F"
    "\U0001F780-\U0001F7FF"
    "\U0001F800-\U0001F8FF"
    "\U0001F900-\U0001F9FF"
    "\U0001FA00-\U0001FA6F"
    "\U0001FA70-\U0001FAFF"
    "\U00002600-\U000026FF"  # misc symbols
    "\U00002700-\U000027BF"  # dingbats
    "]",
    flags=re.UNICODE,
)
_HEADING_TAG_RE = re.compile(
    r"<(h[1-6])\b[^>]*>(.*?)</\1>", re.IGNORECASE | re.DOTALL
)
_SECTION_TAG_RE = re.compile(
    r"<section\b([^>]*)>(.*?)</section>", re.IGNORECASE | re.DOTALL
)


def _flag_anti_slop(html: str, result: SiteQAResult) -> None:
    """Append non-blocking anti-AI-slop warnings to result.warnings.

    Checks: emojis in headings, sections without a heading or aria-label.
    Does not modify html. Does not affect result.passed.
    """
    # 1. Emojis in headings
    for match in _HEADING_TAG_RE.finditer(html):
        inner = match.group(2)
        if _EMOJI_RE.search(inner):
            tag = match.group(1).lower()
            result.warnings.append(
                f"Anti-slop: emoji em heading <{tag}>; remova ou mova para o corpo"
            )
            break  # one warning is enough

    # 2. Sections without a heading or aria-label
    for match in _SECTION_TAG_RE.finditer(html):
        attrs = match.group(1) or ""
        body = match.group(2) or ""
        has_heading = bool(re.search(r"<h[1-6]\b", body, re.IGNORECASE))
        has_aria_label = "aria-label" in attrs.lower()
        if not has_heading and not has_aria_label:
            result.warnings.append(
                "Anti-slop: <section> sem heading nem aria-label; "
                "adicione título ou rótulo"
            )
            break
```

- [ ] **Step 4: Wire `_flag_anti_slop` into `repair_site_html`**

Find the line `_flag_generic_sections(html, spec, result)` (currently inside `repair_site_html`, line 62). **Immediately after** that call, add:

```python
    _flag_anti_slop(html, result)
```

The full `repair_site_html` body now reads (for reference, do not duplicate):

```python
def repair_site_html(html: str, site_dir: Path, materialized_assets: Any, spec: dict[str, Any]) -> SiteQAResult:
    assets = _normalize_assets(materialized_assets)
    result = SiteQAResult(html=html, passed=True)

    html = _repair_image_tags(html, site_dir, assets, result)
    html = _repair_missing_asset_usage(html, assets, result)
    html = _repair_whatsapp_cta(html, spec, result)
    _flag_generic_sections(html, spec, result)
    _flag_anti_slop(html, result)            # ← NEW

    result.html = html
    result.images_total, result.images_local, result.images_broken = _count_images(html, site_dir)
    result.passed = result.images_broken == 0
    if result.images_broken:
        result.warnings.append(f"{result.images_broken} imagem(ns) local(is) quebrada(s) restante(s)")
    return result
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pytest tests/test_site_qa_anti_slop.py -v
```

Expected: 5 PASSED.

Also run all builder tests to confirm nothing else broke:

```bash
pytest tests/ -v
```

Expected: all PASSED (28+ tests across the four test files).

- [ ] **Step 6: Stage and commit (REQUIRES EXPLICIT USER APPROVAL)**

```bash
git add builder/core/site_qa.py tests/test_site_qa_anti_slop.py
git status --short
```

Ask: *"Approving site_qa anti-slop warnings commit on L-SOUZA?"*

```bash
git commit -m "$(cat <<'EOF'
feat(qa): add non-blocking anti-AI-slop warnings to repair_site_html

_flag_anti_slop appends warnings for emojis in <h1>-<h6> and for
<section> elements without heading or aria-label. Does NOT alter html
or set result.passed = False. Iter 1: warnings only; iter 2 may promote
some to blockers per the integration spec.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: End-to-end smoke tests

**Files:** none modified — runtime validation only.

- [ ] **Step 1: Verify ANTHROPIC_API_KEY is present (without exposing it)**

```bash
cd /Users/luskoliveira/simple-ai-lsouza
[ -n "$ANTHROPIC_API_KEY" ] && echo "key present (length=${#ANTHROPIC_API_KEY})" || echo "MISSING"
```

If `MISSING`, ask the user to set it in the local `.env` file at the repo root. **Never** ask the user to paste the value into the conversation.

- [ ] **Step 2: Install backend dependencies (idempotent)**

```bash
pip install -r api/requirements.txt
```

Expected: `Successfully installed ...` or `Requirement already satisfied: ...` for every line.

- [ ] **Step 3: Start the backend in one terminal (foreground, watch logs)**

In Terminal A:

```bash
cd /Users/luskoliveira/simple-ai-lsouza
uvicorn api.server:app --reload --log-level info
```

Expected: `Uvicorn running on http://127.0.0.1:8000` (or the configured port).

- [ ] **Step 4: Start the frontend in another terminal**

In Terminal B:

```bash
cd /Users/luskoliveira/simple-ai-lsouza
npm run dev
```

Expected: Vite dev server URL printed (typically `http://localhost:5173`).

- [ ] **Step 5: Smoke 1 — tech**

Open the frontend in a browser. Have a conversation that yields a build for "site para uma startup de IA B2B em São Paulo".

After the build completes:

In Terminal A (backend logs), confirm:
- A line containing `PROMPT_VERSION = "builder-2026-04-28-v2-od"` appears
- A line indicating top-3 design systems were emitted (look for `# BIBLIOTECA DE DESIGN: TOP-3 DESIGN SYSTEMS`)
- A line indicating `skill_id` chosen — expected to be `saas-landing` for this prompt

In the file system:

```bash
ls /Users/luskoliveira/simple-ai-lsouza/sites/ | tail -1
JOB_DIR=$(ls /Users/luskoliveira/simple-ai-lsouza/sites/ | tail -1)
head -30 "/Users/luskoliveira/simple-ai-lsouza/sites/$JOB_DIR/index.html"
```

Expected: an HTML comment `<!-- design_system_chosen: <id> -->` appears within the first 30 lines, and the chosen `<id>` is one of the 3 candidates that appeared in the backend logs.

Open the URL `http://localhost:8000/api/sites/$JOB_DIR/` in a browser and visually verify:
- Palette uses an OKLch-derived set of colors (typically tech-y: monochrome, blue, or graphite)
- Typography stack matches the chosen system (likely Inter, JetBrains Mono, or similar tech-leaning fonts)
- Density is reasonably compact (tech_utility school)

- [ ] **Step 6: Smoke 2 — local SMB**

Same flow with prompt: "site para uma padaria de bairro em Vitória".

In logs, expect:
- `skill_id` = `web-prototype` (default for SMB without explicit blog intent) OR `blog-post` if the conversation surfaced blog intent
- top-3 design systems mostly from the `soft_warm` school

In the rendered HTML, expect warm palette (cream, terracotta, sage, etc.) and a serif or warm sans-serif font choice.

- [ ] **Step 7: Smoke 3 — editorial**

Same flow with prompt: "lançamento de uma revista cultural sobre música capixaba".

In logs, expect:
- `skill_id` = `magazine-poster` (because business_type=editorial OR cta=launch_announcement)
- top-3 design systems from the `editorial_monocle` school

In the rendered HTML, expect newsprint-style layout: oversized serif headlines, multi-column body text, restrained accent color.

- [ ] **Step 8: Inspect QA warnings**

For each of the 3 builds, check the backend logs for `warnings:` entries. Expected:
- Some warnings may appear (especially anti-slop on first runs); they MUST NOT block the build
- `passed: True` in the QA result for all 3 builds (unless an unrelated issue like a broken image)

- [ ] **Step 9: Comparative check (optional but recommended)**

Pick one of the 3 prompts. Check out the previous commit (the one BEFORE the OD integration), regenerate the same prompt, and side-by-side compare:

```bash
cd /Users/luskoliveira/simple-ai-lsouza
git stash  # save uncommitted state if any
git checkout 9279cd2  # the spec commit, before OD code
# Run the same prompt in the frontend
# Note the rendered HTML
git checkout L-SOUZA  # back to current
git stash pop  # restore if applicable
# Run the same prompt again
# Compare side-by-side
```

Expected: post-OD build has visibly stronger palette and typography fidelity than pre-OD build.

> Skip this step if time is short. The acceptance criteria do not require it.

- [ ] **Step 10: Document results in the spec's verification log**

Open `docs/superpowers/specs/2026-04-28-open-design-integration-design.md` and add (under §10) a **"Verification log"** subsection with:

```markdown
### Verification log (iter 1)

- Date: <YYYY-MM-DD>
- Backend started: ✅
- Frontend started: ✅
- PROMPT_VERSION confirmed in logs: builder-2026-04-28-v2-od ✅
- Smoke 1 (tech / IA B2B): chosen skill = <id>, chosen design system = <id>, render quality OK ✅
- Smoke 2 (padaria): chosen skill = <id>, chosen design system = <id>, render quality OK ✅
- Smoke 3 (editorial): chosen skill = <id>, chosen design system = <id>, render quality OK ✅
- Anti-slop warnings logged: <count> warnings, none blocking ✅
- Comparative side-by-side run: <skipped | done — observation>
```

- [ ] **Step 11: Stage and commit the verification log (REQUIRES EXPLICIT USER APPROVAL)**

```bash
git add docs/superpowers/specs/2026-04-28-open-design-integration-design.md
git diff --cached
```

Ask: *"Approving the verification-log commit on L-SOUZA?"*

```bash
git commit -m "$(cat <<'EOF'
docs: add iter-1 verification log to OD integration spec

Records smoke test results (3 prompts), confirms PROMPT_VERSION rolled,
warnings non-blocking, builds successful.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review

**Spec coverage** — every locked decision in the spec maps to a task:

| Spec § | Task |
|---|---|
| §2.1 Vendor-only | Task 1 |
| §2.6 71 systems vendored | Task 1 (allow-list) + Task 5 (loader) |
| §2.7 5 skills | Task 1 (allow-list) + Task 4 (router) |
| §2.8 Rollback via git revert | Task 9 step 9 (comparative) + spec §9 already covers procedure |
| §2.9 OD content in English | Task 3 (constants) |
| §2.11 Heuristic top-3 + Opus single call | Task 5 (narrow_top3) + Task 6 (hook) |
| §4 Vendoring layout | Task 1 |
| §5.1 design_systems_catalog | Task 5 |
| §5.2 od_skills_router | Task 4 |
| §5.3 od_checklists | Task 3 |
| §6 Hook lines 370 + 431 | Task 6 (line 370 — line 431 inherits via design_library_context concatenation) |
| §6 PROMPT_VERSION bump | Task 7 |
| §6 site_qa anti-slop warnings | Task 8 |
| §7 System prompt composition order | Task 6 step 4 (sections appended in order) |
| §10 Verification | Task 9 |
| §12 Guard-rails (per-action git approval, L-SOUZA only) | every commit step |

**Placeholder scan** — none of "TBD", "TODO", "implement later", "fill in details", "add appropriate error handling", "similar to Task N" appear. Every code step shows complete code. Every command shows expected output. Implementation note at Task 3 step 4 is a substantive directive (prefer upstream wording), not a placeholder.

**Type consistency**:
- `DesignSystemSpec` defined in Task 5, used in Task 6 helper signature ✓
- `match_skill(spec) -> str` defined in Task 4, used in Task 6 ✓
- `load_skill_instructions(skill_id, vendor_path)` defined in Task 4, used in Task 6 ✓
- `narrow_top3(spec, catalog=None)` defined in Task 5, used in Task 6 with catalog=None default (auto-loads) ✓
- `_flag_anti_slop(html, result)` defined in Task 8 step 3, used in Task 8 step 4 ✓
- `SiteQAResult` already exists in `site_qa.py` line 18, reused in Task 8 ✓
- All constant names (`ANTI_AI_SLOP_CHECKLIST_EN`, `SELF_CRITIQUE_PROTOCOL_EN`, `LANGUAGE_OVERRIDE`) consistent across Task 3 and Task 6 ✓
