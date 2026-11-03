/**
 * Provider Registry — Factory for competitive programming providers.
 *
 * Providers self-register during application startup. Business logic retrieves
 * providers via getProvider() instead of importing concrete implementations.
 * This avoids switch/case scattered throughout the application.
 *
 * Adding a new platform:
 * 1. Implement CompetitiveProgrammingProvider (and optionally VerificationCapable)
 * 2. Call registerProvider() during app initialization
 * 3. No changes needed in controllers, services, or routes
 */

import { CompetitiveProgrammingProvider, CodingPlatformId } from './types';
import { CodeforcesProvider } from './codeforces/codeforces.provider';
import { AtcoderProvider } from './atcoder';
import { CodechefProvider } from './codechef';
const providers = new Map<CodingPlatformId, CompetitiveProgrammingProvider>();

/**
 * Register default built-in platform providers (Codeforces).
 */
export function registerDefaultProviders(): void {
  if (!providers.has('codeforces')) {
    registerProvider(new CodeforcesProvider());
  }
  if (!providers.has('atcoder')) {
    registerProvider(new AtcoderProvider());
  }
  if (!providers.has('codechef')) {
    registerProvider(new CodechefProvider());
  }
}

/**
 * Register a provider for a platform.
 * @throws Error if a provider is already registered for the platform
 */
export function registerProvider(provider: CompetitiveProgrammingProvider): void {
  if (providers.has(provider.platformId)) {
    throw new Error(`Provider already registered for platform: ${provider.platformId}`);
  }
  providers.set(provider.platformId, provider);
}

/**
 * Retrieve the registered provider for a platform.
 * @throws Error if no provider is registered for the platform
 */
export function getProvider(platform: string): CompetitiveProgrammingProvider {
  const provider = providers.get(platform as CodingPlatformId);
  if (!provider) {
    throw new Error(`No provider registered for platform: ${platform}`);
  }
  return provider;
}

/** List all currently registered platform IDs */
export function getSupportedPlatforms(): CodingPlatformId[] {
  return [...providers.keys()];
}

/** Check whether a provider is registered for the given platform */
export function isProviderRegistered(platform: string): boolean {
  return providers.has(platform as CodingPlatformId);
}

/**
 * Remove all registered providers.
 * Intended for test isolation — each test starts with a clean registry.
 */
export function clearProviders(): void {
  providers.clear();
}
