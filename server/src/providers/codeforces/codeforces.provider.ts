/**
 * Codeforces Provider Implementation
 *
 * Implements the CompetitiveProgrammingProvider and VerificationCapable interfaces.
 * Adapts Codeforces API responses into CampusAssess normalized domain models.
 *
 * Security & Integrity:
 * - All HTTP communication delegates to CodeforcesApiClient.
 * - Handles normalized consistently (trimmed + lowercased).
 * - Generates cryptographically secure 16-char hex verification tokens.
 * - Never modifies MongoDB directly.
 * - No scraped HTML or undocumented APIs used.
 */

import crypto from 'node:crypto';
import {
  type CompetitiveProgrammingProvider,
  type VerificationCapable,
  type CodingPlatformId,
  type ProviderCapabilities,
  type ExternalUserInfo,
  type ExternalContestInfo,
  type ExternalStanding,
  type ExternalProblemResult,
  type ParticipationStatus,
  ProviderError,
} from '../types';
import { CodeforcesApiClient } from './codeforces.client';
import type { CFUser, CFStandingRow, CFProblemResult } from './codeforces.types';

export class CodeforcesProvider implements CompetitiveProgrammingProvider, VerificationCapable {
  readonly platformId: CodingPlatformId = 'codeforces';
  readonly displayName = 'Codeforces';
  readonly allowedDomains = ['codeforces.com', 'm.codeforces.com'];
  readonly capabilities: ProviderCapabilities = {
    verification: true,
    ratings: true,
  };

  private readonly client: CodeforcesApiClient;

  constructor(client?: CodeforcesApiClient) {
    this.client = client ?? new CodeforcesApiClient();
  }

  /**
   * Canonical handle normalization for Codeforces.
   * Codeforces handles are case-insensitive.
   */
  normalizeHandle(handle: string): string {
    return handle.trim().toLowerCase();
  }

  /**
   * Fetch public user profile from Codeforces.
   */
  async fetchUserInfo(handle: string): Promise<ExternalUserInfo | null> {
    const normalized = this.normalizeHandle(handle);
    if (!normalized) return null;

    try {
      const users = await this.client.getUserInfo([normalized]);
      if (!users || users.length === 0) return null;

      const cfUser = users[0];
      return this.mapUserInfo(cfUser);
    } catch (err: unknown) {
      if (err instanceof ProviderError && err.code === 'HANDLE_NOT_FOUND') {
        return null;
      }
      throw err;
    }
  }

  /**
   * Generate a cryptographically secure, unpredictable verification token.
   * Format: campusassess_v_<16-hex-chars>
   */
  generateVerificationToken(): string {
    const randomHex = crypto.randomBytes(8).toString('hex');
    return `campusassess_v_${randomHex}`;
  }

  /**
   * Check if a student's Codeforces profile contains the verification token.
   * Checks the firstName and organization fields.
   */
  async checkVerification(handle: string, rawToken: string): Promise<boolean> {
    if (!rawToken || !handle) return false;

    const userInfo = await this.fetchUserInfo(handle);
    if (!userInfo) return false;

    const tokenTrimmed = rawToken.trim();
    const firstName = userInfo.profileFields['firstName'] ?? '';
    const organization = userInfo.profileFields['organization'] ?? '';

    return firstName.includes(tokenTrimmed) || organization.includes(tokenTrimmed);
  }

  /**
   * Human-readable instructions for setting the verification token on Codeforces.
   */
  getVerificationInstructions(token: string): string {
    return `To verify ownership, open your Codeforces Settings (https://codeforces.com/settings/social) and temporarily set your "First Name" or "Organization" to: ${token}`;
  }

  /**
   * Fetch contest metadata from Codeforces.
   */
  async fetchContestInfo(externalContestId: string): Promise<ExternalContestInfo | null> {
    const idTrimmed = externalContestId.trim();
    if (!idTrimmed) return null;

    try {
      const standingsResult = await this.client.getContestStandings(idTrimmed, { count: 1 });
      const contest = standingsResult.contest;

      return {
        externalContestId: contest.id.toString(),
        name: contest.name,
        startTimeSeconds: contest.startTimeSeconds ?? 0,
        durationSeconds: contest.durationSeconds,
      };
    } catch (err: unknown) {
      if (err instanceof ProviderError && err.code === 'CONTEST_NOT_FOUND') {
        return null;
      }
      throw err;
    }
  }

  /**
   * Fetch standings for a set of student handles for a specific contest.
   */
  async fetchStandings(externalContestId: string, handles: string[]): Promise<ExternalStanding[]> {
    const idTrimmed = externalContestId.trim();
    if (!idTrimmed || handles.length === 0) return [];

    const normalizedHandles = handles
      .map((h) => this.normalizeHandle(h))
      .filter((h) => h.length > 0);

    if (normalizedHandles.length === 0) return [];

    try {
      const standingsResult = await this.client.getContestStandings(idTrimmed, {
        handles: normalizedHandles,
        showUnofficial: true,
      });

      const problemCount = standingsResult.problems.length;
      const problemList = standingsResult.problems;

      return standingsResult.rows.map((row) => this.mapStandingRow(row, problemCount, problemList));
    } catch (err: unknown) {
      if (err instanceof ProviderError && err.code === 'CONTEST_NOT_FOUND') {
        return [];
      }
      throw err;
    }
  }

  /**
   * Build external link to Codeforces contest.
   */
  buildContestUrl(externalContestId: string): string {
    const cleanId = externalContestId.trim();
    return `https://codeforces.com/contest/${cleanId}`;
  }

  /**
   * Validate whether a URL is a legitimate Codeforces contest URL.
   * Prevents open redirects by restricting hostname and path format.
   */
  isValidContestUrl(url: string): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      const hostLower = parsed.hostname.toLowerCase();

      const isAllowedHost = this.allowedDomains.includes(hostLower);
      if (!isAllowedHost) return false;

      // Pattern: /contest/:id or /gym/:id
      const contestPathPattern = /^\/(contest|gym)\/\d+(\/.*)?$/i;
      return contestPathPattern.test(parsed.pathname);
    } catch {
      return false;
    }
  }

  /**
   * Normalize Codeforces participantType into CampusAssess ParticipationStatus.
   */
  normalizeParticipationType(cfType: string): ParticipationStatus {
    const upper = cfType?.toUpperCase() ?? '';
    switch (upper) {
      case 'CONTESTANT':
      case 'OFFICIAL':
        return 'Contestant';
      case 'VIRTUAL':
        return 'Virtual';
      case 'OUT_OF_COMPETITION':
        return 'OutOfCompetition';
      case 'PRACTICE':
      default:
        return 'DidNotParticipate';
    }
  }

  // ─── Private Transformation Helpers ────────────────────────────────────────

  private mapUserInfo(cfUser: CFUser): ExternalUserInfo {
    let displayName: string | undefined;
    if (cfUser.firstName && cfUser.lastName) {
      displayName = `${cfUser.firstName} ${cfUser.lastName}`;
    } else if (cfUser.firstName) {
      displayName = cfUser.firstName;
    }

    return {
      handle: cfUser.handle,
      displayName,
      rating: cfUser.rating,
      maxRating: cfUser.maxRating,
      profileFields: {
        firstName: cfUser.firstName ?? '',
        organization: cfUser.organization ?? '',
        city: cfUser.city ?? '',
        country: cfUser.country ?? '',
      },
    };
  }

  private mapStandingRow(
    row: CFStandingRow,
    totalProblems: number,
    problems: { index: string; name: string }[]
  ): ExternalStanding {
    const handle = row.party.members[0]?.handle ?? 'unknown';
    const participationType = this.normalizeParticipationType(row.party.participantType);

    const problemResults: ExternalProblemResult[] = row.problemResults.map((pr, index) => {
      const probMeta = problems[index] ?? {
        index: index.toString(),
        name: `Problem ${index + 1}`,
      };
      return this.mapProblemResult(pr, probMeta.index, probMeta.name);
    });

    const solvedCount = problemResults.filter((p) => p.solved).length;

    let ratingChange: number | undefined;
    if (row.newRating !== undefined && row.oldRating !== undefined) {
      ratingChange = row.newRating - row.oldRating;
    }

    return {
      handle,
      rank: row.rank,
      solvedCount,
      totalProblems,
      penaltySeconds: row.penalty,
      ratingBefore: row.oldRating,
      ratingAfter: row.newRating,
      ratingChange,
      participationType,
      problems: problemResults,
    };
  }

  private mapProblemResult(
    pr: CFProblemResult,
    problemId: string,
    problemName: string
  ): ExternalProblemResult {
    const solved = pr.points > 0;
    const attempts = pr.rejectedAttemptCount + (solved ? 1 : 0);

    return {
      problemId,
      problemName,
      solved,
      attempts,
      penaltySeconds: pr.bestSubmissionTimeSeconds ?? pr.penalty ?? 0,
      solvedAtSeconds: pr.bestSubmissionTimeSeconds,
    };
  }
}
