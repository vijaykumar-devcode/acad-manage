import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { CodechefApiClient } from '../../src/providers/codechef/codechef.client';
import { ProviderError } from '../../src/providers/types';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('CodechefApiClient', () => {
  let client: CodechefApiClient;

  beforeEach(() => {
    vi.resetAllMocks();
    mockedAxios.create.mockReturnValue(mockedAxios as any);
    mockedAxios.isAxiosError.mockImplementation((payload) => payload && payload.isAxiosError);
    client = new CodechefApiClient();
  });

  it('should parse HTML standings successfully', async () => {
    const html = `
      <table class="dataTable">
        <thead>
          <tr>
            <th title="Rank">Rank</th>
            <th title="User">User</th>
            <th title="Score">Score</th>
            <th title="PROB1"><a href="#">PROB1</a></th>
            <th title="PROB2"><a href="#">PROB2</a></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>
              <div class="user-name">tourist</div>
            </td>
            <td>200</td>
            <td class="accept">100</td>
            <td>0</td>
          </tr>
        </tbody>
      </table>
    `;
    mockedAxios.get.mockResolvedValueOnce({ data: html });

    const result = await client.getContestStandings('START100');
    expect(result.problemCodes).toEqual(['PROB1', 'PROB2']);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.handle).toBe('tourist');
    expect(result.rows[0]!.totalScore).toBe(200);
    expect(result.rows[0]!.problems).toHaveLength(2);
    expect(result.rows[0]!.problems[0]!.problemCode).toBe('PROB1');
    expect(result.rows[0]!.problems[0]!.solved).toBe(true);
    expect(result.rows[0]!.problems[1]!.problemCode).toBe('PROB2');
    expect(result.rows[0]!.problems[1]!.solved).toBe(false);
  });

  it('should check user existence via profile HTML', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: '<div class="user-details-container"><header><h1 class="h2-style">tourist</h1></header></div>'
    });

    const exists = await client.checkUserExists('tourist');
    expect(exists).toBe(true);
  });

  it('should return false if user profile returns 404', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404 }
    });

    const exists = await client.checkUserExists('invalid');
    expect(exists).toBe(false);
  });
});
