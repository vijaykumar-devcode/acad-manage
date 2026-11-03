import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerProvider,
  getProvider,
  getSupportedPlatforms,
  isProviderRegistered,
  clearProviders,
} from '../../src/providers/registry';
import type {
  CompetitiveProgrammingProvider,
  ParticipationStatus,
} from '../../src/providers/types';

/**
 * Creates a minimal mock provider for testing registry behavior.
 * Uses 'codeforces' as the only valid CodingPlatformId.
 */
function createMockProvider(
  overrides?: Partial<CompetitiveProgrammingProvider>
): CompetitiveProgrammingProvider {
  return {
    platformId: 'codeforces',
    displayName: 'Mock Codeforces',
    allowedDomains: ['codeforces.com'],
    capabilities: { verification: false, ratings: false },
    normalizeHandle: (h: string) => h.toLowerCase().trim(),
    fetchUserInfo: async () => null,
    fetchContestInfo: async () => null,
    fetchStandings: async () => [],
    buildContestUrl: (id: string) => `https://codeforces.com/contest/${id}`,
    isValidContestUrl: () => true,
    normalizeParticipationType: (): ParticipationStatus => 'Contestant',
    ...overrides,
  };
}

describe('Provider Registry', () => {
  beforeEach(() => {
    clearProviders();
  });

  it('registers a provider and retrieves it by platform ID', () => {
    const provider = createMockProvider();
    registerProvider(provider);
    expect(getProvider('codeforces')).toBe(provider);
  });

  it('throws on duplicate registration for the same platform', () => {
    registerProvider(createMockProvider());
    expect(() => registerProvider(createMockProvider())).toThrow(
      'Provider already registered for platform: codeforces'
    );
  });

  it('throws for an unregistered platform', () => {
    expect(() => getProvider('nonexistent')).toThrow(
      'No provider registered for platform: nonexistent'
    );
  });

  it('throws for an unregistered platform when registry is empty', () => {
    expect(() => getProvider('codeforces')).toThrow(
      'No provider registered for platform: codeforces'
    );
  });

  it('returns an empty list when no providers are registered', () => {
    expect(getSupportedPlatforms()).toEqual([]);
  });

  it('lists registered platform IDs', () => {
    registerProvider(createMockProvider());
    expect(getSupportedPlatforms()).toEqual(['codeforces']);
  });

  it('reports unregistered platforms correctly', () => {
    expect(isProviderRegistered('codeforces')).toBe(false);
    expect(isProviderRegistered('nonexistent')).toBe(false);
  });

  it('reports registered platforms correctly', () => {
    registerProvider(createMockProvider());
    expect(isProviderRegistered('codeforces')).toBe(true);
    expect(isProviderRegistered('nonexistent')).toBe(false);
  });

  it('clears all providers', () => {
    registerProvider(createMockProvider());
    expect(getSupportedPlatforms()).toHaveLength(1);
    clearProviders();
    expect(getSupportedPlatforms()).toHaveLength(0);
    expect(isProviderRegistered('codeforces')).toBe(false);
  });

  it('allows re-registration after clearing', () => {
    const provider1 = createMockProvider();
    registerProvider(provider1);
    clearProviders();

    const provider2 = createMockProvider({ displayName: 'Re-registered' });
    registerProvider(provider2);
    expect(getProvider('codeforces')).toBe(provider2);
    expect(getProvider('codeforces').displayName).toBe('Re-registered');
  });
});
