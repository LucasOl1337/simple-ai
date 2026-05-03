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


OUTPUT_AUDIT_MARKER_EN = """\
# OUTPUT AUDIT MARKER (Open Design) — MANDATORY

The very first child of <body> MUST be an HTML comment naming the design
system you anchored on, using the exact lowercase `id` from the TOP-3
DESIGN SYSTEMS block shown above (e.g. `clay`, `airbnb`, `ferrari`,
`apple`, `mastercard`, `starbucks`, `playstation`, `spotify`).

Required format (literal — do not vary, do not translate):

<!-- design_system_chosen: ID_HERE -->

Where ID_HERE is the id of the system you chose. If you blended multiple
systems, identify the single dominant one.

Example structure:

<body>
  <!-- design_system_chosen: clay -->
  <header>
    ...

This marker is required for downstream auditing. Do NOT omit it, do NOT
change its format, do NOT wrap it in another element, do NOT add other
identifying comments.
"""
