# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router, TypeScript) front end in `/web`, talking to the Node.js + Express API in `/api` (PostgreSQL via Prisma). User chose Next.js + Node/Express on 2026-11-19, replacing the earlier Flutter app in `/mobile`; database left to us ("MongoDB or whatever you use"), kept on PostgreSQL.

## Users

Primary: a smallholder farmer in Marathwada, Maharashtra (Latur, Beed, Dharashiv, Nanded), using the app alone on their own phone. Modest reading level, often reading a second language; English only for now (user decision 2026-11-19). Jobs: sign in with a phone number, register once (consent, name, village, field location, UPI ID), buy seasonal crop cover, and later check whether rain has fallen short and whether money is on its way.

Secondary (not designed for yet): field agents and FPO staff who enrol farmers; insurer and sponsor staff use a separate admin surface.

## Product Purpose

FasalShield is parametric micro-insurance: cover pays automatically when satellite rain data crosses a set threshold for the farmer's field, with money sent to their UPI ID within 24 hours. No claim forms, no loss assessor visits. Success: a farmer understands what they bought, trusts it, and receives money without asking for it.

## Positioning

Payouts are triggered by an index, not by a claim: the farmer sees the same rain number the insurer sees, the thresholds that pay, and the amount each one pays, before buying.

## Operating Context

- Seasons: Rabi 2026-27 is the live demo season; crop phases (sowing, growth, grain filling) each carry their own share of cover.
- Products: Dry Spell Cover (rain % below normal; pays at 40/60/80% below) and Heavy Rain Cover (mm in a rolling 3 days; pays at 75/120/180 mm).
- Premium is part-paid by a sponsor (government or FPO); the farmer sees the full premium, the sponsor share, and what they pay.
- Field location is a GPS pin on an OpenStreetMap map; rain is tracked on a 0.05° grid cell.
- Payment and payout go through UPI (mocked in development; test OTP shown on screen in development only).

## Capabilities and Constraints

- Must work well on every phone and network (user, 2026-11-19): design for the weakest case, low-end Android, small screens (320–360 px), patchy 2G/3G, while scaling up cleanly to larger phones and desktop.
- Pages must stay light: no heavy imagery, video, or large font payloads; content readable before scripts finish.
- Offline: last-known policy data should remain readable without network (to be built).
- Money is in whole rupees with Indian digit grouping (₹1,23,456); amounts are exact, never rounded for display.
- Status is never shown by colour alone.

## Brand Commitments

- Name: FasalShield. Voice: plain, trustworthy, warm; sentence case; no exclamation marks; no emoji.
- The rain meter with payout threshold ticks is the product's signature explanation of how cover works.

## Evidence on Hand

- Product docs: `/docs` (PRD, architecture, security, frontend spec, tickets).
- Real screen flow and copy: gallery https://claude.ai/artifact/K28hQ6DwSh6qfyw3QgT1NP (Flutter build, 2026-11-19).
- No testimonials, partner logos, customer counts, or regulatory badges exist; do not fabricate them.

## Product Principles

1. Show the money and the rule together: every amount appears next to the rain condition that pays it.
2. One decision per screen; the next action is always obvious and reachable with a thumb.
3. Never alarm or mislead: missing data says it is missing, never a fake reading.
4. Respect the farmer's time and data budget: fast first paint, small pages.

## Accessibility & Inclusion

WCAG 2.2 AA contrast; touch targets at least 48 px (primary actions 56 px); body text 18 px; works with screen readers (rain meter has a spoken summary); usable at 200% text zoom; modest literacy, so short sentences and icons that reinforce words.
