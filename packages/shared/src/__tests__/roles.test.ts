import { ROLES, findRoleConflict, isMobileRole, isRole, isStaffRole } from '../constants/roles';
import { canTransitionPayout, PAYOUT_STATUSES, PAYOUT_TRANSITIONS } from '../constants/statuses';
import { languageFallbackChain, isLanguageCode } from '../constants/languages';
import { perilOf, INDEX_TYPES } from '../constants/perils';

describe('roles', () => {
  it('has the 9 roles from the Security doc', () => {
    expect(ROLES).toHaveLength(9);
  });

  it('classifies mobile vs staff roles and every role is exactly one of them', () => {
    expect(isMobileRole('FARMER')).toBe(true);
    expect(isStaffRole('PAYOUT_APPROVER')).toBe(true);
    for (const role of ROLES) {
      expect(isMobileRole(role) !== isStaffRole(role)).toBe(true);
    }
  });

  it('isRole guards unknown values', () => {
    expect(isRole('CLAIMS_OPS')).toBe(true);
    expect(isRole('ROOT')).toBe(false);
    expect(isRole(42)).toBe(false);
  });

  it('detects SoD conflicts (SoD-3)', () => {
    expect(findRoleConflict(['SYS_ADMIN', 'PAYOUT_APPROVER'])).toEqual([
      'SYS_ADMIN',
      'PAYOUT_APPROVER',
    ]);
    expect(findRoleConflict(['CLAIMS_OPS', 'PAYOUT_APPROVER'])).not.toBeNull();
    expect(findRoleConflict(['PRODUCT_MANAGER', 'CLAIMS_OPS'])).toBeNull();
  });
});

describe('payout state machine', () => {
  it('defines transitions for every status', () => {
    for (const status of PAYOUT_STATUSES) {
      expect(PAYOUT_TRANSITIONS[status]).toBeDefined();
    }
  });

  it('enforces Architecture §7.1 transitions', () => {
    expect(canTransitionPayout('AWAITING_BATCH', 'QUEUED')).toBe(true);
    expect(canTransitionPayout('QUEUED', 'SENT')).toBe(true);
    expect(canTransitionPayout('SENT', 'SUCCESS')).toBe(true);
    expect(canTransitionPayout('QUEUED', 'SUCCESS')).toBe(false); // must go through SENT
    expect(canTransitionPayout('SUCCESS', 'QUEUED')).toBe(false); // no double pay
    expect(canTransitionPayout('CANCELLED', 'QUEUED')).toBe(false);
  });
});

describe('languages and perils', () => {
  it('falls back requested → hi → en', () => {
    expect(languageFallbackChain('mr')).toEqual(['mr', 'hi', 'en']);
    expect(languageFallbackChain('hi')).toEqual(['hi', 'en']);
    expect(languageFallbackChain('en')).toEqual(['en', 'hi']);
    expect(isLanguageCode('mr')).toBe(true);
    expect(isLanguageCode('xx')).toBe(false);
  });

  it('maps every index type to a peril', () => {
    expect(perilOf('DROUGHT_RAIN_DEFICIT')).toBe('DROUGHT');
    expect(perilOf('FLOOD_SAR_EXTENT')).toBe('FLOOD');
    for (const type of INDEX_TYPES) expect(['DROUGHT', 'FLOOD']).toContain(perilOf(type));
  });
});
