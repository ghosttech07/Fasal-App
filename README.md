# FasalShield

Parametric micro-insurance for smallholder farmers. Satellite and weather indices trigger automatic payouts to UPI wallets within 24h of detection.

The product, architecture, security, frontend and ticket specs are in [`docs/`](docs/README.md). Those docs are the source of truth for names and IDs (FR-xx, NFR-xx, FS-xxxx).

## Where everything is

| Folder             | What it is                                                                  | Live at                           |
| ------------------ | --------------------------------------------------------------------------- | --------------------------------- |
| `web/`             | Next.js website: landing page, farmer app and admin portal                  | https://fasal-app-nps2.vercel.app |
| `api/`             | Express + Prisma REST API (Postgres): sign-in, covers, rain checks, payouts | https://fasal-app-pi.vercel.app   |
| `packages/shared/` | Code shared by web and api: money maths, India districts, validation        | —                                 |
| `mobile/`          | Flutter Android app (same farmer journey, native)                           | not published yet                 |
| `docs/`            | PRD (also as PDF), architecture, security, frontend spec, tickets           | —                                 |

Inside `web/`:

| Path                                                         | Screens                                                                                                    |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `public/welcome/`                                            | Landing page (static HTML)                                                                                 |
| `src/app/start`, `login`, `otp`                              | Welcome cards, terms, sign-in                                                                              |
| `src/app/setup/`                                             | About you → your field → UPI ID                                                                            |
| `src/app/cover/`                                             | Choose crop → choose cover → pay → done                                                                    |
| `src/app/page.tsx`, `policy/`, `account/`, `inbox/`, `help/` | Home, policy and rain meter, account, messages, complaints                                                 |
| `src/app/legal/`                                             | Terms of use, privacy policy, complaints and grievances                                                    |
| `src/app/admin/`                                             | Admin portal: dashboard, payouts, triggers, products, farmers, complaints, land checks, rain, audit, staff |
| `src/components/`                                            | Shared pieces (`admin/` for the portal)                                                                    |
| `src/lib/`                                                   | Sessions, API calls, formatting                                                                            |

Inside `api/src/`: `modules/` (routes per area: auth, staff, farmer, policy, admin, triggers, cron), `lib/` (auth, crypto, audit, grid), `adapters/` (SMS, payments, weather — mocks until paid services are connected), `rules/` (payout rule engine). Database schema and migrations: `api/prisma/`.

## Prerequisites

- Node.js ≥ 22 (npm ≥ 10)
- Flutter SDK (stable) + Android Studio / Android SDK + an emulator
- Docker Desktop (from Part 1.4)

## Getting started

```bash
cp .env.example .env      # then replace the "replace-with-..." secrets
npm install
npm run build             # builds packages/shared
npm run check             # format check + lint + typecheck + tests
```

## Scripts (root)

| Script                                | Does                                                 |
| ------------------------------------- | ---------------------------------------------------- |
| `npm run build`                       | Build all workspaces (Turborepo, dependency-ordered) |
| `npm run dev`                         | Run all dev servers                                  |
| `npm run lint` / `typecheck` / `test` | Per-workspace via Turborepo                          |
| `npm run format` / `format:check`     | Prettier                                             |
| `npm run check`                       | Everything CI runs                                   |
