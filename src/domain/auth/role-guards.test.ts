import { describe, expect, it } from 'vitest';
import {
  canDeleteSpace,
  canEditMap,
  canManageAutomations,
  canManageDevices,
  canManageMembers,
  canToggleOutput,
  isReadOnlyRole,
} from './role-guards';

describe('role-guards', () => {
  it('viewer is read-only', () => {
    expect(isReadOnlyRole('viewer')).toBe(true);
    expect(canEditMap('viewer')).toBe(false);
    expect(canToggleOutput('viewer')).toBe(false);
  });

  it('operator can edit map and toggle outputs but not delete spaces', () => {
    expect(canEditMap('operator')).toBe(true);
    expect(canToggleOutput('operator')).toBe(true);
    expect(canManageAutomations('operator')).toBe(true);
    expect(canDeleteSpace('operator')).toBe(false);
    expect(canManageMembers('operator')).toBe(false);
  });

  it('owner has full workspace control', () => {
    expect(canDeleteSpace('owner')).toBe(true);
    expect(canManageMembers('owner')).toBe(true);
    expect(canManageDevices('owner')).toBe(true);
  });
});
