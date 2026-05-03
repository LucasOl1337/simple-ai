# Open Design Integration — Builder Augmentation Spec

**Date**: 2026-04-28
**Branch**: `L-SOUZA` (worktree `/Users/luskoliveira/simple-ai-lsouza`)
**Status**: Spec validated via brainstorming — pending implementation plan
**Author**: Lucas Souza (driving), Claude (drafting)
**Skill**: `superpowers:brainstorming` → next: `superpowers:writing-plans`

## 1. Context

simple-ai is a conversational pt-BR website builder for Brazilian SMBs and tech startups. It generates **exactly one self-contained HTML file** per build. The pipeline runs in `builder/agent/builder_agent.py` (Python, FastAPI, Anthropic SDK, Opus 4.7) and consumes specs produced by the conversational planner in `intake/engine/`.

The user proposes augmenting the builder's prompt stack with content vendored from the open-source project [Open Design](https://github.com/nexu-io/open-design) (Apache-2.0). Open Design ships 71 brand-grade design systems, 30 skills, an anti-AI-slop checklist, and a 5-dimensional self-critique protocol — all proven in the closed-source Claude Design product but reusable as plain prompt content.

**Goal**: lift the visual quality of generated websites (palette, typography, structural patterns, anti-slop hygiene) without changing the simple-ai PRD, runtime architecture, frontend UX, or non-technical user journey.

## 2. Decisions (locked during brainstorming)

| # | Topic | Decision |
|---|---|---|
| 1 | Integration mode | **Vendor-only**: copy OD content into `vendor/open-design/`. No daemon, no CLI delegation, no UI changes |
| 2 | Audience | Keep non-technical users; no CLI agent required |
| 3 | UX | PRD inviolable: dock with 2 buttons, no menus, no pickers — design system & skill chosen server-side |
| 4 | Branch | Always `L-SOUZA`, never `main` |
| 5 | Success metric | Iter 1: qualitative eye test. Iter 2: heuristic gates in QA |
| 6 | Design-system scope | All 71 systems vendored — selector ranks |
| 7 | Skill scope | 5 skills: `pricing-page`, `blog-post`, `web-prototype`, `saas-landing`, `magazine-poster` |
| 8 | Rollback | `git revert` + PROMPT_VERSION bump-back. No feature flag |
| 9 | Language of OD content | Keep English originals. pt-BR output enforced via system-prompt instruction |
| 10 | Spec location | `simple-ai-lsouza/docs/superpowers/specs/` (this file) |
| 11 | Selection strategy | Heuristic narrows 71 → top-3 → single Opus call decides + builds |

## 3. Architecture

```
intake/ui (React 19) — UNCHANGED, dock with 2 buttons, PRD-inviolable
   │
   │  POST /v2/build (BuildRequest, schema unchanged)
   ▼
api/server.py — UNCHANGED
   │
   │  builder.enqueue(job_id, spec)
   ▼
builder/agent/builder_agent.py
   │
   ├─ ① _collect_design_library_context (line 370)
   │    ├─ design_systems_catalog.narrow_top3(spec)  → 3 candidates
   │    ├─ od_skills_router.match_skill(spec)        → 1 skill
   │    └─ od_checklists.load()                      → 2 strings (anti-slop + self-critique)
   │
   ├─ ② _build_system_prompt_for_job (line 431)
   │    composes: profile + AGENTE_02 + design_library + top3 + skill + checklists + LANGUAGE_OVERRIDE
   │
   ├─ ③ _call_claude (line 597)
   │    1 Opus 4.7 call. Opus picks 1 of 3 candidates AND generates HTML in single hop
   │    PROMPT_VERSION = "builder-2026-04-28-v2-od"  (invalidates Anthropic cache)
   │
   └─ ④ repair_site_html → site_qa
        Adds anti-slop warnings (non-blocking in iter 1)
   │
   ▼
sites/{job_id}/index.html
```

**Principles**:
- **Zero contract change** on `BuildRequest` ↔ `BuildJob`. Frontend and `api/server.py` are blind to the integration.
- **Commit-pinned shallow vendor** in `vendor/open-design/`. Apache-2.0 LICENSE preserved.
- **Top-3 narrowing before Opus** keeps the system prompt compact (~5KB extra) while letting Opus override the heuristic if the spec demands it.
- **Rollback via git revert** + `PROMPT_VERSION` bump-back. No env flags, no config files.

## 4. Vendoring layout

```
vendor/open-design/
├── LICENSE                    ✅ committed (Apache-2.0)
├── README-VENDORING.md        ✅ committed (created by us — upstream URL, SHA pin, date, attribution)
├── design-systems/            ✅ committed (71 DESIGN.md files + assets)
├── skills/
│   ├── pricing-page/          ✅ committed
│   ├── blog-post/             ✅ committed
│   ├── web-prototype/         ✅ committed
│   ├── saas-landing/          ✅ committed
│   └── magazine-poster/       ✅ committed
├── src/prompts/discovery.ts   ✅ committed (source for anti-slop checklist + self-critique)
└── (everything else)          ❌ .gitignore allow-list excludes
```

`.gitignore` allow-list to add:
```gitignore
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

**Vendoring procedure (each git step requires explicit per-action approval)**:
1. `mkdir -p /Users/luskoliveira/simple-ai-lsouza/vendor`
2. `git clone --depth 1 https://github.com/nexu-io/open-design.git vendor/open-design`
3. Capture SHA pin: `(cd vendor/open-design && git rev-parse HEAD)`
4. Write `vendor/open-design/README-VENDORING.md` (upstream URL, SHA, date, Apache-2.0 attribution)
5. Update root `.gitignore` with the allow-list
6. **Approval gate** → `git add vendor/ .gitignore`
7. **Approval gate** → `git commit` on the L-SOUZA branch (never `main`)

## 5. New backend modules

### 5.1 `builder/core/design_systems_catalog.py` (~150 LOC)

```python
@dataclass
class DesignSystemSpec:
    id: str                          # "linear", "stripe", "apple", ...
    name: str
    palette_oklch: dict[str, str]    # {"primary": "oklch(...)", "surface": "...", ...}
    typography: dict[str, str]       # {"display": "Inter", "body": "Inter", "mono": "JetBrains Mono"}
    density: str                     # "compact" | "comfortable" | "spacious"
    vibe_tags: list[str]             # ["tech", "minimal", "monochrome", "saas", ...]
    school: str                      # "tech_utility" | "soft_warm" | "editorial_monocle" | "modern_minimal" | "brutalist"
    source_url: str                  # https://github.com/nexu-io/open-design/tree/<sha>/design-systems/<id>

def load_open_design_systems(path: Path) -> list[DesignSystemSpec]:
    """Parse the 71 DESIGN.md files in vendor/open-design/design-systems/.
    Cache in memory after first load (module-level)."""

def _classify_school(spec: dict) -> str:
    """Classify the build spec into one of 5 visual schools.
    Mapping (precedence top-to-bottom — first match wins):
      brand_tone in ["tech", "minimal", "engineered"]                        → tech_utility
      business_type in ["editorial", "agency", "media", "magazine"]          → editorial_monocle
      business_type in ["fashion", "creative", "cultural", "art_gallery"]    → brutalist
      business_type in ["corporate", "institutional", "fintech", "legal"]    → modern_minimal
      default (retail, local services, hospitality, food, etc.)              → soft_warm
    """

def _score(system: DesignSystemSpec, spec: dict) -> float:
    """Score a single system against a build spec.
    Sub-scores (each 0..1, summed):
      vibe_tags ∩ brand_tone tokens         (weight 0.4)
      density compatibility w/ content_volume (weight 0.3)
      typography fit w/ stated style hints   (weight 0.3)
    Returns total."""

def narrow_top3(spec: dict, catalog: list[DesignSystemSpec] | None = None) -> list[DesignSystemSpec]:
    """1) Classify school via _classify_school.
    2) Filter catalog to systems matching that school.
    3) If filtered set < 3, top up by ranking ALL remaining systems (any school)
       by _score and appending highest-scored until we have 3.
    4) Inside the school-matched group, sort by _score descending and take top-N.
    5) Combine into the final list of exactly 3 systems.
    Always returns exactly 3 systems regardless of catalog state."""
```

### 5.2 `builder/core/od_skills_router.py` (~80 LOC)

```python
SKILLS = ["pricing-page", "blog-post", "web-prototype", "saas-landing", "magazine-poster"]

def match_skill(spec: dict) -> str:
    """Determine which OD skill best fits the spec.

    Precedence (first match wins — order matters):
      1. business_type in [saas, software, platform, tool] AND has_pricing  → "saas-landing"
      2. primary_cta in ["sell_subscription", "tier_compare", "view_pricing"] → "pricing-page"
      3. business_type in [editorial, magazine, news, agency_creative] OR
         primary_cta == "launch_announcement"                                 → "magazine-poster"
      4. content_volume == "high" AND (has_blog_intent OR business_type in
         [restaurant, padaria, salon, services_local])                        → "blog-post"
      5. default                                                              → "web-prototype"

    Returns one of SKILLS."""

def load_skill_instructions(skill_id: str, vendor_path: Path) -> str:
    """Read vendor/open-design/skills/{skill_id}/SKILL.md and return as a string
    ready to inject into the builder system prompt. Cache results."""
```

### 5.3 `builder/prompts/od_checklists.py` (~50 LOC)

```python
# Content extracted at implementation time from
# vendor/open-design/src/prompts/discovery.ts.
# Kept in English by design (decision #9): bilingual prompts work well with
# Anthropic models; output language is enforced separately by LANGUAGE_OVERRIDE.

ANTI_AI_SLOP_CHECKLIST_EN = """<extracted at implementation time>"""

SELF_CRITIQUE_PROTOCOL_EN = """<extracted at implementation time>"""

LANGUAGE_OVERRIDE = """The output HTML must be written in pt-BR (Brazilian Portuguese).
The checklists above are in English — apply the rules to the structure and visual
choices, but write all visible content (headlines, body copy, CTAs, microcopy,
alt text) in pt-BR appropriate for Brazilian SMB audiences."""
```

## 6. Hooks into the existing builder

| File:line | Change |
|---|---|
| `builder/agent/builder_agent.py:370` (`_collect_design_library_context`) | Call `design_systems_catalog.narrow_top3(spec)`, `od_skills_router.match_skill(spec)`, `od_skills_router.load_skill_instructions(...)`, and load checklists. Return dict adds 4 keys: `top3_design_systems`, `matched_skill`, `anti_slop`, `self_critique` |
| `builder/agent/builder_agent.py:431` (`_build_system_prompt_for_job`) | Inject the 4 new blocks in the order in §7. Append `LANGUAGE_OVERRIDE` at the very end |
| `builder/prompts/builder.py:16` (`PROMPT_VERSION`) | Bump to `"builder-2026-04-28-v2-od"`. Invalidates Anthropic prompt cache; first N builds after deploy run uncached (one-time cost) |
| `builder/core/site_qa.py` | Inside `repair_site_html` add 4 warnings (non-blocking, log only): emojis in `<h1>`–`<h6>`, `<section>` without heading, more than 3 colors outside declared OKLch palette, font-stack divergent from chosen typography |

## 7. System prompt composition order

```
[1] Profile prompt          (AgentesProfiles/*.md, via _load_profile_prompt — UNCHANGED)
[2] AGENTE_02 system prompt (prompts/builder.py:19 — UNCHANGED)
[3] Design library context  (existing local templates, UNCHANGED)
[4] <top3_design_systems>   ← NEW — 3 candidates, palette + typography + 1-2 sentence rationale + source_url
[5] <matched_skill>         ← NEW — full SKILL.md content + suggested structure bullets
[6] <anti_ai_slop_checklist>← NEW — English, list of don'ts
[7] <self_critique_protocol>← NEW — English, 5 dimensions w/ rubric
[8] LANGUAGE_OVERRIDE       ← NEW — explicit pt-BR output instruction
```

**Per-block format**:
- **`<top3_design_systems>`**: each candidate annotated with its OKLch palette, typography stack, school label, and a short rationale ("ranked #1: tone matches Soft Warm; padaria has warm/inviting connotations"). Opus is **explicitly instructed to choose one and emit a `<!-- design_system_chosen: <id> -->` HTML comment** before `<html>` so the choice is auditable in logs.
- **`<matched_skill>`**: paste the full SKILL.md content followed by 3-5 bullets summarizing the suggested HTML structure (e.g., for `pricing-page`: hero → 3-tier card grid → feature comparison table → FAQ accordion → CTA footer).
- **`<anti_ai_slop_checklist>`**: don't-list (no emoji headings, no rounded-corner overload, no stock gradients, no faux glass morphism unless tone explicitly editorial-tech, no "Lorem ipsum"-shaped copy).
- **`<self_critique_protocol>`**: 5 dimensions (clarity, hierarchy, restraint, surprise, fit) with a one-line rubric per dimension and an instruction to silently self-check before final output.

## 8. Files to create / modify / leave alone

**Create**:
- `vendor/open-design/` (shallow clone) + `vendor/open-design/README-VENDORING.md`
- `builder/core/design_systems_catalog.py`
- `builder/core/od_skills_router.py`
- `builder/prompts/od_checklists.py`

**Modify**:
- `builder/agent/builder_agent.py` (lines 370 and 431)
- `builder/prompts/builder.py` (line 16: `PROMPT_VERSION` bump)
- `builder/core/site_qa.py` (anti-slop warnings)
- `.gitignore` (vendor allow-list)

**Do not touch**:
- `intake/ui/*` (PRD inviolable)
- `intake/engine/planner.js` (current heuristics emit sufficient signals)
- `api/server.py` (`BuildRequest` schema stays identical)
- `builder/prompts/builder.py:19 AGENTE_02_BUILDER_SYSTEM_PROMPT` (kept verbatim — augmentation is composed at runtime)
- `AgentesProfiles/*.md` (profile system stays as-is)

## 9. Rollback procedure

If post-deploy output regresses:
1. `cd /Users/luskoliveira/simple-ai-lsouza`
2. Identify the OD integration commit: `git log --oneline | grep -i "open design\|OD\|vendor"`
3. **Approval gate** → `git revert <commit_sha>` (creates a revert commit, preserves history)
4. `PROMPT_VERSION` reverts automatically when `prompts/builder.py` is reverted
5. Restart backend. The Anthropic prompt cache will rewarm over the next few builds

No env flag flip. No config edit. Single git operation under the existing approval rule.

## 10. Verification

### Pre-deploy smoke tests

1. Verify `.env` has `ANTHROPIC_API_KEY` set (without exposing the value):
   `[ -n "$ANTHROPIC_API_KEY" ] && echo "key present" || echo "MISSING"`
2. `cd /Users/luskoliveira/simple-ai-lsouza && pip install -r api/requirements.txt`
3. Terminal A: `uvicorn api.server:app --reload`
4. Terminal B: `npm run dev`
5. **Smoke 1 — tech**: prompt the conversational UI with "site para uma startup de IA B2B"
   - Expected log: `top3` contains Linear/Vercel/Stripe (or peers from `tech_utility` school), `skill="saas-landing"`
   - Expected HTML: `<!-- design_system_chosen: <id> -->` comment, palette + typography matching chosen system
6. **Smoke 2 — local**: "site para uma padaria de bairro em Vitória"
   - Expected: `top3` from `soft_warm`, `skill="web-prototype"` (default), warm color palette
7. **Smoke 3 — editorial**: "lançamento de revista cultural sobre música capixaba"
   - Expected: `top3` from `editorial_monocle`, `skill="magazine-poster"`, newsprint layout
8. Inspect logs of `_call_claude`: `PROMPT_VERSION = "builder-2026-04-28-v2-od"` appears
9. Inspect `site_qa` logs: warnings present but not blocking the build

### Acceptance criteria (iter 1)

- 3 builds in contrasting segments produce visibly different design systems and skills aligned with the conversational tone
- Side-by-side comparison with one pre-change build (same prompt, previous commit) shows superior palette / typography / density
- Zero regression in conversational flow (planner unchanged)
- Zero UI change (frontend untouched)
- `BuildRequest` and `BuildJob` schemas remain identical

## 11. Out of scope (deferred to iter 2 or later)

- Promote QA warnings to blocking gates
- Telemetry on which design system was chosen at what frequency
- pt-BR translation of the OD checklists
- Vendor more skills beyond the 5 chosen
- Runtime feature flag
- Automated upstream sync with `nexu-io/open-design` (currently a manual re-clone)
- Anthropic prompt-cache cost tracking dashboard

## 12. Operational guard-rails

- **Git**: every `git add`, `git commit`, `git push`, `git revert` requires explicit per-action approval (memory `feedback_no_git_without_approval`)
- **Branch**: all work on `L-SOUZA`, never `main`. Worktree path `/Users/luskoliveira/simple-ai-lsouza` (memory `project_simple_ai`)
- **Streaming**: `_call_claude` uses `messages.stream()` with prompt caching — must be tested locally before any push (memory `feedback_test_before_push`)
- **API key handling**: never paste the value in conversation; backend reads `ANTHROPIC_API_KEY` from env. If a key was ever exposed, rotate immediately at https://console.anthropic.com/settings/keys
- **PRD**: if at any point the integration starts requiring new UI surface or visible pickers, stop and revalidate before proceeding
