import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AtcoderProvider } from '../../src/providers/atcoder/atcoder.provider';
import { AtcoderApiClient } from '../../src/providers/atcoder/atcoder.client';

vi.mock('../../src/providers/atcoder/atcoder.client');

describe('AtcoderProvider', () => {
  let provider: AtcoderProvider;
  let mockClient: vi.Mocked<AtcoderApiClient>;

  beforeEach(() => {
    mockClient = new AtcoderApiClient() as any;
    provider = new AtcoderProvider(mockClient);
  });

  describe('Verification', () => {
    it('should generate valid token', () => {
      const token = provider.generateVerificationToken();
      expect(token.startsWith('campusassess_v_')).toBe(true);
      expect(token.length).toBeGreaterThan(20);
    });

    it('should verify token from HTML affiliation field', async () => {
      mockClient.getUserProfileHtml.mockResolvedValueOnce(`
        <html>
          <body>
            <table>
              <tr><th>Affiliation</th><td>campusassess_v_12345</td></tr>
            </table>
          </body>
        </html>
      `);

      const isValid = await provider.checkVerification('tourist', 'campusassess_v_12345');
      expect(isValid).toBe(true);
    });

    it('should fail verification if token not present', async () => {
      mockClient.getUserProfileHtml.mockResolvedValueOnce(`
        <html>
          <body>
            <table>
              <tr><th>Affiliation</th><td>Some University</td></tr>
            </table>
          </body>
        </html>
      `);

      const isValid = await provider.checkVerification('tourist', 'campusassess_v_12345');
      expect(isValid).toBe(false);
    });
  });

  describe('Standings', () => {
    it('should correctly parse standings JSON and return normalized data', async () => {
      mockClient.getContestStandings.mockResolvedValueOnce({
        Fixed: true,
        TaskInfo: [
          { TaskScreenName: 'abc100_a', TaskName: 'A', TaskAssignment: 'A' },
          { TaskScreenName: 'abc100_b', TaskName: 'B', TaskAssignment: 'B' }
        ],
        StandingsData: [
          {
            Rank: 1,
            UserScreenName: 'tourist',
            UserIsDeleted: false,
            Affiliation: '',
            Country: 'BY',
            Rating: 3900,
            OldRating: 3890,
            IsRated: true,
            Competitions: 50,
            TotalResult: {
              Count: 2,
              Score: 200,
              Penalty: 1, // 1 penalty
              Accepted: 2,
              Elapsed: 120000000000 // 120 seconds
            },
            TaskResults: {
              'abc100_a': {
                Count: 1,
                Failure: 0,
                Penalty: 0,
                Score: 100,
                Elapsed: 120000000000,
                Status: 1,
                Pending: false
              }
            }
          }
        ]
      });

      const standings = await provider.fetchStandings('abc100', ['tourist', 'unregistered']);
      
      expect(standings).toHaveLength(1);
      expect(standings[0]!.handle).toBe('tourist');
      expect(standings[0]!.rank).toBe(1);
      expect(standings[0]!.solvedCount).toBe(2);
      expect(standings[0]!.penaltySeconds).toBe(120); // Extracted from Elapsed (120000000000 / 1e9)
      expect(standings[0]!.ratingBefore).toBe(3890);
      expect(standings[0]!.ratingAfter).toBe(3900);
      expect(standings[0]!.ratingChange).toBe(10);
      
      // Problems
      expect(standings[0]!.problems).toHaveLength(2);
      expect(standings[0]!.problems[0]!.solved).toBe(true);
      expect(standings[0]!.problems[0]!.attempts).toBe(1);
      expect(standings[0]!.problems[0]!.solvedAtSeconds).toBe(120);

      // Unattempted problem
      expect(standings[0]!.problems[1]!.solved).toBe(false);
      expect(standings[0]!.problems[1]!.attempts).toBe(0);
    });
  });
});
