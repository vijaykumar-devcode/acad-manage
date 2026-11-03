import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { AtcoderApiClient } from '../../src/providers/atcoder/atcoder.client';
import { ProviderError } from '../../src/providers/types';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('AtcoderApiClient', () => {
  let client: AtcoderApiClient;

  beforeEach(() => {
    vi.resetAllMocks();
    mockedAxios.create.mockReturnValue(mockedAxios as any);
    mockedAxios.isAxiosError.mockImplementation((payload) => payload && payload.isAxiosError);
    client = new AtcoderApiClient();
  });

  it('should fetch contest standings successfully', async () => {
    const mockData = {
      Fixed: true,
      TaskInfo: [{ TaskScreenName: 'abc100_a', TaskName: 'A' }],
      StandingsData: []
    };
    mockedAxios.get.mockResolvedValueOnce({ data: mockData });

    const result = await client.getContestStandings('abc100');
    expect(result).toEqual(mockData);
    expect(mockedAxios.get).toHaveBeenCalledWith('/contests/abc100/standings/json');
  });

  it('should handle 404 for contest not found', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404 },
      config: { url: '/contests/invalid/standings/json' }
    });

    const promise = client.getContestStandings('invalid');
    await expect(promise).rejects.toThrow(ProviderError);
    // Have to recreate mock since it was consumed
  });

  it('should have correct error code on 404', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404 },
      config: { url: '/contests/invalid/standings/json' }
    });

    await expect(client.getContestStandings('invalid')).rejects.toMatchObject({
      code: 'CONTEST_NOT_FOUND'
    });
  });

  it('should handle 429 rate limit', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 429 }
    });

    await expect(client.getContestStandings('abc100')).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      isRetryable: true
    });
  });
});
