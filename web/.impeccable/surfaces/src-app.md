---
version: 1
slug: "src-app"
primary_target: "src/app"
related_targets: []
---

# Farmer app (all farmer routes)

Scope: every farmer-facing route of the Next.js app (sign in, set up, buy cover, home, policy detail). Visitor mode: Operate. Mobile-first, works on any phone and network.

Audience and job: a smallholder farmer in Marathwada, alone on their own phone, often outdoors in strong sun. Signs in, registers once, buys seasonal cover, later checks rain and money.

Constraints: English only; 18px body; 56px primary actions; WCAG AA; light pages for weak networks; status never by colour alone; no emoji, no exclamation marks.

## Direction contract

THESIS: Cover reads like the mandi rate board the farmer already trusts: every payout is a posted rate (rain condition → rupees) in big tabular figures. Refuses the category default of white cards, one green button and a pastel chart.

OWN-WORLD: Painted board green (deep, flat, no gradient) owns the top band of every screen; white and marigold-yellow board figures on it; below, a pale limewash ground with ink text. Hairline column rules, tabular numerals, one grotesk family. Ochre and river blue appear only as rain readings. States are painted labels (rectangular, square-cornered tags), never pills.

STORY: The farmer sees, before buying, the exact rate card: what rain does, what it pays. After buying, the board shows today's reading against those posted rates, and money on its way is posted like a fresh rate.

FIRST VIEWPORT: Board band at top (40% of the viewport on home): product name small, then the reading as a large figure with the posted rate ticks under it. Below, a ruled list of rates/phases. Primary action fixed at the bottom, full width, 56px.

FORM: Mandi rate board, candidate 6 of 7 on the ordered list; raises: exact-length phase bars (from labanotation score), tabular numerics carry the page (from data-sublime field), flat colour fields own regions (from zoo map), every figure beside its rule (from monochrome product canon). seed: seed:a0c84a80fc73c89f

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Offline cache and PWA install (Part W.5).
- Agent mode surfaces not designed yet.
