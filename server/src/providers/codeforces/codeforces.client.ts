/**
 * Codeforces Internal API Client
 *
 * Handles HTTP transport, timeout control, response validation, error translation,
 * and transient retry logic for Codeforces API calls.
 *
 * Security:
 * - Base URL is hardcoded/configured server-side; user input is never placed in hostname.
 * - All timeouts are finite (default 10s).
 * - Upstream HTML, stack traces, and sensitive data are stripped from errors.
 */

import { ProviderError, type ProviderErrorCode } from '../types';
import type { CFResponse, CFUser, CFStandingsResult, CFContest } from './codeforces.types';

export interface CodeforcesClientConfig {
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export class CodeforcesApiClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(config?: CodeforcesClientConfig) {
    this.baseUrl = (
      config?.baseUrl ??
      process.env.CODEFORCES_API_URL ??
      'https://codeforces.com/api'
    ).replace(/\/+$/, '');
    this.timeoutMs = config?.timeoutMs ?? 10000;
    this.maxRetries = config?.maxRetries ?? 2;
  }

  /**
   * Fetch user profile info for given handles.
   */
  async getUserInfo(handles: string[]): Promise<CFUser[]> {
    if (handles.length === 0) return [];
    const joined = handles.map((h) => encodeURIComponent(h.trim())).join(';');
    const data = await this.request<CFUser[]>(`/user.info?handles=${joined}`);
    return data;
  }

  /**
   * Fetch contest standings for given contest ID and optional handle filter.
   */
  async getContestStandings(
    contestId: string,
    options?: { handles?: string[]; from?: number; count?: number; showUnofficial?: boolean }
  ): Promise<CFStandingsResult> {
    const params = new URLSearchParams();
    params.set('contestId', contestId.trim());

    if (options?.handles && options.handles.length > 0) {
      params.set('handles', options.handles.map((h) => h.trim()).join(';'));
    }
    if (options?.from !== undefined) {
      params.set('from', options.from.toString());
    }
    if (options?.count !== undefined) {
      params.set('count', options.count.toString());
    }
    if (options?.showUnofficial !== undefined) {
      params.set('showUnofficial', options.showUnofficial.toString());
    }

    const data = await this.request<CFStandingsResult>(`/contest.standings?${params.toString()}`);
    return data;
  }

  /**
   * Fetch contest metadata list to locate a contest.
   */
  async getContestList(gym = false): Promise<CFContest[]> {
    const data = await this.request<CFContest[]>(`/contest.list?gym=${gym}`);
    return data;
  }

  /**
   * Execute an HTTP GET request with timeout, retry, and error normalization.
   */
  private async request<T>(endpoint: string, attempt = 1): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CampusAssess-LMS/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        // Handle HTTP-level errors (e.g. 429 Rate Limit, 503 Service Unavailable, 404 Not Found)
        const isTransient = response.status >= 500 || response.status === 429;

        if (isTransient && attempt <= this.maxRetries) {
          const backoffMs = attempt * 1000;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          return this.request<T>(endpoint, attempt + 1);
        }

        const errorCode: ProviderErrorCode =
          response.status === 429
            ? 'RATE_LIMITED'
            : response.status >= 500
              ? 'UNAVAILABLE'
              : response.status === 404
                ? 'CONTEST_NOT_FOUND'
                : 'INVALID_RESPONSE';

        throw new ProviderError(
          `Codeforces API error (HTTP ${response.status})`,
          'codeforces',
          errorCode,
          isTransient
        );
      }

      const json = (await response.json()) as CFResponse<T>;

      if (!json || typeof json !== 'object') {
        throw new ProviderError(
          'Malformed JSON response from Codeforces',
          'codeforces',
          'INVALID_RESPONSE',
          false
        );
      }

      if (json.status === 'FAILED') {
        const comment = json.comment ?? 'Unknown Codeforces API error';
        const lower = comment.toLowerCase();

        let errorCode: ProviderErrorCode = 'INVALID_RESPONSE';
        let isRetryable = false;

        if (lower.includes('not found') || lower.includes('handles: user with handle')) {
          errorCode = lower.includes('contest') ? 'CONTEST_NOT_FOUND' : 'HANDLE_NOT_FOUND';
        } else if (lower.includes('limit exceeded') || lower.includes('call limit')) {
          errorCode = 'RATE_LIMITED';
          isRetryable = true;
        } else if (
          lower.includes('disabled') ||
          lower.includes('down') ||
          lower.includes('maintenance')
        ) {
          errorCode = 'UNAVAILABLE';
          isRetryable = true;
        }

        throw new ProviderError(
          `Codeforces API error: ${this.sanitizeMessage(comment)}`,
          'codeforces',
          errorCode,
          isRetryable
        );
      }

      if (json.result === undefined) {
        throw new ProviderError(
          'Codeforces response missing result field',
          'codeforces',
          'INVALID_RESPONSE',
          false
        );
      }

      return json.result;
    } catch (err: unknown) {
      clearTimeout(timer);

      if (err instanceof ProviderError) {
        throw err;
      }

      if (err instanceof Error && err.name === 'AbortError') {
        if (attempt <= this.maxRetries) {
          const backoffMs = attempt * 1000;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          return this.request<T>(endpoint, attempt + 1);
        }
        throw new ProviderError('Codeforces API request timed out', 'codeforces', 'TIMEOUT', true);
      }

      const message = err instanceof Error ? err.message : 'Network error';
      if (attempt <= this.maxRetries) {
        const backoffMs = attempt * 1000;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        return this.request<T>(endpoint, attempt + 1);
      }

      throw new ProviderError(
        `Codeforces connection error: ${this.sanitizeMessage(message)}`,
        'codeforces',
        'UNAVAILABLE',
        true
      );
    }
  }

  /**
   * Ensure error messages do not leak upstream HTML, tokens, or raw paths.
   */
  private sanitizeMessage(msg: string): string {
    return msg
      .replace(/<[^>]*>?/gm, '') // Strip HTML tags
      .replace(/campusassess_v_\w+/gi, '[TOKEN]') // Strip token values if present
      .slice(0, 200); // Truncate length
  }
}
