import axios, { AxiosError, AxiosInstance } from 'axios';
import { ProviderError, ProviderErrorCode } from '../types';
import { AtCoderStandingsResponse } from './atcoder.types';
import * as cheerio from 'cheerio';

export class AtcoderApiClient {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: 'https://atcoder.jp',
      timeout: 10000,
    });
  }

  async getContestStandings(contestId: string): Promise<AtCoderStandingsResponse> {
    try {
      // Endpoint is /contests/[contest_id]/standings/json
      const response = await this.http.get<AtCoderStandingsResponse>(
        `/contests/${encodeURIComponent(contestId)}/standings/json`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, contestId);
    }
  }

  async getUserProfileHtml(handle: string): Promise<string> {
    try {
      const response = await this.http.get(`/users/${encodeURIComponent(handle)}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, handle);
    }
  }

  private handleError(error: any, context: string): Error {
    if (axios.isAxiosError(error) || error?.isAxiosError) {
      const status = error.response?.status;
      
      if (status === 404) {
        if (error.config?.url?.includes('/users/')) {
          return new ProviderError(`Handle ${context} not found`, 'atcoder', 'HANDLE_NOT_FOUND', false);
        } else {
          return new ProviderError(`Contest ${context} not found`, 'atcoder', 'CONTEST_NOT_FOUND', false);
        }
      }

      if (status === 429 || status === 503) {
        return new ProviderError('Rate limit exceeded or service unavailable', 'atcoder', 'RATE_LIMITED', true);
      }

      if (error.code === 'ECONNABORTED') {
        return new ProviderError('Request timed out', 'atcoder', 'TIMEOUT', true);
      }

      return new ProviderError(`API error: ${error.message}`, 'atcoder', 'UNAVAILABLE', true);
    }

    return new ProviderError('An unexpected error occurred', 'atcoder', 'INVALID_RESPONSE', false);
  }
}
