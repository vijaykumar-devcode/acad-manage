import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CodechefProvider } from '../../src/providers/codechef/codechef.provider';
import { CodechefApiClient } from '../../src/providers/codechef/codechef.client';

vi.mock('../../src/providers/codechef/codechef.client');

describe('CodechefProvider', () => {
  let provider: CodechefProvider;
  let mockClient: vi.Mocked<CodechefApiClient>;

  beforeEach(() => {
    mockClient = new CodechefApiClient() as any;
    provider = new CodechefProvider(mockClient);
  });

  describe('Verification Capability', () => {
    it('should explicitly disable verification capability', () => {
      expect(provider.capabilities.verification).toBe(false);
    });
  });

  describe('Standings', () => {
    it('should normalize and filter rows by requested handles', async () => {
      mockClient.getContestStandings.mockResolvedValueOnce({
        problemCodes: ['A', 'B'],
        rows: [
          {
            rank: 1,
            handle: 'tourist',
            totalScore: 200,
            totalPenalty: 0,
            problems: [
              { problemCode: 'A', solved: true, attempts: 1, penaltySeconds: 0 },
              { problemCode: 'B', solved: true, attempts: 1, penaltySeconds: 0 }
            ]
          },
          {
            rank: 2,
            handle: 'other', // Not in requested handles
            totalScore: 100,
            totalPenalty: 0,
            problems: [
              { problemCode: 'A', solved: true, attempts: 1, penaltySeconds: 0 },
              { problemCode: 'B', solved: false, attempts: 0, penaltySeconds: 0 }
            ]
          }
        ]
      });

      const standings = await provider.fetchStandings('START100', ['TOURIST']); // case-insensitive check
      
      expect(standings).toHaveLength(1);
      expect(standings[0]!.handle).toBe('tourist');
      expect(standings[0]!.solvedCount).toBe(2);
      expect(standings[0]!.totalProblems).toBe(2);
      expect(standings[0]!.problems).toHaveLength(2);
    });
  });
});
