# Handoff — Open Design Integration (iter 1)

**Date written:** 2026-04-28
**Branch:** `L-SOUZA` (worktree at `/Users/luskoliveira/simple-ai-lsouza`)
**Status:** Code complete + dry-run validated. Real-API smoke pending. **No push to origin yet.**

This document is the single source of truth for picking the work back up
in a future session. Read it from top to bottom before doing anything.

## TL;DR

- 10 commits on `L-SOUZA` ahead of `origin/L-SOUZA` (push pending user approval)
- 34/34 unit tests passing
- Dry-run validates the wiring end-to-end with no API cost
- Real-API smoke (3 prompts → real Opus 4.7 builds) is the only thing left, blocked on `ANTHROPIC_API_KEY` not being set in `api/.env.local`
- All planning artifacts (spec, plan, this handoff) live under `docs/superpowers/`
- Vendor (Open Design at commit `94941f59...`) is committed; future sync is manual

## Commit log on L-SOUZA (most recent first)

```
549f6c3 chore(smoke): add dry-run script for OD integration validation
2ef2989 chore(smoke): add direct-API smoke script for OD integration
b5cdd49 feat(qa): add non-blocking anti-AI-slop warnings to repair_site_html
643911b feat(builder): bump PROMPT_VERSION for OD-augmented prompt
826919d feat(builder): hook OD augmentation into _collect_design_library_context
2db237b feat(builder): add design_systems_catalog with heuristic top-3
aaf0e03 feat(builder): add od_skills_router with deterministic lookup
8eeba34 feat(builder): add od_checklists module (anti-slop + self-critique)
fbe21de vendor: pin Open Design (Apache-2.0) for builder prompt augmentation
c5ede1d chore: add pytest dev dep and tests/ scaffolding
a9a3cae docs: add Open Design integration implementation plan
9279cd2 docs: add Open Design integration spec
```

Above the existing baseline `265fd8c chore: snapshot current local version`.

## Files added or modified

**Vendored (commit-pinned at upstream `94941f59a90f319934f8e8bf2b955fbdb14a0df6`):**
- `vendor/open-design/LICENSE` — Apache-2.0 from upstream
- `vendor/open-design/README-VENDORING.md` — provenance
- `vendor/open-design/design-systems/` — 71 DESIGN.md files
- `vendor/open-design/skills/{pricing-page,blog-post,web-prototype,saas-landing,magazine-poster}/` — 5 skill bundles
- `vendor/open-design/src/prompts/discovery.ts` — anti-slop source

**New backend modules:**
- `builder/core/design_systems_catalog.py` — 71-system catalog + 5-school classifier + narrow_top3
- `builder/core/od_skills_router.py` — 5-skill lookup table
- `builder/prompts/od_checklists.py` — anti-slop, 5-dim self-critique, LANGUAGE_OVERRIDE constants

**Modified backend:**
- `builder/agent/builder_agent.py` — imports + `_format_top3_design_systems` helper + OD augmentation block in `_collect_design_library_context` (line ~370)
- `builder/prompts/builder.py` — `PROMPT_VERSION = "builder-2026-04-28-v2-od"`
- `builder/core/site_qa.py` — `_flag_anti_slop` helper + wiring into `repair_site_html`

**Tests (all passing as of commit `b5cdd49`):**
- `tests/conftest.py` — vendor_path / design_systems_path / skills_path fixtures
- `tests/test_od_checklists.py` — 4 tests
- `tests/test_od_skills_router.py` — 11 tests
- `tests/test_design_systems_catalog.py` — 14 tests (parametrized)
- `tests/test_site_qa_anti_slop.py` — 5 tests
- **Total: 34 passing**

**Tooling:**
- `scripts/smoke_od_integration.sh` — direct `/v2/build` smoke (needs API key + running backend)
- `scripts/dryrun_od_integration.py` — composes augmentation without API call

**Planning artifacts:**
- `docs/superpowers/specs/2026-04-28-open-design-integration-design.md` — spec (commit `9279cd2`)
- `docs/superpowers/plans/2026-04-28-open-design-integration.md` — plan (commit `a9a3cae`)
- `docs/superpowers/HANDOFF-2026-04-28-od-integration.md` — this file

## Quick verification on resume

```bash
cd /Users/luskoliveira/simple-ai-lsouza
git branch --show-current                       # must be L-SOUZA
git log --oneline -12                           # 10 OD commits + spec/plan + base
pytest tests/ -q                                # must show 34 passed
python scripts/dryrun_od_integration.py         # must show ALL CHECKS PASSED
```

If any of those fail, something has drifted — investigate before continuing.

## What works (validated)

- All 71 design systems load from the vendored DESIGN.md files
- 5-school classifier returns deterministic mapping for given specs
- 5-skill router returns the expected skill for tech / padaria / editorial specs
- narrow_top3 always returns 3 distinct systems
- All checklist constants pass structural invariants (English, 5 dimensions, pt-BR override)
- The OD augmentation block is composed and would be appended to the Opus
  system prompt at runtime
- PROMPT_VERSION is bumped (Anthropic prompt cache will invalidate on first call)
- Anti-slop warnings flag emojis-in-headings and section-without-heading

## Known rough edges (deferred to iter 2)

1. **School classifier is over-eager for `tech_utility`**: 49 of 71 systems classified
   there. Caused by tokens like "tech", "minimal", "ai" appearing across many
   DESIGN.md files. Manifestation: top-3 for the `tech` spec returns
   `airbnb, airtable, apple` (alphabetical fallback when scores tie at ~0.8)
   instead of the more obvious `linear-app, stripe, vercel`.

2. **Other schools have too few or wrong members**: e.g., `Ferrari` and
   `PlayStation` end up in `editorial_monocle`, `Mastercard` and `Starbucks`
   in `soft_warm`. The `> Category:` line at the top of DESIGN.md files
   (when present) is a much stronger signal — using it as the primary
   classifier input would help.

3. **No real-API smoke yet**: `scripts/smoke_od_integration.sh` is ready
   but blocked on `api/.env.local` having `ANTHROPIC_API_KEY=...`. See
   "How to resume" below.

4. **9router not running locally**: the conversational UI (intake +
   first-interaction agents) requires `localhost:20128`. The OD integration
   does NOT depend on this — only the conversational flow does. Smoke
   testing via `/v2/build` directly bypasses it.

5. **`vendor/open-design/.git` was removed during vendoring**: necessary
   to flatten the clone into the parent repo (otherwise treated as a
   submodule). Future updates require re-cloning, not `git pull`.

## How to resume — three common scenarios

### Scenario A: Run the real-API smoke now

```bash
# Step 1 — the user adds their API key to api/.env.local
cat > /Users/luskoliveira/simple-ai-lsouza/api/.env.local <<'EOF'
ANTHROPIC_API_KEY=<paste your key here>
PORT=8000
INTAKE_FILTER_ENABLED=0
FIRST_INTERACTION_AGENT_ENABLED=0
AGENT_IMAGE_ENABLED=0
AGENT_LANGUAGE=pt-BR
EOF

# Step 2 — terminal A: start the backend
cd /Users/luskoliveira/simple-ai-lsouza
uvicorn api.server:app --port 8000

# Step 3 — terminal B: run the smoke (3 builds, ~5-10 min total)
cd /Users/luskoliveira/simple-ai-lsouza
bash scripts/smoke_od_integration.sh

# Step 4 — inspect results
ls scripts/smoke_results/*/index.html
open scripts/smoke_results/tech/index.html      # macOS — opens in browser
```

### Scenario B: Refine the school classifier (iter 2)

Open `builder/core/design_systems_catalog.py` and look at:

- `_classify_system_school(vibe_pool, folder_name)` — currently scores keyword
  overlap against `_SCHOOL_KEYWORDS`. Replace with: read the `> Category: ...`
  line from each DESIGN.md (regex `_CATEGORY_RE` already defined) and map
  category strings to schools. Fallback to keyword scoring only when no
  category line is present.

- After the change, re-run `python scripts/dryrun_od_integration.py` and
  verify the top-3 picks make more visual sense (e.g., tech spec → linear-app,
  stripe, vercel; editorial → wired, theverge, monocle-style).

- Update the spec's "Verification log" section if the changes affect
  behavior visibly.

### Scenario C: Push the branch upstream

> The user has a hard rule against `git push` without explicit per-action
> approval. **Do NOT push without asking.** The current state has 10 commits
> ahead of `origin/L-SOUZA`.

```bash
git log --oneline origin/L-SOUZA..L-SOUZA   # confirm what would be pushed
# Then ASK the user explicitly: "Approving push of these 10 commits to origin/L-SOUZA?"
git push origin L-SOUZA                     # only after explicit yes
```

## Operational guard-rails (memory-enforced)

- All work on branch `L-SOUZA`, never `main`. Per memory `project_simple_ai`.
- Every `git add` / `git commit` / `git push` / `git revert` requires
  **explicit per-action approval** from the user. Per memory
  `feedback_no_git_without_approval`.
- Never paste `ANTHROPIC_API_KEY` value into the conversation. Read presence
  only. Per spec §12.
- The PRD constraint "dock with 2 buttons, lousa starts empty, no menus" is
  inviolable — the OD integration is 100% server-side, no UI changes. Per
  spec §2.3.

## Reference

- **Spec:** `docs/superpowers/specs/2026-04-28-open-design-integration-design.md`
- **Plan:** `docs/superpowers/plans/2026-04-28-open-design-integration.md`
- **Open Design upstream:** https://github.com/nexu-io/open-design (Apache-2.0)
- **Pinned commit:** `94941f59a90f319934f8e8bf2b955fbdb14a0df6`

## Decision log (recap from brainstorming)

1. Vendor-only integration; no daemon, no CLI, no UI changes
2. Audience stays non-technical; no CLI agent required for end users
3. PRD inviolable; design system + skill chosen server-side from conversation
4. Always L-SOUZA branch, never main
5. Iter 1 success metric: qualitative eye test. Iter 2: heuristic gates in QA
6. Vendor all 71 design systems
7. Vendor exactly 5 skills (pricing-page, blog-post, web-prototype, saas-landing, magazine-poster)
8. Rollback via `git revert` + PROMPT_VERSION rolls automatically
9. OD content kept in English originals; pt-BR enforced via LANGUAGE_OVERRIDE
10. Spec lives in repo at `docs/superpowers/specs/`
11. Heuristic narrows 71 → top-3, single Opus 4.7 call decides + builds
