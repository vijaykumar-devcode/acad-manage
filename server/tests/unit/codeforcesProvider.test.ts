import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CodeforcesProvider } from '../../src/providers/codeforces/codeforces.provider';
import { CodeforcesApiClient } from '../../src/providers/codeforces/codeforces.client';
import { ProviderError, supportsVerification } from '../../src/providers/types';
import {
  registerDefaultProviders,
  getProvider,
  clearProviders,
} from '../../src/providers/registry';

describe('CodeforcesProvider', () => {
  let provider: CodeforcesProvider;

  beforeEach(() => {
    clearProviders();
    provider = new CodeforcesProvider(new CodeforcesApiClient({ maxRetries: 0 }));
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── 1. Registry Integration ─────────────────────────────────────────────

  describe('Registry Integration', () => {
    it('registers and retrieves CodeforcesProvider via registry', () => {
      registerDefaultProviders();
      const registered = getProvider('codeforces');
      expect(registered).toBeInstanceOf(CodeforcesProvider);
      expect(registered.platformId).toBe('codeforces');
      expect(registered.displayName).toBe('Codeforces');
    });
  });

  // ─── 2. Handle Normalization ─────────────────────────────────────────────

  describe('normalizeHandle', () => {
    it('lowercases and trims handles', () => {
      expect(provider.normalizeHandle('  Tourist  ')).toBe('tourist');
      expect(provider.normalizeHandle('Fefer_Ivan')).toBe('fefer_ivan');
    });
  });

  // ─── 3. User Info Lookup ──────────────────────────────────────────────────

  describe('fetchUserInfo', () => {
    it('returns normalized user info for a valid handle', async () => {
      const mockUserResponse = {
        status: 'OK',
        result: [
          {
            handle: 'Tourist',
            firstName: 'Gennady',
            lastName: 'Korotkevich',
            rating: 3800,
            maxRating: 3979,
            organization: 'ITMO University',
            city: 'Gomel',
            country: 'Belarus',
          },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockUserResponse), { status: 200 })
      );

      const info = await provider.fetchUserInfo(' Tourist ');
      expect(info).not.toBeNull();
      expect(info?.handle).toBe('Tourist');
      expect(info?.displayName).toBe('Gennady Korotkevich');
      expect(info?.rating).toBe(3800);
      expect(info?.maxRating).toBe(3979);
      expect(info?.profileFields.firstName).toBe('Gennady');
      expect(info?.profileFields.organization).toBe('ITMO University');
    });

    it('returns null for a nonexistent handle', async () => {
      const mockErrorResponse = {
        status: 'FAILED',
        comment: 'handles: User with handle non_existent_user_12345 not found',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockErrorResponse), { status: 200 })
      );

      const info = await provider.fetchUserInfo('non_existent_user_12345');
      expect(info).toBeNull();
    });

    it('returns null for an empty handle without calling API', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const info = await provider.fetchUserInfo('   ');
      expect(info).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('throws ProviderError on API failure (500)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Internal Server Error', { status: 500 })
      );

      await expect(provider.fetchUserInfo('Tourist')).rejects.toThrow(ProviderError);
    });

    it('throws ProviderError with RATE_LIMITED code on 429', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Too Many Requests', { status: 429 })
      );

      try {
        await provider.fetchUserInfo('Tourist');
        expect.fail('Should have thrown ProviderError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ProviderError);
        const pErr = err as ProviderError;
        expect(pErr.code).toBe('RATE_LIMITED');
        expect(pErr.isRetryable).toBe(true);
      }
    });

    it('throws ProviderError on malformed JSON response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('not valid json', { status: 200 })
      );

      await expect(provider.fetchUserInfo('Tourist')).rejects.toThrow(ProviderError);
    });

    it('handles timeout gracefully', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          })
      );

      try {
        await provider.fetchUserInfo('Tourist');
        expect.fail('Should have thrown ProviderError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ProviderError);
        const pErr = err as ProviderError;
        expect(pErr.code).toBe('TIMEOUT');
        expect(pErr.isRetryable).toBe(true);
      }
    });
  });

  // ─── 4. Contest Metadata Lookup ──────────────────────────────────────────

  describe('fetchContestInfo', () => {
    it('returns normalized contest info for a valid contest ID', async () => {
      const mockStandingsResponse = {
        status: 'OK',
        result: {
          contest: {
            id: 1920,
            name: 'Codeforces Round 919 (Div. 2)',
            type: 'CF',
            phase: 'FINISHED',
            frozen: false,
            durationSeconds: 7200,
            startTimeSeconds: 1705329300,
          },
          problems: [],
          rows: [],
        },
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockStandingsResponse), { status: 200 })
      );

      const contest = await provider.fetchContestInfo('1920');
      expect(contest).not.toBeNull();
      expect(contest?.externalContestId).toBe('1920');
      expect(contest?.name).toBe('Codeforces Round 919 (Div. 2)');
      expect(contest?.startTimeSeconds).toBe(1705329300);
      expect(contest?.durationSeconds).toBe(7200);
    });

    it('returns null for a nonexistent contest ID', async () => {
      const mockErrorResponse = {
        status: 'FAILED',
        comment: 'contestId: Contest with id 999999 not found',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockErrorResponse), { status: 200 })
      );

      const contest = await provider.fetchContestInfo('999999');
      expect(contest).toBeNull();
    });

    it('returns null for an empty contest ID without calling API', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const contest = await provider.fetchContestInfo('  ');
      expect(contest).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  // ─── 5. Contest Standings Lookup ─────────────────────────────────────────

  describe('fetchStandings', () => {
    it('parses standings with multiple participants, ratings, and problem results', async () => {
      const mockStandingsResponse = {
        status: 'OK',
        result: {
          contest: {
            id: 1920,
            name: 'Codeforces Round 919 (Div. 2)',
            type: 'CF',
            phase: 'FINISHED',
            frozen: false,
            durationSeconds: 7200,
            startTimeSeconds: 1705329300,
          },
          problems: [
            { index: 'A', name: 'Satisfying Constraints', type: 'PROGRAMMING' },
            { index: 'B', name: 'Summation Game', type: 'PROGRAMMING' },
          ],
          rows: [
            {
              party: {
                members: [{ handle: 'Tourist' }],
                participantType: 'CONTESTANT',
              },
              rank: 1,
              points: 2.0,
              penalty: 45,
              successfulHackCount: 0,
              unsuccessfulHackCount: 0,
              oldRating: 3700,
              newRating: 3750,
              problemResults: [
                {
                  points: 1.0,
                  rejectedAttemptCount: 0,
                  bestSubmissionTimeSeconds: 15,
                  type: 'FINAL',
                },
                {
                  points: 1.0,
                  rejectedAttemptCount: 1,
                  bestSubmissionTimeSeconds: 30,
                  type: 'FINAL',
                },
              ],
            },
            {
              party: {
                members: [{ handle: 'Petr' }],
                participantType: 'VIRTUAL',
              },
              rank: 2,
              points: 1.0,
              penalty: 20,
              successfulHackCount: 0,
              unsuccessfulHackCount: 0,
              problemResults: [
                {
                  points: 1.0,
                  rejectedAttemptCount: 0,
                  bestSubmissionTimeSeconds: 20,
                  type: 'FINAL',
                },
                { points: 0.0, rejectedAttemptCount: 2, type: 'FINAL' },
              ],
            },
          ],
        },
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockStandingsResponse), { status: 200 })
      );

      const standings = await provider.fetchStandings('1920', ['Tourist', 'Petr']);
      expect(standings).toHaveLength(2);

      // Contestant 1 (Tourist)
      const t1 = standings[0];
      expect(t1.handle).toBe('Tourist');
      expect(t1.rank).toBe(1);
      expect(t1.solvedCount).toBe(2);
      expect(t1.totalProblems).toBe(2);
      expect(t1.penaltySeconds).toBe(45);
      expect(t1.ratingBefore).toBe(3700);
      expect(t1.ratingAfter).toBe(3750);
      expect(t1.ratingChange).toBe(50);
      expect(t1.participationType).toBe('Contestant');
      expect(t1.problems).toHaveLength(2);
      expect(t1.problems[0].solved).toBe(true);
      expect(t1.problems[0].attempts).toBe(1);
      expect(t1.problems[1].attempts).toBe(2);

      // Contestant 2 (Petr) — Virtual, missing rating info
      const t2 = standings[1];
      expect(t2.handle).toBe('Petr');
      expect(t2.rank).toBe(2);
      expect(t2.solvedCount).toBe(1);
      expect(t2.participationType).toBe('Virtual');
      expect(t2.ratingBefore).toBeUndefined();
      expect(t2.ratingAfter).toBeUndefined();
      expect(t2.ratingChange).toBeUndefined();
      expect(t2.problems[1].solved).toBe(false);
      expect(t2.problems[1].attempts).toBe(2);
    });

    it('returns empty array if handles parameter is empty', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const result = await provider.fetchStandings('1920', []);
      expect(result).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns empty array if contest is not found', async () => {
      const mockErrorResponse = {
        status: 'FAILED',
        comment: 'contestId: Contest with id 999999 not found',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockErrorResponse), { status: 200 })
      );

      const result = await provider.fetchStandings('999999', ['Tourist']);
      expect(result).toEqual([]);
    });
  });

  // ─── 6. Verification Capabilities ──────────────────────────────────────

  describe('Verification Capabilities', () => {
    it('declares verification capability and supports type guard', () => {
      expect(provider.capabilities.verification).toBe(true);
      expect(supportsVerification(provider)).toBe(true);
    });

    it('generates a random 16-hex token with campusassess_v_ prefix', () => {
      const token1 = provider.generateVerificationToken();
      const token2 = provider.generateVerificationToken();

      expect(token1).toMatch(/^campusassess_v_[a-f0-9]{16}$/);
      expect(token2).toMatch(/^campusassess_v_[a-f0-9]{16}$/);
      expect(token1).not.toBe(token2);
    });

    it('verifies handle when token is in firstName profile field', async () => {
      const token = 'campusassess_v_1234567890abcdef';
      const mockUserResponse = {
        status: 'OK',
        result: [
          {
            handle: 'Tourist',
            firstName: token,
            organization: 'ITMO',
          },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockUserResponse), { status: 200 })
      );

      const isVerified = await provider.checkVerification('Tourist', token);
      expect(isVerified).toBe(true);
    });

    it('verifies handle when token is in organization profile field', async () => {
      const token = 'campusassess_v_1234567890abcdef';
      const mockUserResponse = {
        status: 'OK',
        result: [
          {
            handle: 'Tourist',
            firstName: 'Gennady',
            organization: token,
          },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockUserResponse), { status: 200 })
      );

      const isVerified = await provider.checkVerification('Tourist', token);
      expect(isVerified).toBe(true);
    });

    it('returns false when token is not found in user profile', async () => {
      const token = 'campusassess_v_1234567890abcdef';
      const mockUserResponse = {
        status: 'OK',
        result: [
          {
            handle: 'Tourist',
            firstName: 'Gennady',
            organization: 'ITMO',
          },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockUserResponse), { status: 200 })
      );

      const isVerified = await provider.checkVerification('Tourist', token);
      expect(isVerified).toBe(false);
    });

    it('returns false when user does not exist', async () => {
      const mockErrorResponse = {
        status: 'FAILED',
        comment: 'handles: User not found',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockErrorResponse), { status: 200 })
      );

      const isVerified = await provider.checkVerification('nonexistent', 'campusassess_v_123');
      expect(isVerified).toBe(false);
    });

    it('generates clear verification instructions', () => {
      const instructions = provider.getVerificationInstructions('campusassess_v_xyz');
      expect(instructions).toContain('https://codeforces.com/settings/social');
      expect(instructions).toContain('campusassess_v_xyz');
    });
  });

  // ─── 7. URL Validation & Open Redirect Prevention ─────────────────────────

  describe('isValidContestUrl & buildContestUrl', () => {
    it('builds canonical contest URL', () => {
      expect(provider.buildContestUrl('1920')).toBe('https://codeforces.com/contest/1920');
    });

    it('validates legitimate Codeforces contest URLs', () => {
      expect(provider.isValidContestUrl('https://codeforces.com/contest/1920')).toBe(true);
      expect(provider.isValidContestUrl('https://codeforces.com/contest/1920/problem/A')).toBe(
        true
      );
      expect(provider.isValidContestUrl('https://m.codeforces.com/contest/1920')).toBe(true);
      expect(provider.isValidContestUrl('https://codeforces.com/gym/100001')).toBe(true);
    });

    it('rejects invalid or malicious URLs (SSRF / Open Redirect attempts)', () => {
      expect(provider.isValidContestUrl('https://evil-site.com/contest/1920')).toBe(false);
      expect(provider.isValidContestUrl('https://codeforces.com.evil.com/contest/1920')).toBe(
        false
      );
      expect(provider.isValidContestUrl('https://codeforces.com/profile/Tourist')).toBe(false);
      expect(provider.isValidContestUrl('javascript:alert(1)')).toBe(false);
      expect(provider.isValidContestUrl('')).toBe(false);
    });
  });

  // ─── 8. Security & Error Normalization ────────────────────────────────────

  describe('Security & Error Normalization', () => {
    it('strips HTML tags and verification tokens from error messages', async () => {
      const tokenSecret = 'campusassess_v_secret12345678';
      const mockHtmlError = {
        status: 'FAILED',
        comment: `<html><body>Error containing ${tokenSecret} and <b>HTML tags</b></body></html>`,
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockHtmlError), { status: 200 })
      );

      try {
        await provider.fetchUserInfo('Tourist');
        expect.fail('Should have thrown ProviderError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ProviderError);
        const pErr = err as ProviderError;
        expect(pErr.message).not.toContain('<html>');
        expect(pErr.message).not.toContain(tokenSecret);
        expect(pErr.message).toContain('[TOKEN]');
      }
    });
  });
});
