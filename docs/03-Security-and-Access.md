# 3. Security & Access Document — FasalShield

| Field | Value |
|-------|-------|
| Version | 0.1 (pre-build draft) |
| Implements | NFR-09, NFR-10, NFR-11, NFR-16, NFR-17; FR-01, FR-03, FR-12, FR-28, FR-38, FR-39, FR-42 |
| Baseline | OWASP ASVS 4.0 Level 2, OWASP Mobile Top 10 (PWA), OWASP API Security Top 10 (2023) |

> ⚖️ **Legal disclaimer:** §5 lists compliance considerations as an engineering checklist. It is **not legal advice**. Every item must be verified by a qualified Indian legal and compliance professional, and by the partner insurer's compliance team, before launch.

---

## 1. Roles

| Role | Who | Org type | Data scope |
|------|-----|----------|------------|
| `FARMER` | Policyholder | — | Own records only |
| `AGENT` | Field agent | FPO | Farmers they onboarded or are assigned to |
| `FPO_ADMIN` | FPO manager | FPO | All farmers in their FPO |
| `PRODUCT_MANAGER` | Insurer actuary / product | INSURER | Products of their insurer; aggregate data |
| `CLAIMS_OPS` | Insurer operations (**maker**) | INSURER | Policies, triggers, payouts and grievances of their insurer |
| `PAYOUT_APPROVER` | Insurer finance / claims head (**checker**) | INSURER | Same as `CLAIMS_OPS`, read + approve |
| `SYS_ADMIN` | Platform admin | PLATFORM | Configuration, users and data sources. **No payout approval.** PII access is break-glass only. |
| `REINSURER` | Reinsurer analyst | REINSURER | Aggregated portfolio for the treaties they participate in. **No farmer-level PII.** |
| `REGULATOR` | Supervisory inspector | REGULATOR | Read-only on everything, PII masked by default, unmask with a logged justification |

Separation-of-duties rules (enforced in code and checked in tests):
- **SoD-1:** The user who submits a `PayoutBatch` cannot approve it.
- **SoD-2:** The user who authors a `ProductVersion` cannot publish it.
- **SoD-3:** `SYS_ADMIN` cannot hold `PAYOUT_APPROVER` or `CLAIMS_OPS`, and cannot assign roles to themself.
- **SoD-4:** An `AGENT` cannot change the wallet of a farmer they onboarded within 30 days of a payout without farmer OTP confirmation.

## 2. RBAC matrix (role × resource × action)

Legend: **C** create · **R** read · **U** update · **D** delete/withdraw · **S** submit · **A** approve/publish · **X** export · scope suffix: `o` own, `a` assigned, `g` org, `*` all, `m` masked PII, `agg` aggregated only · `—` no access

| Resource | FARMER | AGENT | FPO_ADMIN | PRODUCT_MANAGER | CLAIMS_OPS | PAYOUT_APPROVER | SYS_ADMIN | REINSURER | REGULATOR |
|---|---|---|---|---|---|---|---|---|---|
| Farmer profile | R U (o) | C R U (a) | C R U (g) | R (agg) | R (g, m) | R (g, m) | R (m; break-glass full) | — | R (*, m) |
| Consent | C R D (o) | C R (a) | R (g) | — | R (g) | — | R | — | R (*) |
| KYC documents | C R (o) | C R (a) | R (g) | — | R (g) | — | — | — | R (justified) |
| Wallet | C R U (o, OTP) | C R (a); U with farmer OTP | R (g, m) | — | R (g, m) | R (g, m) | — | — | R (*, m) |
| Plot | C R U (o) | C R U (a) | R U (g) | R (agg) | R U (g) verification | R (g) | R | R (agg) | R (*) |
| Product / ProductVersion | R (eligible active) | R (eligible active) | R (active) | C R U S A* (*A only if not author) | R | R | R A* (SoD-2) | R (treaty) | R (*) |
| Backtest | — | — | — | C R | R | R | R | R (agg) | R |
| Quote / Policy | C R (o) | C R (a) | C R (g) | R (agg) | R U (cancel) (g) | R (g) | R | R (agg) | R (*) |
| Premium payment | C R (o) | C R (a) | C R (g, combined) | R (agg) | R (g) | R (g) | R | R (agg) | R (*) |
| Data source / IngestionRun | — | — | — | R | R | R | C R U | R (agg) | R |
| Simulator scenario (non-prod) | — | — | — | C R | — | — | C R | — | — |
| IndexReading / map | R (own cell) | R (assigned cells) | R (g cells) | R | R | R | R | R | R |
| TriggerEvent + evidence | R (o, simplified) | R (a) | R (g) | R | R U (release/reject held) | R | R | R (agg) | R (*) |
| Evaluation re-run | — | — | — | — | C | — | C | — | — |
| PayoutBatch | — | — | — | — | C R S | R A (SoD-1, step-up) | R | R (agg) | R (*) |
| Payout | R (o) | R (a) | R (g) | R (agg) | R U (retry) | R | R | R (agg) | R (*) |
| Reconciliation | — | — | — | — | R U (resolve) | R | R | — | R |
| Notification / inbox | R (o) | R (a, sent to farmers) | R (g) | — | R | — | R | — | R |
| Grievance | C R (o) | C R (a) | R (g) | R | R U (resolve) | R | R | R (agg stats) | R (*) |
| FraudFlag | — | — | — | — | R U | R | R | — | R |
| Portfolio reports | — | R (own stats) | R X (g) | R X | R X | R X | R | R X (agg) | R X |
| AuditLog | — | — | — | — | R (own actions) | R (own actions) | R + verify | — | R + verify |
| Staff users and roles | — | — | C R U (agents of g) | — | — | — | C R U D (SoD-3) | — | — |
| System config / flags | — | — | — | — | — | — | R U (step-up) | — | R |

**Implementation:** NestJS guards take a `@Roles()` decorator plus a **policy layer** (CASL-style `can(action, subject, conditions)`) that injects row-level scope (`org_id`, `assigned_agent_id`, `farmer_id`) into every repository query. PostgreSQL Row-Level Security on the PII tables (`farmer`, `wallet`, `plot`) acts as defence in depth, using `SET app.org_id`/`app.role` per transaction.

## 3. Authentication and session strategy

### 3.1 Farmers (FR-01)
| Control | Setting |
|---|---|
| Factor | SMS OTP (6 digits) to the registered phone. WhatsApp OTP as an alternative (Phase 2). |
| OTP lifetime / attempts | 5 min TTL. Max 3 verify attempts per OTP. Max 5 OTP requests per phone per hour and 10 per day. Max 20 per IP per hour. Exponential cooldown. |
| OTP storage | Store only an HMAC of the OTP; constant-time compare; single use. |
| Device binding | The PWA generates a device key pair (WebCrypto, non-extractable) on first login. The public key is registered with the session, and refresh requests are signed with it. |
| Tokens | Access JWT (ES256, 15 min, claims: `sub`, `role`, `scope`, `deviceId`). Refresh token is opaque (30 days, **rotating**, reuse detection revokes the whole family), stored in an `HttpOnly; Secure; SameSite=Strict` cookie scoped to `/api/v1/auth`. |
| Offline | Cached read-only data is available without a valid token. No mutations are queued for farmers except grievance drafts. |
| Sensitive actions | Wallet change, primary-wallet switch and consent withdrawal need a fresh OTP. A wallet change starts a **72h cooling-off** before payouts can go to the new wallet. |
| SIM-swap risk | Phase 2: check telecom SIM-swap age via a provider API before wallet change and first payout. |

### 3.2 Agents
OTP login plus a 6-digit **app PIN** (PBKDF2-hashed locally) to unlock the offline cache. Device registration requires FPO_ADMIN approval, with at most 2 active devices. The access token lasts 15 min and the refresh token 7 days. The offline data store (IndexedDB) is encrypted with a key derived from the PIN plus a server-provided wrapping key that rotates on every login. The data is wiped after 10 failed PINs or 14 days without a sync.

### 3.3 Staff (insurer, platform, reinsurer, regulator)
| Control | Setting |
|---|---|
| Primary | SSO via OIDC (insurer's IdP, e.g. Azure AD / Google Workspace) **or** email + password (Argon2id, min 12 chars, breached-password check). |
| MFA | **Mandatory.** WebAuthn/passkeys preferred, TOTP as fallback. No SMS MFA for staff. |
| Step-up | Re-authentication with WebAuthn/TOTP is required within 5 min for: batch approve, product publish, role changes, config changes, PII unmask and bulk export. Issues a single-use `stepUpToken` bound to the action and resource ID. |
| Session | Access JWT 10 min, refresh 8h absolute, 30 min idle timeout. Cookie-based (`HttpOnly`, `Secure`, `SameSite=Strict`) plus a CSRF token. |
| Network | Admin app served on a separate hostname. `REGULATOR` and `REINSURER` access optionally limited by IP allowlist. Prod `SYS_ADMIN` actions only from a VPN/ZTNA (Phase 2). |
| Lifecycle | Joiner/mover/leaver workflow, quarterly access recertification, auto-disable after 45 days inactive. |

### 3.4 Service-to-service
Workers use IAM task roles. Callbacks from the geo-worker go into the queue, not the API. Webhooks from providers are HMAC-verified (see §6). There are no long-lived static keys in code.

## 4. Data protection

### 4.1 Data classification

| Class | Examples | Controls |
|---|---|---|
| **C1 – Sensitive personal** | ID document images, KYC data, bank account / VPA, voice notes, precise plot location linked to a person | Field-level envelope encryption (KMS CMK + per-record data key). Access only through scoped APIs. Masking by default. Every read of a decrypted field is audit-logged. |
| **C2 – Personal** | Name, phone, village, policy details, payout history | Encrypted at rest (RDS/KMS). Masked in logs. RBAC scope. |
| **C3 – Confidential business** | Product rules before publication, pricing, portfolio exposure | RBAC; reinsurer sees treaty scope only |
| **C4 – Public / derived** | Grid-cell index values, published product terms | Integrity controls (hash) |

### 4.2 Specific rules
- **Aadhaar:** Never collect or store the full Aadhaar number unless done via an authorised entity and permitted by law. Prefer DigiLocker or offline e-KYC XML through a licensed partner. Store only the reference ID, last 4 digits and a peppered hash for deduplication (verify this is allowed).
- **Location data:** Plot coordinates are C1 when linked to a farmer. Exports to reinsurers and regulators aggregate to grid cell or district. Public maps show cells, never plots.
- **Encryption in transit:** TLS 1.2+ (TLS 1.3 preferred), HSTS with preload, and certificate pinning in the Phase-2 wrapped app. Internal traffic uses TLS (RDS `rds.force_ssl=1`, Redis in-transit encryption).
- **Encryption at rest:** RDS, S3, ElastiCache and EBS encrypted with KMS CMKs. Key rotation is annual (automatic). Separate CMKs for PII and evidence.
- **Logging hygiene:** Redaction middleware removes OTPs, tokens, full VPAs and names. Gateway payloads are stored redacted in `PayoutAttempt`.
- **Uploads:** Presigned S3 PUT (5 min, content-type and size locked: images ≤ 2 MB, audio ≤ 1 MB). Malware scan (ClamAV Lambda). EXIF retained server-side for fraud checks and stripped for any re-display.

### 4.3 Consent capture (FR-03)
- A purpose-specific notice in the farmer's language (text plus audio). Purposes: `INSURANCE_SERVICING` (required to get a policy), `DATA_SHARING_REINSURER` (aggregated; required by the insurer if part of the contract), `MARKETING` (optional, off by default).
- Stored in `Consent` with `notice_version`, `language`, `channel`, timestamp, and for agent-assisted consent an evidence reference (farmer OTP on their phone, or a thumbprint photo plus agent declaration).
- Withdrawal is as easy as giving consent: one tap plus OTP. The consequences are explained (an active policy can still be serviced for the legal and contract period).

### 4.4 Retention (proposed, to be verified)

| Data | Retention | Reason |
|---|---|---|
| Policy, premium, payout, trigger evidence | Policy end + **8 years** (verify against IRDAI record-keeping rules) | Insurance and regulatory records |
| AuditLog + evidence (WORM) | 8 years, Object Lock compliance mode | Tamper-evidence |
| KYC images | Policy end + statutory period; minimise afterwards | KYC / AML rules apply to the insurer |
| OTP records | 24h (hash only) | Security |
| Application logs | 180 days, stored in India | CERT-In 2022 directions |
| Leads that never became a policy | 12 months, then delete | DPDP purpose limitation |
| Voice notes / grievance photos | Grievance closure + 3 years | Dispute resolution |

Deletion requests (DPDP right to erasure) are fulfilled except where retention is legally required. In that case the data is restricted and later deleted by a scheduled job.

## 5. Compliance considerations (verify with legal)

| Area | Consideration | Design response |
|---|---|---|
| **DPDP Act 2023 + DPDP Rules 2025** | Consent and notice in plain language (Eighth Schedule languages available); purpose limitation; data principal rights (access, correction, erasure, grievance, nomination); breach notification to the Data Protection Board and affected users; possible *Significant Data Fiduciary* obligations (DPO, DPIA, audits) given the scale and sensitivity. The Rules have a phased commencement. | Consent module, rights endpoints (export my data, correct, erase), a DPIA before pilot, an incident runbook with breach notification steps, and a named grievance officer in the app. |
| **IRDAI** | Product approval or filing (parametric / weather index products under current product regulations; micro-insurance rules); who may distribute (insurer, corporate agent, insurance marketing firm, web aggregator); Protection of Policyholders' Interests regulations (disclosures, grievance redressal timelines); outsourcing and IT/cybersecurity guidelines for insurers (applies to us as a vendor); data must be stored in India. | The insurer files products; `ProductVersion` maps to the filed product UIN; mandatory disclosures and key feature document in local languages; grievance SLAs configurable; vendor security audit support. |
| **RBI / NPCI** | Storage of payment system data only in India (2018 directive); premium collection through RBI-authorised payment aggregators; UPI and payout limits and NPCI rules; no pooling of funds by an unregulated entity. | Use licensed PA/gateway; FasalShield never holds funds (premiums and payouts flow insurer ↔ gateway ↔ farmer); payment data in ap-south-1. |
| **Aadhaar Act / UIDAI** | Only authorised entities (AUA/KUA) may authenticate; restrictions on storing Aadhaar numbers; Aadhaar must not be mandatory where not legally required. | Optional eKYC via a licensed partner; alternate ID documents accepted; no raw Aadhaar stored. |
| **CERT-In Directions (2022)** | Report specified cyber incidents within 6 hours; keep logs for 180 days in India; NTP sync. | Logging pipeline, incident response runbook, time sync. |
| **TRAI TCCCPR (DLT)** | Commercial SMS needs a registered header and templates; consent for promotional messages. | Templates registered per language; transactional versus promotional categories separated. |
| **IT Act 2000 / SPDI Rules** | Reasonable security practices (ISO 27001 equivalent). | ISMS controls, annual pen-test. |
| **Accessibility** | RPwD Act 2016 and GIGW guidelines (if any government partnership). | WCAG 2.1 AA (NFR-14). |
| **Other countries** | Kenya Data Protection Act 2019, Insurance Regulatory Authority rules, CBK mobile money rules. | Country pack (NFR-13). |

## 6. Payment security

| Control | Detail |
|---|---|
| **Maker-checker** (FR-28) | `CLAIMS_OPS` submits and `PAYOUT_APPROVER` approves with step-up MFA. SoD-1 is enforced server-side. The approval records approver, timestamp, batch hash (hash of sorted payout IDs + amounts + wallet IDs) and the evidence hashes reviewed. If the batch content changes after submission, the approval is invalidated. |
| **Auto-approval policy** | Only when **all** of these hold: batch total ≤ ₹5,00,000 (configurable), each payout ≤ ₹10,000, no open fraud flags, the wallet has been verified for > 7 days, and the trigger source is not `SIMULATOR`. The system actor is logged as approver along with the policy version used. |
| **Limits** | Per-payout cap = remaining SI of the policy (DB CHECK). Daily platform cap per insurer (circuit breaker, needs `PAYOUT_APPROVER` + `SYS_ADMIN` dual approval to lift). Velocity limits per wallet (max 3 payouts per day and at most 1 farmer per VPA unless whitelisted, e.g. a family). |
| **Beneficiary integrity** | Payouts go only to the farmer's **primary verified wallet**, with name-match scoring between KYC name and VPA-registered name (threshold, otherwise `HELD`). A 72h cooling-off after a wallet change. The wallet ID is snapshotted on the `Payout` at batch creation. |
| **Signed webhooks** | Verify HMAC-SHA256 over the raw body with the provider secret; reject if the timestamp is more than 5 min old; dedupe by provider event ID; accept only from provider IP ranges where published; webhooks are **never** trusted for amount (always cross-check with our own record and the status API). |
| **Outbound calls** | Gateway API keys in Secrets Manager, rotated every 90 days; mTLS where the provider supports it; egress allow-list. |
| **Funding** | FasalShield does not hold funds. The insurer pre-funds the payout account, and FasalShield alerts on low balance. |
| **Reconciliation** | Three-way match daily; unresolved mismatches older than 24h escalate to `PAYOUT_APPROVER`. |

## 7. Fraud scenarios and controls

| ID | Scenario | Signals / detection | Controls (prevent → detect → respond) |
|---|---|---|---|
| FRD-01 | **Fake plot**: pin placed on non-agricultural land, a water body or a town | Cell `is_cropland=false` (ESA WorldCover / Dynamic World mask); plot within built-up area; area unrealistic for the stated crop | Block or flag at registration; require a geotagged field photo for flagged plots; agent verification visit (Phase 2) |
| FRD-02 | **Duplicate farmer**: same person enrolled multiple times to multiply cover | Same `phone_hash` or `id_doc_hash`; fuzzy match on name + father's name + village (trigram similarity); same device for many farmers | Unique constraints on hashes; fuzzy-duplicate flag before policy issue; cap on SI per person across policies |
| FRD-03 | **GPS spoofing**: pin captured remotely or with a mock-location app | Accuracy reported as exactly 0 or very low variance; position jumps; mismatch with IP or cell-tower region; many plots captured from one location; EXIF GPS mismatch vs pin | Several GPS fixes over 10–20 s with variance check; geotagged photo; Phase 2 native wrapper with Play Integrity + mock-location detection; agent verification for high SI |
| FRD-04 | **Overlapping or duplicate plots**: the same field insured by several "farmers" | `ST_Intersects` overlap > 30% between polygons, or centroids < 20 m apart across different farmers | Flag before issue; FPO_ADMIN attestation; area cap per cell vs cropland area (cell saturation check) |
| FRD-05 | **Adverse selection / late enrolment**: enrolling after the drought is visible | Enrolment date versus deficit-to-date in the cell; spike of enrolments in a stressed cell | Enrolment cut-off, waiting period (FR-15); block new policies in cells already ≥ alert margin; product-level rule |
| FRD-06 | **Agent collusion**: an agent creates ghost farmers and routes payouts to VPAs they control | Many farmers sharing VPA or device; VPA name ≠ farmer name; enrolments outside the agent's territory; very high enrolment rate; wallet changes made by the agent before triggers | One VPA per farmer by default; name match; SoD-4; agent risk score; random call-back verification of 2% of agent enrolments; commissions clawed back on confirmed fraud |
| FRD-07 | **Wallet takeover**: SIM swap or social engineering changes the wallet before a payout | Wallet change close to a trigger; new device + wallet change; SIM-swap age | OTP + 72h cooling-off; payout to the previous verified wallet during cooling-off; SIM-swap API (Phase 2) |
| FRD-08 | **Insider threshold manipulation**: product rules changed to trigger payouts for selected cells | Change to rules after publication; data injected | Immutable `ProductVersion` with hash; four-eyes publish (SoD-2); simulator data blocked in prod; evidence includes the rule hash and source checksums |
| FRD-09 | **Data injection or tampering** in `IndexReading` | DB writes outside the geo-worker role; readings without `ingestion_run_id`; hash mismatch with the raw file | DB role separation (only `geo_writer` can insert; nobody can update or delete); lineage checks in the trigger engine; WORM raw files |
| FRD-10 | **Webhook or payout replay / forgery** | Signature failures; duplicate event IDs | §6 controls; alerts on any failure |

Fraud rules write `FraudFlag(rule_code=FRD-xx, score)`. A score ≥ threshold holds the `Policy` issuance or `TriggerEvent` for `CLAIMS_OPS` review (FR-38). Every resolution needs a note and is audit-logged.

## 8. Audit logging and tamper-evidence

| Aspect | Design |
|---|---|
| What is logged | Every state change on: Farmer (PII fields redacted in the diff), Consent, Wallet, Plot, ProductVersion, Policy, TriggerEvent, PayoutBatch, Payout, FraudFlag, Grievance, user/role/config changes, PII unmask, exports, and logins (success or failure). |
| Record | `AUDIT_LOG(seq, at, actor_type, actor_id, action, entity_type, entity_id, diff_redacted, request_id, ip_hash, prev_hash, hash)` |
| Hash chain | `hash = SHA-256(prev_hash ‖ canonical_json(record_without_hash))`. Written in the same DB transaction as the change, through a single serialised writer (an advisory lock per chain partition). |
| Append-only | The app DB role has `INSERT, SELECT` only; a trigger blocks `UPDATE`/`DELETE`; the table owner is a separate break-glass role. |
| External anchoring | Hourly, the latest `hash` and `seq` are written to the S3 evidence bucket (Object Lock compliance mode, 8 years), optionally also emailed or exposed to the regulator. This detects a full-chain rewrite by a DB superuser. |
| Trigger decisions | Each `TriggerEvent` stores `evidence_sha256`. The evidence JSON is in WORM S3 and contains the input readings with `ingestion_run_id` and raw-file `sha256`, the `rules_sha256` and the `engine_version` (git SHA). The `GET /trigger-events/{id}` endpoint re-hashes and **re-evaluates** the stored inputs with the recorded engine version to prove reproducibility (NFR-11). |
| Verification | `GET /audit-logs/verify` walks the chain and compares it with the anchors. A nightly job runs verification and alerts on failure. |
| Access | Read by `SYS_ADMIN` and `REGULATOR`; staff see their own actions. Reading the audit log is itself logged. |

## 9. Threat model (STRIDE)

Assets: farmer PII and location, wallets, money flow, product rules, index data, trigger decisions, audit trail.
Trust boundaries: device ↔ edge; edge ↔ API; API ↔ DB/queue; workers ↔ external data sources; workers ↔ payment gateway; gateway → webhook endpoint; staff browser ↔ admin API.

| ID | STRIDE | Threat | Component | Mitigations | Residual |
|---|---|---|---|---|---|
| TH-01 | **S**poofing | OTP brute force or SMS pumping (toll fraud) | `auth` OTP endpoints | Rate limits per phone, IP and device; CAPTCHA after anomalies; country allowlist (+91); OTP HMAC + 3 attempts; SMS spend alerts | Low |
| TH-02 | **S**poofing | SIM swap → account takeover → wallet change | Farmer account | OTP + 72h cooling-off on wallet change; device binding; SIM-swap check (Phase 2); notify the old device and the agent | Medium |
| TH-03 | **S**poofing | Stolen staff credentials approve a malicious batch | Admin | Mandatory WebAuthn/TOTP, step-up for approval, SoD-1, anomaly alerts (new IP or country), short sessions | Low |
| TH-04 | **S**poofing | GPS spoofing during plot capture | Farmer and agent app | FRD-03 controls | Medium (PWA limits) → Low with the native wrapper |
| TH-05 | **T**ampering | Forged payment webhook marks unpaid payouts as paid, or vice versa | `/webhooks/payments` | HMAC, timestamp, dedupe, status API cross-check, reconciliation | Low |
| TH-06 | **T**ampering | Index data or product rules altered to force or suppress triggers | DB, geo-worker, product | DB role separation, immutable versions + hash, four-eyes, WORM raw + evidence, lineage checks | Low |
| TH-07 | **T**ampering | Offline agent sync payload manipulated (e.g. backdated enrolment) | `/sync` | Server-side timestamps authoritative; device-signed payloads; `clientTs` only informational; enrolment cut-off enforced server-side | Low |
| TH-08 | **R**epudiation | Approver denies approving a batch; agent denies an enrolment | Payout, enrolment | Hash-chained audit log, step-up token bound to action + batch hash, device-signed agent ops | Low |
| TH-09 | **I**nformation disclosure | IDOR: farmer or agent reads other farmers' data by changing IDs | All APIs | Policy layer with row scope on every query; PG RLS; UUIDs; automated authorisation tests per endpoint | Low |
| TH-10 | **I**nformation disclosure | PII leaked through logs, exports or the reinsurer portal | Logging, reporting | Redaction, aggregation for REINSURER, step-up + audit for exports, watermarking of exports | Low |
| TH-11 | **I**nformation disclosure | Lost or stolen agent phone exposes offline farmer data | Agent PWA | Encrypted IndexedDB, PIN, remote wipe on device de-registration, 14-day TTL | Medium |
| TH-12 | **D**enial of service | Burst traffic or bot sign-ups; payout surge saturates the gateway | Edge, payout-worker | WAF + rate limits, autoscaling, BullMQ rate limiter, queue-based back-pressure, prioritising SLA-at-risk payouts | Low |
| TH-13 | **D**enial of service | Upstream data source outage stops triggers | geo-worker | Fallback source per product, freshness alerts, manual hold and catch-up evaluation | Medium |
| TH-14 | **E**levation of privilege | Agent escalates to FPO_ADMIN, or SYS_ADMIN grants self the approver role | User management | SoD-3, role changes need step-up + second admin (Phase 2), audit, quarterly recertification | Low |
| TH-15 | **E**levation of privilege | Simulator endpoint reachable in prod creates fake drought | Simulator | Disabled by build flag + config + `allowed_in_prod=false`; auto-approval rejects `SIMULATOR`; alert on any simulator call in prod | Low |
| TH-16 | **T**ampering / supply chain | Malicious dependency in npm or pip | CI | Lockfiles, `npm audit`/`pip-audit`, Dependabot, SCA, pinned base images, SBOM | Medium |

## 10. Security testing and operations
- **Shift-left:** ESLint security rules, Semgrep, secret scanning (gitleaks) in CI, authorisation unit tests generated from the RBAC matrix (every role × endpoint).
- **Pre-pilot:** third-party pen-test (web, API, PWA), DPIA, and a red-team exercise on the payout path.
- **Runtime:** WAF managed rules, GuardDuty, CloudTrail, RDS audit logs, anomaly alerts.
- **Incident response:** runbooks for payout fraud (circuit breaker: pause all disbursement with one admin action plus approver confirmation), data breach (DPDP + CERT-In notification steps), and data source compromise.
