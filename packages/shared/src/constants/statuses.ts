/**
 * Entity status enums from docs/02-Technical-Architecture.md §5.1 (ERD) and §7.1 (payout state machine).
 */

export const KYC_STATUSES = ['NONE', 'BASIC', 'VERIFIED', 'REJECTED'] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

export const WALLET_TYPES = ['UPI_VPA', 'BANK_ACCOUNT', 'MOBILE_MONEY'] as const;
export type WalletType = (typeof WALLET_TYPES)[number];

export const WALLET_STATUSES = ['PENDING', 'VERIFIED', 'INVALID'] as const;
export type WalletStatus = (typeof WALLET_STATUSES)[number];

export const PLOT_CAPTURE_METHODS = ['GPS_PIN', 'WALK', 'DRAW', 'AGENT_GPS'] as const;
export type PlotCaptureMethod = (typeof PLOT_CAPTURE_METHODS)[number];

export const PLOT_VERIFICATION_STATUSES = [
  'UNVERIFIED',
  'NEEDS_REVIEW',
  'VERIFIED',
  'REJECTED',
] as const;
export type PlotVerificationStatus = (typeof PLOT_VERIFICATION_STATUSES)[number];

export const PRODUCT_STATUSES = ['DRAFT', 'ACTIVE', 'RETIRED'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_VERSION_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'PUBLISHED',
  'RETIRED',
] as const;
export type ProductVersionStatus = (typeof PRODUCT_VERSION_STATUSES)[number];

export const POLICY_STATUSES = [
  'QUOTED',
  'PENDING_PAYMENT',
  'PENDING_REVIEW',
  'IN_WAITING',
  'ACTIVE',
  'EXPIRED',
  'CANCELLED',
] as const;
export type PolicyStatus = (typeof POLICY_STATUSES)[number];

export const PREMIUM_PAYER_TYPES = ['FARMER', 'FPO', 'SPONSOR'] as const;
export type PremiumPayerType = (typeof PREMIUM_PAYER_TYPES)[number];

export const PAYMENT_STATUSES = ['CREATED', 'PENDING', 'SUCCESS', 'FAILED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const INGESTION_RUN_STATUSES = ['RUNNING', 'SUCCEEDED', 'QUARANTINED', 'FAILED'] as const;
export type IngestionRunStatus = (typeof INGESTION_RUN_STATUSES)[number];

export const TRIGGER_EVENT_STATUSES = ['DETECTED', 'HELD', 'APPROVED', 'REJECTED', 'PAID'] as const;
export type TriggerEventStatus = (typeof TRIGGER_EVENT_STATUSES)[number];

export const PAYOUT_BATCH_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'PROCESSING',
  'COMPLETED',
  'PARTIAL',
] as const;
export type PayoutBatchStatus = (typeof PAYOUT_BATCH_STATUSES)[number];

export const PAYOUT_STATUSES = [
  'AWAITING_BATCH',
  'QUEUED',
  'SENT',
  'PENDING',
  'SUCCESS',
  'FAILED_RETRYABLE',
  'ACTION_REQUIRED',
  'REVERSED',
  'CANCELLED',
] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

/** Allowed payout transitions (Architecture §7.1). Used by the payout engine and its tests. */
export const PAYOUT_TRANSITIONS: Readonly<Record<PayoutStatus, readonly PayoutStatus[]>> = {
  AWAITING_BATCH: ['QUEUED', 'CANCELLED'],
  QUEUED: ['SENT'],
  SENT: ['SUCCESS', 'PENDING', 'FAILED_RETRYABLE', 'ACTION_REQUIRED'],
  PENDING: ['SUCCESS', 'FAILED_RETRYABLE'],
  FAILED_RETRYABLE: ['QUEUED', 'ACTION_REQUIRED'],
  ACTION_REQUIRED: ['QUEUED'],
  SUCCESS: ['REVERSED'],
  REVERSED: ['QUEUED'],
  CANCELLED: [],
};

export function canTransitionPayout(from: PayoutStatus, to: PayoutStatus): boolean {
  return PAYOUT_TRANSITIONS[from].includes(to);
}

export const NOTIFICATION_CHANNELS = ['SMS', 'WHATSAPP', 'PUSH', 'IN_APP', 'IVR'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const GRIEVANCE_CATEGORIES = [
  'BASIS_RISK',
  'PAYOUT_NOT_RECEIVED',
  'WRONG_PLOT',
  'OTHER',
] as const;
export type GrievanceCategory = (typeof GRIEVANCE_CATEGORIES)[number];

export const GRIEVANCE_STATUSES = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'ESCALATED', 'CLOSED'] as const;
export type GrievanceStatus = (typeof GRIEVANCE_STATUSES)[number];

export const FRAUD_FLAG_STATUSES = ['OPEN', 'CLEARED', 'CONFIRMED'] as const;
export type FraudFlagStatus = (typeof FRAUD_FLAG_STATUSES)[number];

/** Fraud rule codes from docs/03-Security-and-Access.md §7. */
export const FRAUD_RULE_CODES = [
  'FRD-01',
  'FRD-02',
  'FRD-03',
  'FRD-04',
  'FRD-05',
  'FRD-06',
  'FRD-07',
  'FRD-08',
  'FRD-09',
  'FRD-10',
] as const;
export type FraudRuleCode = (typeof FRAUD_RULE_CODES)[number];

export const CONSENT_PURPOSES = [
  'INSURANCE_SERVICING',
  'DATA_SHARING_REINSURER',
  'MARKETING',
] as const;
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

export const CONSENT_CHANNELS = ['APP', 'AGENT_ASSISTED', 'IVR'] as const;
export type ConsentChannel = (typeof CONSENT_CHANNELS)[number];

export const ORGANISATION_TYPES = ['INSURER', 'FPO', 'REINSURER', 'REGULATOR', 'PLATFORM'] as const;
export type OrganisationType = (typeof ORGANISATION_TYPES)[number];
