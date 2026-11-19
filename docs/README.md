# FasalShield — Pre-Build Documentation Pack

> Parametric micro-insurance for smallholder farmers. Satellite and weather indices trigger automatic payouts to mobile wallets within 24 hours of detection.

| # | Document | What it answers |
|---|----------|-----------------|
| 1 | [01-PRD.md](01-PRD.md) | What we are building, for whom, and how we measure success (FR-xx, NFR-xx, M-xx, R-xx, Q-xx) |
| 2 | [02-Technical-Architecture.md](02-Technical-Architecture.md) | How it is built: components, data model, pipelines, APIs, integrations, ops |
| 3 | [03-Security-and-Access.md](03-Security-and-Access.md) | Who can do what, how data is protected, fraud controls, threat model |
| 4 | [04-Frontend-Spec.md](04-Frontend-Spec.md) | Sitemaps, screen-by-screen specs (F-xx, A-xx, AD-xx), design tokens, flows |
| 5 | [05-Feature-Tickets.md](05-Feature-Tickets.md) | Epics → stories → tasks (FS-xxxx), MVP marking, sprint plan |

---

## ID conventions (used in all five documents)

| Prefix | Meaning | Example |
|--------|---------|---------|
| `FR-xx` | Functional requirement | FR-21 Daily index evaluation |
| `NFR-xx` | Non-functional requirement | NFR-01 Payout latency ≤ 24h |
| `M-xx` | Success metric | M-01 p95 detection→credit |
| `R-xx` | Risk | R-01 Basis risk |
| `A-xx` (in PRD §9) | Assumption | A-03 Grid-cell index |
| `Q-xx` | Open question | Q-02 Data revisions |
| `F-xx` / `A-xx` / `AD-xx` / `RG-xx` | Screens: Farmer / Agent / Admin / Regulator-Reinsurer | F-08 Add plot |
| `EP-xx` | Epic | EP-07 Trigger engine |
| `FS-eess` | Story (epic `ee`, story `ss`) | FS-0703 |
| `FS-eess-Tn` | Task under a story | FS-0703-T2 |
| `TH-xx` | Threat (STRIDE) | TH-05 Webhook spoofing |
| `FRD-xx` | Fraud scenario | FRD-03 GPS spoofing |

> Note: screen IDs for the Agent app use `AG-xx` to avoid clashing with assumption IDs `A-xx`.

## Canonical names

**Entities:** `Farmer`, `Agent`, `Organisation` (insurer, FPO, reinsurer, regulator), `User` (staff accounts), `Plot`, `GridCell`, `Crop`, `Season`, `Product`, `ProductVersion`, `Policy`, `PremiumPayment`, `Wallet`, `DataSource`, `IngestionRun`, `IndexReading`, `TriggerEvent`, `PayoutBatch`, `Payout`, `PayoutAttempt`, `Notification`, `Grievance`, `FraudFlag`, `Consent`, `AuditLog`.

**Roles:** `FARMER`, `AGENT`, `FPO_ADMIN`, `PRODUCT_MANAGER`, `CLAIMS_OPS` (payout maker), `PAYOUT_APPROVER` (payout checker), `SYS_ADMIN`, `REINSURER` (read-only), `REGULATOR` (read-only).

**Perils / index types:** `DROUGHT_RAIN_DEFICIT`, `DROUGHT_SOIL_MOISTURE`, `DROUGHT_NDVI`, `FLOOD_EXCESS_RAIN`, `FLOOD_SAR_EXTENT`.

## Glossary

| Term | Meaning |
|------|---------|
| Parametric insurance | Insurance that pays a pre-agreed amount when a measured index crosses a threshold. No loss assessment is done. |
| Index | A number computed from weather or satellite data for a grid cell and time window, e.g. the % rainfall deficit against the long-term mean over 30 days. |
| Slab | A threshold band that maps an index value to a payout % of the sum insured. |
| Basis risk | The farmer suffers a loss but the index doesn't trigger, or the reverse. |
| Grid cell | A 0.05° × 0.05° (~5.5 km) square aligned to the CHIRPS grid. All indices are computed per cell. |
| FPO | Farmer Producer Organisation (a cooperative). |
| SI | Sum insured: the maximum payout per policy. |
| Detection | The moment the trigger engine records a `TriggerEvent`. The 24h SLA clock starts here. |
| Maker-checker | Two different people are required: one prepares and one approves. |

## Ready-to-Build checklist

See the end of [05-Feature-Tickets.md](05-Feature-Tickets.md#ready-to-build-checklist).
