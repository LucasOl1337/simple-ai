# Vendored: Open Design

**Upstream:** https://github.com/nexu-io/open-design
**Pinned commit:** `94941f59a90f319934f8e8bf2b955fbdb14a0df6`
**Pinned date:** `2026-04-28`
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
