import { describe, it, expect } from 'vitest';
import {
  getVersionConflict,
  STALE_VERSION_CODE,
  MISSING_VERSION_CODE,
} from '@/utils/versionConflict';

function axiosError(status: number, data: unknown) {
  return { response: { status, data } };
}

describe('getVersionConflict', () => {
  it('recognizes a 409 STALE_VERSION body', () => {
    const error = axiosError(409, {
      statusCode: 409,
      code: STALE_VERSION_CODE,
      message: 'This record was modified by another user.',
      entity: 'PLAN_SKU',
      entityId: 'sku-1',
      expectedVersion: 7,
      currentVersion: 9,
      current: { plannedVolume: 1350 },
    });

    const conflict = getVersionConflict(error);

    expect(conflict).not.toBeNull();
    expect(conflict?.code).toBe(STALE_VERSION_CODE);
    expect(conflict?.currentVersion).toBe(9);
    expect(conflict?.current).toEqual({ plannedVolume: 1350 });
  });

  it('recognizes a 409 MISSING_VERSION body', () => {
    const error = axiosError(409, {
      statusCode: 409,
      code: MISSING_VERSION_CODE,
      message: "A 'version' field is required for this update.",
      entity: 'PLAN',
    });

    const conflict = getVersionConflict(error);

    expect(conflict).not.toBeNull();
    expect(conflict?.code).toBe(MISSING_VERSION_CODE);
  });

  it('returns null for a 409 that is NOT an optimistic-locking conflict', () => {
    // e.g. ALREADY_SETTLED — a real 409 in this API that must not be
    // routed into the version-conflict reload dialog.
    const error = axiosError(409, {
      statusCode: 409,
      code: 'ALREADY_SETTLED',
      message: 'This agreement was already settled.',
    });

    expect(getVersionConflict(error)).toBeNull();
  });

  it('returns null for non-409 errors', () => {
    expect(getVersionConflict(axiosError(400, { code: 'STALE_VERSION' }))).toBeNull();
    expect(getVersionConflict(axiosError(404, { message: 'not found' }))).toBeNull();
    expect(getVersionConflict(axiosError(500, {}))).toBeNull();
  });

  it('returns null for network errors / errors without a response', () => {
    expect(getVersionConflict(new Error('Network Error'))).toBeNull();
    expect(getVersionConflict(undefined)).toBeNull();
    expect(getVersionConflict(null)).toBeNull();
  });

  it('returns null when the 409 body has no code field', () => {
    expect(getVersionConflict(axiosError(409, { message: 'conflict' }))).toBeNull();
    expect(getVersionConflict(axiosError(409, null))).toBeNull();
  });
});
