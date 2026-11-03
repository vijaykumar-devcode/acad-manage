/**
 * CP/DSA Provider Abstraction — Type Definitions
 *
 * These types define the contract between CampusAssess and external competitive
 * programming platforms. Business logic operates exclusively on these normalized
 * types, never on raw provider API responses.
 *
 * Provider implementations are responsible for converting their API responses
 * into these types. Adding a new platform means implementing the
 * CompetitiveProgrammingProvider interface — no changes to controllers or services.
 *
 * Security: Provider interfaces never expose API credentials or secrets.
 * Each provider implementation reads credentials from environment variables
 * internally, without leaking them through the interface.
 */

// ─── Platform Identification ──────────────────────────────────────────────────

export const SUPPORTED_PLATFORMS = ['codeforces', 'codechef', 'atcoder'] as const;
export type CodingPlatformId = (typeof SUPPORTED_PLATFORMS)[number];

// ─── Participation Status ─────────────────────────────────────────────────────
// Shared by both the provider layer (normalization target) and the persistence
// layer (ContestResult.participationStatus). Defined here as the canonical source.

export const PARTICIPATION_STATUSES = [
  'Contestant',
  'Virtual',
  'OutOfCompetition',
  'DidNotParticipate',
] as const;
export type ParticipationStatus = (typeof PARTICIPATION_STATUSES)[number];

// ─── Provider Capabilities ────────────────────────────────────────────────────

export interface ProviderCapabilities {
  /** Whether the provider supports account ownership verification */
  verification: boolean;
  /** Whether the provider returns rating data with contest standings */
  ratings: boolean;
}

// ─── Normalized External Types ────────────────────────────────────────────────
// Providers normalize their raw API responses into these types.
// CampusAssess business logic, controllers, and services never see raw
// provider-specific response shapes.

export interface ExternalUserInfo {
  handle: string;
  displayName?: string;
  rating?: number;
  maxRating?: number;
  /**
   * Arbitrary key-value pairs from the user's public profile.
   * Used by the verification system to check if a token appears in a profile field.
   * Keys and values are provider-specific (e.g. { firstName: "...", organization: "..." }).
   */
  profileFields: Record<string, string>;
}

export interface ExternalContestInfo {
  externalContestId: string;
  name: string;
  /** Contest start time in Unix seconds */
  startTimeSeconds: number;
  /** Contest duration in seconds */
  durationSeconds: number;
}

export interface ExternalProblemResult {
  problemId: string;
  problemName: string;
  solved: boolean;
  attempts: number;
  /** Penalty time in seconds for this problem (semantics are provider-defined) */
  penaltySeconds: number;
  /** Seconds from contest start when the problem was solved. Undefined if not solved. */
  solvedAtSeconds?: number;
}

export interface ExternalStanding {
  handle: string;
  rank: number;
  solvedCount: number;
  totalProblems: number;
  /** Total penalty/completion time in seconds (semantics are provider-defined) */
  penaltySeconds: number;
  /** Provider-native rating before this contest. Meaning is platform-specific. */
  ratingBefore?: number;
  /** Provider-native rating after this contest. Meaning is platform-specific. */
  ratingAfter?: number;
  /** Provider-native rating change. Meaning is platform-specific. */
  ratingChange?: number;
  /** Raw provider participation type string, before normalization */
  participationType: string;
  problems: ExternalProblemResult[];
}

// ─── Sync Report ──────────────────────────────────────────────────────────────

export interface SyncReport {
  processed: number;
  imported: number;
  skipped: number;
  failed: number;
  /** Human-readable error descriptions. Never contains API credentials or raw responses. */
  errors: string[];
  durationMs: number;
}

// ─── Provider Errors ──────────────────────────────────────────────────────────

export const PROVIDER_ERROR_CODES = [
  'HANDLE_NOT_FOUND',
  'CONTEST_NOT_FOUND',
  'RATE_LIMITED',
  'TIMEOUT',
  'UNAVAILABLE',
  'INVALID_RESPONSE',
  'UNSUPPORTED_CAPABILITY',
] as const;

export type ProviderErrorCode = (typeof PROVIDER_ERROR_CODES)[number];

/**
 * Structured error from a provider operation.
 * Never contains raw API responses, credentials, or sensitive upstream data.
 */
export class ProviderError extends Error {
  public override readonly name = 'ProviderError';

  constructor(
    message: string,
    public readonly platformId: string,
    public readonly code: ProviderErrorCode,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
  }
}

// ─── Verification Capability ──────────────────────────────────────────────────
// Not all providers support account ownership verification.
// Providers that support it implement this interface alongside the core interface.
// Use the supportsVerification() type guard before calling these methods.

export interface VerificationCapable {
  /** Generate a cryptographically secure, one-time verification token */
  generateVerificationToken(): string;

  /**
   * Check if the handle's live profile contains the expected token.
   * @returns true if the token is found in the expected profile field
   */
  checkVerification(handle: string, rawToken: string): Promise<boolean>;

  /**
   * Human-readable instructions for the student explaining where to place the token.
   * e.g. "Set your Codeforces First Name to: campusassess_v_abc123"
   */
  getVerificationInstructions(token: string): string;
}

// ─── Core Provider Interface ──────────────────────────────────────────────────

export interface CompetitiveProgrammingProvider {
  readonly platformId: CodingPlatformId;
  readonly displayName: string;
  /** Domains allowed for contest URLs — used to prevent open redirects */
  readonly allowedDomains: string[];
  readonly capabilities: ProviderCapabilities;

  /**
   * Normalize a handle for storage and uniqueness checks.
   * Provider-specific: e.g. Codeforces lowercases, others may differ.
   */
  normalizeHandle(handle: string): string;

  /**
   * Fetch public user information from the provider.
   * @returns User info if the handle exists, null if not found
   * @throws ProviderError on API failures (timeout, rate limit, etc.)
   */
  fetchUserInfo(handle: string): Promise<ExternalUserInfo | null>;

  /**
   * Fetch contest metadata from the provider.
   * @returns Contest info if it exists, null if not found
   * @throws ProviderError on API failures
   */
  fetchContestInfo(externalContestId: string): Promise<ExternalContestInfo | null>;

  /**
   * Fetch contest standings for the specified handles.
   * Returns only standings for handles that participated.
   * Handles not found in standings are silently omitted (not errors).
   * @throws ProviderError on API failures
   */
  fetchStandings(externalContestId: string, handles: string[]): Promise<ExternalStanding[]>;

  /** Build the canonical external contest URL for navigation */
  buildContestUrl(externalContestId: string): string;

  /**
   * Validate whether a URL is a legitimate contest URL for this provider.
   * Used to prevent open redirects — only URLs matching the provider's
   * allowedDomains and expected path patterns pass validation.
   */
  isValidContestUrl(url: string): boolean;

  /**
   * Map a provider-specific participation type string to the normalized enum.
   * e.g. Codeforces 'CONTESTANT' → 'Contestant'
   */
  normalizeParticipationType(providerType: string): ParticipationStatus;
}

// ─── Type Guard ───────────────────────────────────────────────────────────────

/**
 * Type guard: checks if a provider supports account ownership verification.
 * Use before calling generateVerificationToken(), checkVerification(), or
 * getVerificationInstructions().
 */
export function supportsVerification(
  provider: CompetitiveProgrammingProvider
): provider is CompetitiveProgrammingProvider & VerificationCapable {
  return provider.capabilities.verification;
}
