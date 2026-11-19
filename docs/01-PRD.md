# 1. Product Requirements Document — FasalShield

| Field | Value |
|-------|-------|
| Version | 0.1 (pre-build draft) |
| Date | 2026-11-19 |
| Status | For review: tech stack and MVP scope need confirmation |
| Related | [02 Architecture](02-Technical-Architecture.md) · [03 Security](03-Security-and-Access.md) · [04 Frontend](04-Frontend-Spec.md) · [05 Tickets](05-Feature-Tickets.md) |

---

## 1. Problem

Smallholder farmers in India hold less than 2 ha, depend on monsoon rainfall, and are hit by drought and flood. Indemnity crop insurance pays slowly and unpredictably for several reasons:

- **Loss assessment is slow and costly.** Crop-cutting experiments and field surveys take weeks to months.
- **Claims are hard to file.** They need paperwork, literacy and travel.
- **Money arrives after the damage is done.** Farmers then borrow informally at high interest, sell assets or skip the next season's inputs.

**FasalShield** sells cheap parametric covers through mobile. A satellite or weather index is computed daily for each farmer's geo-tagged plot. When it crosses a predefined threshold, a payout goes automatically to the farmer's UPI wallet **within 24 hours of detection**. There is no claim form and no assessor.

## 2. Goals and non-goals

### Goals
| ID | Goal |
|----|------|
| G-1 | Pay farmers automatically within 24h of a threshold breach being detected, with zero claim paperwork. |
| G-2 | Make enrolment cheap and simple: self-serve in ≤ 7 min, or assisted by an agent in ≤ 10 min, on a low-end Android phone with a patchy connection. |
| G-3 | Let an insurer design, version and publish parametric products without engineering effort. |
| G-4 | Make every payout decision transparent, reproducible and auditable for farmers, insurers, reinsurers and regulators. |
| G-5 | Give farmers a fair route to complain when the index doesn't match their real loss (basis risk). |
| G-6 | Keep wallet, KYC, language and currency configurable so the platform can be deployed in other countries, e.g. M-Pesa in Kenya. |

### Non-goals (for this release)
- Indemnity or loss-assessed insurance, crop-cutting experiments, or claim adjusters.
- Building our own satellite processing beyond index extraction (we consume public or commercial products).
- Acting as the insurer or underwriter. FasalShield is a technology and distribution platform for a licensed insurer (see A-02).
- Integrating with the government scheme PMFBY or with state land records (Phase 3 at the earliest).
- Credit, input marketplace or advisory products (possible future cross-sell).
- An iOS-native app.

## 3. Success metrics

| ID | Metric | MVP target (pilot) | Scale target |
|----|--------|-------------------|--------------|
| M-01 | Payout latency, `TriggerEvent.detected_at` → `Payout.credited_at` (p95) | ≤ 24h | ≤ 6h |
| M-02 | Straight-through payouts (no manual step other than batch approval) | ≥ 90% | ≥ 98% |
| M-03 | First-attempt payout success rate | ≥ 95% | ≥ 98% |
| M-04 | Enrolment cost per farmer (assisted / self) | ≤ ₹80 / ≤ ₹20 | ≤ ₹40 / ≤ ₹8 |
| M-05 | Median enrolment time (self / assisted) | ≤ 7 / ≤ 10 min | ≤ 5 / ≤ 7 min |
| M-06 | Loss ratio (claims paid ÷ net premium), 3-season rolling | Tracked only | 60–85% band |
| M-07 | Basis-risk grievances per 1,000 policies in triggered seasons | Tracked only | < 30 |
| M-08 | Notification delivered within 15 min of event | ≥ 95% | ≥ 99% |
| M-09 | Index data freshness (observation → `IndexReading` available) for the rainfall index | ≤ 48h | ≤ 24h |
| M-10 | Season-on-season renewal rate | Tracked only | ≥ 50% |
| M-11 | Duplicate or fraudulent enrolments caught before policy issue | Tracked only | ≥ 90% of confirmed cases |

## 4. Personas

These personas are fictional and composite.

| ID | Persona | Context | Needs | Frustrations |
|----|---------|---------|-------|--------------|
| P-1 | **Savita, smallholder farmer** (Latur, Maharashtra) | 1.5 acres of rain-fed soybean. Owns an Android Go phone (1 GB RAM) on 2G/3G and speaks Marathi. Reads a little and uses UPI for small payments. | Cheap cover, money quickly after a bad monsoon, information in their own language, and trust. | Has been told about "insurance" before but never got paid. Forms are confusing. Data packs are limited. |
| P-2 | **Arjun, field agent** | Field coordinator for an FPO with 800 members. Visits villages on a motorbike, often with no connectivity. | Fast assisted enrolment, offline capture, bulk upload, and being able to see which farmers are pending. | Re-entering the same data, failing uploads, and not knowing why an enrolment was rejected. |
| P-3 | **FPO manager** | Runs the cooperative. Pays premiums for some members out of a grant. | Bulk enrolment, a combined premium payment, and a member coverage report. | Reconciling who is covered. |
| P-4 | **Neha, insurer product manager / actuary** | Designs index products and prices them against historical data. | A product builder, backtesting against 20+ years of data, versioning, and an exposure view. | Products locked in spreadsheets, and IT tickets for every threshold change. |
| P-5 | **Claims ops (maker) and payout approver (checker)** | Insurer operations team. | A clear queue, evidence per trigger, one-click batch approval, and reconciliation. | Manual Excel reconciliations and late-night approvals. |
| P-6 | **Reinsurer analyst** | Holds a quota share on the portfolio. | Aggregated exposure by district and peril, accumulation, and the claims trend. | Monthly PDFs that are already out of date. |
| P-7 | **Regulator inspector** | Supervisory review. | An immutable audit trail, product filings, grievance statistics and payout timeliness. | Opaque algorithms. |

## 5. User journeys

### J-1 Farmer self-enrolment and policy purchase (P-1)
1. Installs the PWA from an SMS link or WhatsApp (or opens it via a QR code at the FPO office).
2. Chooses a language (with icon and voice prompts) → enters phone number → enters OTP.
3. Hears and reads the consent notice → gives consent (recorded with version, language and timestamp).
4. Enters name and village, and optionally completes eKYC (DigiLocker) or uploads an ID photo.
5. Adds a plot: "Stand in your field" → GPS pin captured (accuracy shown). Can optionally walk or draw the boundary.
6. Picks a crop (icon grid) and season (pre-selected to the upcoming one).
7. Sees available covers with a plain-language explanation and an illustrative payout ("If rain is 40% below normal during the growing phase, you get ₹1,500. The most you can get is ₹15,000").
8. Pays the premium by UPI intent (or the FPO pays it).
9. Receives the policy by SMS or WhatsApp, and the policy appears on the Home screen.
10. During the season, gets risk alerts and can see a "rain meter" gauge for their plot.
11. Threshold breached → payout credited → SMS, WhatsApp and push in their language: "₹1,500 sent to your UPI. Reason: rain 53% below normal (16 Jul–20 Aug)."

### J-2 Assisted and bulk enrolment (P-2, P-3)
1. The agent logs in (OTP + PIN; the device is registered).
2. Works offline in the village: searches the farmer by phone, or creates a new one.
3. Captures consent: the farmer hears the notice and the agent records an OTP or thumb-mark photo as evidence.
4. Captures KYC photos, plot GPS (while standing in the field) and crop.
5. The record is queued locally and syncs automatically when the network returns. Conflicts and rejections are shown with reasons.
6. Alternatively, the FPO manager uploads a CSV of up to 5,000 farmers. The system validates it and returns an error report, then creates draft policies.
7. Premium is paid by the farmer (UPI link sent by SMS) or by the FPO as a combined payment.

### J-3 Product design and publishing (P-4)
1. Creates a product: peril, index type, data source, coverage window (phases), slabs, premium rate, sum insured, eligible geography, crops and enrolment cut-off.
2. Runs a backtest: the payout frequency and burn cost per cell over historical years are shown.
3. Submits it for approval. A second `PRODUCT_MANAGER` or `SYS_ADMIN` approves (four-eyes), and an immutable `ProductVersion` is published.
4. The product becomes visible to farmers in eligible districts during the enrolment window.

### J-4 Trigger to payout (system, P-5)
1. Data is ingested daily and indices are computed per grid cell.
2. The trigger engine evaluates every active policy and creates a `TriggerEvent` with evidence.
3. The fraud and risk check runs. Clean events go into an auto-generated `PayoutBatch`; flagged events go to review.
4. `CLAIMS_OPS` reviews the batch and submits it; `PAYOUT_APPROVER` approves it with step-up MFA. Batches below the auto-approval limit are approved by policy, but both actions are still logged.
5. The payout engine disburses through the gateway, then retries, reconciles and notifies.
6. SLA timers raise alerts at 12h and 20h if money hasn't been credited.

### J-5 Basis-risk grievance (P-1, P-5)
1. The farmer taps "My crop was damaged but no payment" and records a voice note or photo.
2. A ticket is created with an SLA, and the farmer's index values and nearby cells are attached automatically.
3. Ops reviews it. Possible outcomes: explain the index; correct the plot mapping (wrong cell); flag a data quality issue for re-evaluation; or escalate to an ex-gratia committee (an insurer decision outside the parametric terms).
4. The farmer is notified of the outcome and given an escalation path (insurer grievance officer, then Bima Bharosa / Ombudsman, to be verified).

### J-6 Oversight (P-6, P-7)
1. Logs in with MFA to a read-only portal.
2. Views exposure by district, peril and product; loss ratio; and payout latency distribution.
3. Opens any `TriggerEvent` to see its evidence snapshot, rule version and hash-chain verification status.
4. Exports reports (CSV/PDF). Every export is logged.

## 6. Functional requirements

Priority: **P0** is required for the MVP demo. **P1** is for the MVP pilot. **P2** is for a later phase.

### 6.1 Onboarding and identity
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Phone-number login with SMS OTP, plus device binding and silent re-login using a refresh token. | P0 |
| FR-02 | Language picker at first launch. MVP: English, Hindi, Marathi, Telugu. All UI strings externalised. Voice prompts on key screens. | P0 |
| FR-03 | Consent capture (DPDP): a purpose-specific notice in the chosen language, with notice version, timestamp and channel recorded. Withdrawal is supported. | P0 |
| FR-04 | Farmer KYC: name, gender (optional), year of birth, village/district, and ID-document photo. eKYC via DigiLocker or Aadhaar offline XML through a licensed partner in Phase 2 (mocked in the MVP). | P0 (basic) / P2 (eKYC) |
| FR-05 | Wallet linking: UPI VPA with name validation (mocked in the MVP). Bank account + IFSC as a fallback (Phase 2). A cooling-off period applies when the wallet changes. | P0 |
| FR-06 | Plot registration: GPS pin with accuracy, plus optional boundary polygon (walk or draw) and area estimate. Several plots per farmer. | P0 (pin) / P1 (polygon) |
| FR-07 | Crop and season selection from a configurable catalogue (icon + local name). | P0 |
| FR-08 | Agent-assisted enrolment with offline capture and background sync. | P0 (online) / P1 (offline) |
| FR-09 | Bulk enrolment by CSV upload (FPO) with validation report and draft policies. | P1 |
| FR-10 | IVR/SMS fallback: missed-call enrolment interest, an SMS keyword for policy status, and an IVR payout status line. | P2 |

### 6.2 Product engine
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-11 | Product builder: peril, index type (`DROUGHT_RAIN_DEFICIT`, `DROUGHT_SOIL_MOISTURE`, `DROUGHT_NDVI`, `FLOOD_EXCESS_RAIN`, `FLOOD_SAR_EXTENT`), data source, coverage phases (date windows), aggregation (sum, mean, max, rolling-n-day), slabs (threshold → payout %), premium rate, SI, eligible districts, crops and enrolment cut-off. | P0 |
| FR-12 | Product versioning: published `ProductVersion` records are immutable, with a content hash. Four-eyes approval is required to publish, and a new version is required to change anything. | P0 |
| FR-13 | Premium quote: given a plot, crop, season and product, return premium, subsidy, net payable and illustrative payouts. | P0 |
| FR-14 | Premium collection via UPI intent or collect, an FPO combined payment, or a sponsor or subsidy split (sandbox in the MVP). | P0 |
| FR-15 | Policy issuance: unique policy number, PDF certificate, SMS/WhatsApp confirmation, and a waiting period before cover starts (e.g. 7 days). | P0 |
| FR-16 | Backtest: run a product against historical index data and show trigger frequency, burn cost and the worst years per cell or district. | P1 |

### 6.3 Data ingestion
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-17 | Scheduled connectors per `DataSource` (CHIRPS, GPM IMERG Early, NASA SMAP, Sentinel-1 SAR, Sentinel-2 NDVI, IMD gridded) with a cadence and latency set per source. | P1 (one real source) / P2 (all) |
| FR-18 | Normalise every source to the canonical 0.05° grid (`GridCell`). Store per-cell daily `IndexReading` values with `source_version` and lineage to the raw file checksum. | P0 |
| FR-19 | Map each `Plot` to a `GridCell` (centroid in MVP; area-weighted for multi-cell polygons in Phase 2). | P0 |
| FR-20 | Data-quality checks: missing tiles, out-of-range values, sudden jumps, and cloud cover above a threshold (NDVI). Bad data is quarantined and never used for triggers. | P1 |
| FR-21 | **Weather simulator** (demo): admin uploads or creates synthetic `IndexReading` series per cell or region ("simulate a 50% deficit in Latur"). These are tagged `source=SIMULATOR` and blocked in production. | P0 |

### 6.4 Trigger engine
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-22 | Daily evaluation of every active policy against its `ProductVersion` rules, run after ingestion completes, plus an on-demand re-run. | P0 |
| FR-23 | On a threshold breach, create a `TriggerEvent` containing: policy, peril, phase, slab, index value, threshold, readings used, rule version hash, engine code version, and a SHA-256 evidence snapshot stored in WORM storage. | P0 |
| FR-24 | Partial payouts by slab. Payouts are cumulative and capped at SI per policy, and higher slabs top up earlier ones without double payment. | P0 |
| FR-25 | Risk alerts when the index is within a configurable margin of a threshold ("Rain is 30% below normal; payout starts at 40%"). | P1 |
| FR-26 | Event routing: auto-approve the event when it has no fraud flags and is under the auto limit; otherwise hold it for review. | P0 |

### 6.5 Payout engine
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-27 | Auto-create `PayoutBatch` records (hourly, or when N events are reached) grouped by product and region. | P0 |
| FR-28 | Maker-checker approval: `CLAIMS_OPS` submits and a different user with `PAYOUT_APPROVER` approves using step-up MFA. Batches under a configured limit (e.g. ₹5 lakh total and ₹10,000 per payout) may be auto-approved by policy. | P0 |
| FR-29 | Disbursement through a payment gateway to UPI VPA (fallback IMPS to bank). Idempotent per `Payout` (`idempotency_key`). | P0 (sandbox) |
| FR-30 | Retry policy: exponential backoff for retryable errors. Non-retryable errors (invalid VPA, closed account) move the payout to `ACTION_REQUIRED` and ask the farmer or agent to update the wallet. | P0 |
| FR-31 | Reconciliation: match gateway webhooks, status polling and settlement reports against `Payout` records, and flag mismatches. | P1 |
| FR-32 | SLA tracking: alert ops at 12h and 20h, and breach at 24h. SLA dashboard. | P0 |

### 6.6 Notifications
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-33 | Templated notifications in the farmer's language over SMS, WhatsApp, push and in-app inbox for: enrolment confirmed, premium received, policy issued, cover started, risk alert, payout sent, payout failed (action needed), and grievance update. | P0 (SMS + in-app) / P1 (WhatsApp, push) |
| FR-34 | Channel fallback (push → WhatsApp → SMS) and delivery receipts stored per `Notification`. | P1 |

### 6.7 Admin, reporting and oversight
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-35 | Live trigger map: grid cells coloured by index value or status, with policies and events overlaid and filters by product, peril and date. | P0 |
| FR-36 | Portfolio dashboards: active policies, SI exposure, premium written, claims paid, loss ratio, and payout latency by district, product and peril. | P1 |
| FR-37 | Payout approval queue with batch drill-down to evidence. | P0 |
| FR-38 | Fraud flags queue: flagged enrolments and payouts, with reasons, actions (clear, reject, escalate) and a required note. | P1 |
| FR-39 | Audit log viewer: filter by actor, entity and action, with hash-chain verification. | P1 |
| FR-40 | Report exports (CSV/PDF) in a regulator report pack. | P2 |
| FR-41 | Read-only reinsurer and regulator portal (scoped dashboards and audit). | P1 |
| FR-42 | User and role management for staff accounts, with an MFA requirement. | P0 |

### 6.8 Farmer self-service and grievance
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-43 | Policy detail with a plot index gauge ("rain meter"), coverage phases, a payout history timeline, and a downloadable certificate. | P0 |
| FR-44 | Basis-risk grievance: submit with category, voice note (≤ 60 s), photos and description. Index evidence is attached automatically. | P1 |
| FR-45 | Grievance triage and resolution workflow with SLA. Outcomes: explained, plot remapped, data re-evaluated, or escalated to ex-gratia. The farmer is notified. | P1 |
| FR-46 | Agent dashboard: farmers onboarded, pending sync, policies by status, payouts to their farmers, and their own fraud-flag rate. | P1 |

## 7. Non-functional requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Payout latency | p95 ≤ 24h from detection to credit (M-01). Trigger evaluation completes ≤ 2h after ingestion. Disbursement starts ≤ 5 min after batch approval. |
| NFR-02 | API performance | Read p95 ≤ 300 ms, write p95 ≤ 600 ms at 200 RPS (MVP). Farmer home screen payload ≤ 30 KB. |
| NFR-03 | Availability | Farmer and agent APIs: 99.5%. Payout path (workers + gateway integration): 99.9%. Planned maintenance happens outside 06:00–22:00 IST. |
| NFR-04 | Offline support | The agent app works fully offline for enrolment (≥ 200 queued records, ≥ 7 days). The farmer app shows cached policy, payout and last-known index offline. Sync is idempotent (client-generated UUIDs). |
| NFR-05 | Low-end devices | Android 8+ Chrome / WebView, 1 GB RAM, 360×640 viewport. Budget: farmer PWA initial JS ≤ 150 KB gzip (see Frontend Spec §6). |
| NFR-06 | Network | Usable on 2G/3G (≤ 400 kbps, 400 ms RTT). TTI ≤ 5 s on slow 3G for the home screen. All requests resumable or retryable. |
| NFR-07 | Localisation | All strings in i18n bundles, with ICU plurals and the Indian number format (₹1,23,456). Fonts for Devanagari and Telugu (Noto). Adding a language needs no code change. RTL-ready for Urdu (Phase 2). |
| NFR-08 | Scalability | Designed for 1M farmers, 2M plots and 3M policies per season. Daily evaluation of 3M policies ≤ 2h. Bursts of 200k payouts/day (regional drought). |
| NFR-09 | Security | OWASP ASVS L2. TLS 1.2+. Encryption at rest (AES-256, KMS). PII field-level encryption (see Security doc). |
| NFR-10 | Privacy | DPDP Act 2023 compliance by design: consent, purpose limitation, minimisation, retention and data principal rights. |
| NFR-11 | Auditability | Every `TriggerEvent` is reproducible from stored evidence plus the rule version. Append-only, hash-chained `AuditLog`. Evidence stored in WORM storage for ≥ 8 years (verify retention with legal). |
| NFR-12 | Observability | Structured logs, metrics and traces. SLOs and alerts for ingestion freshness, evaluation completion, payout SLA and gateway error rate. |
| NFR-13 | Configurability | Country pack: currency, wallet provider, KYC provider, languages, grid/data sources and regulatory text set through configuration and provider interfaces. |
| NFR-14 | Accessibility | WCAG 2.1 AA for all apps. The farmer app also supports voice prompts, icon-first UI and 48–56 dp touch targets. |
| NFR-15 | Resilience | RPO ≤ 15 min, RTO ≤ 4h. Daily backups with point-in-time recovery. A quarterly restore drill. |
| NFR-16 | Exactly-once payouts | At most one successful credit per `TriggerEvent` slab, enforced by DB unique constraints, idempotency keys and gateway reference IDs. |
| NFR-17 | Data residency | All personal and payment data is stored and processed in India (AWS ap-south-1 / ap-south-2). |

## 8. Release scope

| Capability | MVP (6 sprints: demo-ready at week 8, pilot-ready at week 12) | Phase 2 (pilot hardening, +3 months) | Phase 3 (scale) |
|---|---|---|---|
| Login and onboarding | OTP, 4 languages, consent, basic KYC, UPI VPA (mock validation) | DigiLocker / Aadhaar offline eKYC, bank fallback, voice prompts in all screens | IVR enrolment, 10+ languages, Urdu RTL |
| Plot | GPS pin, centroid → cell | Polygon walk or draw, area-weighted cells, geotagged photo | Land-records cross-check, cropland mask ML |
| Products | Builder, versioning, 2 perils (rain deficit drought, excess rain flood), slabs, four-eyes publish | Soil moisture, NDVI and SAR flood indices; backtest UI | Multi-peril bundles, dynamic pricing, reinsurance treaty config |
| Data | **Weather simulator** + one real source (CHIRPS or IMERG daily rainfall) | SMAP, Sentinel-1/2, IMD; data-quality quarantine | Commercial data, ground weather stations, blended indices |
| Trigger | Daily evaluation, evidence, WORM snapshot, auto/hold routing | Risk alerts, re-evaluation on data revision | Near-real-time flood triggers (≤ 6h) |
| Payout | Batches, maker-checker, **sandbox gateway**, retries, SLA timers | Live gateway, reconciliation automation, bank fallback | Multi-gateway routing, M-Pesa adapter |
| Notifications | SMS (mock or DLT sandbox) + in-app inbox | WhatsApp, push, channel fallback | IVR outbound voice |
| Agent / FPO | Assisted enrolment (online) | Offline sync, CSV bulk, FPO combined payment | Agent commissions, performance scoring |
| Admin | Trigger map, approval queue, basic dashboard, user management | Fraud queue, audit viewer, portfolio dashboards | Advanced analytics, regulator report pack |
| Grievance | — (link to call centre number) | Full grievance workflow | Ex-gratia committee workflow, community verification |
| Oversight | — | Read-only reinsurer and regulator portal | API feeds for reinsurers |

**Mocked for the demo:** weather and satellite feed (simulator), payment gateway (sandbox or mock adapter), SMS/WhatsApp (console or mock adapter, plus an optional real SMS sandbox), eKYC (mock adapter), UPI VPA validation (mock).

## 9. Assumptions

| ID | Assumption |
|----|------------|
| A-01 | App name **FasalShield** (placeholder from the brief). |
| A-02 | A licensed IRDAI general insurer underwrites the products. FasalShield is the insurer's technology platform, or a registered intermediary. Premiums settle into the insurer's account and payouts are funded from the insurer's payout account. |
| A-03 | The index is computed per 0.05° grid cell, not per plot polygon. A plot inherits the index of the cell containing its centroid (MVP). |
| A-04 | One `Policy` covers one `Plot` × one `Crop` × one `Season` × one `ProductVersion`. |
| A-05 | The 24h SLA runs from `TriggerEvent.detected_at` to `Payout.credited_at`. It does **not** include data latency from rainfall observation to data availability, which is tracked separately as M-09. |
| A-06 | Payouts use provisional data. Later revisions can create **top-ups** but never clawbacks (product rule, to be confirmed with the insurer, see Q-02). |
| A-07 | Amounts are stored as integer minor units (paise) and dates in UTC. Seasons are configured per state: Kharif (Jun–Oct), Rabi (Nov–Mar), Zaid (Mar–Jun). |
| A-08 | Premium may be partly subsidised by a sponsor (FPO, CSR or government). `PremiumPayment` supports split payers. |
| A-09 | Farmers own a basic Android smartphone, or have access to one through a family member or agent. Feature-phone users are served by agents plus SMS (IVR in Phase 2). |
| A-10 | MVP team: 5 engineers (2 backend, 1 geo/data, 2 frontend/full-stack) + 1 PM/designer, at ~45 story points per 2-week sprint. A separate 48–72h hackathon cut is defined in the ticket list (§4). |
| A-11 | Cloud: AWS Mumbai (ap-south-1) for data residency. |

## 10. Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|-----------|
| R-01 | **Basis risk**: index and real loss diverge (local hailstorm, pest, irrigation). | High | High (trust) | Finer grids, blended indices (Phase 2), grievance workflow (FR-44/45), plain-language explanation before purchase, backtesting (FR-16). |
| R-02 | **Data latency**: satellite products arrive 1–21 days late, and CHIRPS final data takes ~3 weeks. | High | Medium | Use near-real-time sources (IMERG Early ~4h, CHIRPS-prelim ~2 days) for triggers. Treat final data as top-up only (A-06). Show data freshness in the UI. |
| R-03 | **Data gaps or quality**: cloud cover (NDVI in monsoon), outages, sensor errors. | Medium | High | DQ checks and quarantine (FR-20), fallback source per product, no trigger on quarantined data, manual hold. |
| R-04 | **Regulatory**: product filing (IRDAI), intermediary licensing, DPDP, RBI payment-data localisation, Aadhaar use limits. | Medium | High | Early legal review (see Security doc §5); the insurer files products; no Aadhaar number storage. |
| R-05 | **Adverse selection**: farmers enrol once drought is already visible. | High | High | Enrolment cut-off before the coverage window, a waiting period (FR-15), and a block on enrolment for cells already in deficit. |
| R-06 | **Fraud**: fake plots, duplicates, GPS spoofing, agent collusion. | Medium | High | See Security doc §7. |
| R-07 | **Payment failures** at scale (invalid VPA, bank downtime, gateway limits). | Medium | High | VPA validation at enrolment, bank fallback, retries, multi-gateway (Phase 3), pre-funded payout account alerts. |
| R-08 | **Connectivity / device limits** block adoption. | High | Medium | PWA performance budget, offline-first agent app, SMS fallback. |
| R-09 | **Correlated losses**: one drought triggers 100k+ payouts at once (cash and ops spike). | Medium | High | Load-tested burst capacity (NFR-08), reinsurer visibility, insurer pre-funding alerts. |
| R-10 | **Trust**: farmers distrust automatic insurance. | Medium | High | FPO/agent distribution, transparent rain meter, fast first payouts in the pilot, local-language voice. |

## 11. Open questions

| ID | Question | Owner |
|----|----------|-------|
| Q-01 | Which licensed insurer partners with us, and is FasalShield an intermediary (corporate agent / IMF / web aggregator) or the insurer's tech vendor? | Business / Legal |
| Q-02 | Policy on data revisions: are top-ups allowed, and are clawbacks ever allowed? | Insurer actuary |
| Q-03 | Which pilot geography and crops? (Suggestion: 2 districts in Marathwada, soybean and cotton for Kharif.) | Business |
| Q-04 | Which payout gateway is supported? (Razorpay X, Cashfree Payouts, a bank API.) What are the UPI payout limits and the pre-funding model? | Finance |
| Q-05 | Is eKYC required by the insurer for micro-policies below a threshold SI, or is a simplified KYC acceptable? | Insurer compliance |
| Q-06 | What is the auto-approval limit for payout batches? | Insurer risk |
| Q-07 | Does the regulator or reinsurer need data feeds (API) or dashboards only? | Partners |
| Q-08 | Is premium subsidy available (state scheme, CSR), and how is it settled? | Business |
| Q-09 | Is ex-gratia for basis-risk cases in scope, and who funds it? | Insurer |
| Q-10 | Which real data source is in the MVP: IMERG Early (fast, coarser accuracy) or CHIRPS-prelim (better accuracy over India, ~2-day latency)? | Geo lead + actuary |
