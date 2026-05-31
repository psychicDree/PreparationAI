import { describe, it, expect } from 'vitest';
import { getApiUrl, isFeatureEnabled } from './index';

describe('getApiUrl', () => {
  it('joins the base URL and endpoint with a single slash', () => {
    const url = getApiUrl('/health');
    expect(url.endsWith('/health')).toBe(true);
    expect(url).not.toContain('/api/v1//health');
  });

  it('adds a leading slash when the endpoint omits one', () => {
    expect(getApiUrl('health').endsWith('/health')).toBe(true);
  });
});

describe('isFeatureEnabled', () => {
  it('returns a boolean for a known feature flag', () => {
    expect(typeof isFeatureEnabled('enablePayments')).toBe('boolean');
  });
});
