# FasalShield

Parametric micro-insurance for smallholder farmers. Satellite and weather indices trigger automatic payouts to UPI wallets within 24h of detection.

The product, architecture, security, frontend and ticket specs are in [`docs/`](docs/README.md). Those docs are the source of truth for names and IDs (FR-xx, NFR-xx, FS-xxxx).

## Workspace layout

| Path              | What                                                         | Built in   |
| ----------------- | ------------------------------------------------------------ | ---------- |
| `mobile`          | Flutter app (Farmer + Agent roles) - not an npm workspace    | Part 0.3 → |
| `api`             | NestJS REST API + BullMQ workers (Prisma, PostGIS)           | Part 1.4 → |
| `admin`           | React + Vite admin dashboard                                 | Part 9.1 → |
| `packages/shared` | Shared TS constants, zod schemas, env validation (api+admin) | Done       |
| `docs`            | PRD, architecture, security, frontend spec, tickets          | Done       |

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
