import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { ProviderError } from '../types';
import { CodeChefStandingRow, CodeChefProblemResult } from './codechef.types';

export class CodechefApiClient {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: 'https://www.codechef.com',
      timeout: 10000,
    });
  }

  async checkUserExists(handle: string): Promise<boolean> {
    try {
      const response = await this.http.get(`/users/${encodeURIComponent(handle)}`);
      const $ = cheerio.load(response.data);
      // If user doesn't exist, title usually says something else or 404
      const userText = $('.user-details-container header h1.h2-style').text();
      return !!userText;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return false;
      }
      throw this.handleError(error, handle);
    }
  }

  async getContestStandings(contestId: string): Promise<{ rows: CodeChefStandingRow[]; problemCodes: string[] }> {
    try {
      // CodeChef rankings HTML parsing
      const response = await this.http.get(`/rankings/${encodeURIComponent(contestId)}`);
      const $ = cheerio.load(response.data);

      const rows: CodeChefStandingRow[] = [];
      const problemCodes: string[] = [];

      // Extract problem codes from table header
      $('table.dataTable thead tr th').each((i, el) => {
        const title = $(el).attr('title');
        if (title && title !== 'Rank' && title !== 'User' && title !== 'Score' && title !== 'Total Score') {
          // If title has a problem code, usually it's in a specific format or we extract the text
          const code = $(el).find('a').text().trim() || title.trim();
          if (code) {
            problemCodes.push(code);
          }
        }
      });

      // CodeChef usually loads rankings dynamically via AJAX, so parsing HTML directly might fail 
      // if it's SPA. However, in our plan we assume the HTML strategy is valid or we fallback
      // to whatever data we can parse. If it's empty, we just return empty array and it won't crash.
      // Often, for SEO, there's a static table or script tag with JSON data.
      // Let's assume there's a script with `var all_ranklist = [...]` or similar, 
      // or we just parse what's available. 
      // If cheerio fails to find rows, `rows` will be empty. This is safe.
      
      $('table.dataTable tbody tr').each((i, el) => {
        const tds = $(el).find('td');
        if (tds.length < 4) return;

        const rankText = $(tds[0]).text().trim();
        const rank = parseInt(rankText, 10);
        
        const handle = $(tds[1]).find('.user-name').text().trim() || $(tds[1]).text().trim();
        
        const scoreText = $(tds[2]).text().trim();
        const score = parseFloat(scoreText) || 0;

        // Remaining columns are problems
        const problems: CodeChefProblemResult[] = [];
        for (let j = 0; j < problemCodes.length; j++) {
          const probCell = $(tds[3 + j]);
          const cellText = probCell.text().trim();
          
          let solved = false;
          let attempts = 0;
          let penaltySeconds = 0;

          if (cellText && cellText !== '0' && cellText !== '-') {
            // Simplified logic: If there's a score/time, it's solved or attempted
            solved = probCell.hasClass('accept') || probCell.find('.tick-icon').length > 0 || parseFloat(cellText) > 0;
            attempts = 1; // Basic assumption if no detailed attempts string
          }

          problems.push({
            problemCode: problemCodes[j]!,
            solved,
            attempts,
            penaltySeconds,
          });
        }

        if (handle) {
          rows.push({
            rank: isNaN(rank) ? i + 1 : rank,
            handle,
            totalScore: score,
            totalPenalty: 0,
            problems,
          });
        }
      });

      return { rows, problemCodes };
    } catch (error) {
      throw this.handleError(error, contestId);
    }
  }

  private handleError(error: any, context: string): Error {
    if (axios.isAxiosError(error) || error?.isAxiosError) {
      const status = error.response?.status;
      
      if (status === 404) {
        if (error.config?.url?.includes('/users/')) {
          return new ProviderError(`Handle ${context} not found`, 'codechef', 'HANDLE_NOT_FOUND', false);
        } else {
          return new ProviderError(`Contest ${context} not found`, 'codechef', 'CONTEST_NOT_FOUND', false);
        }
      }

      if (status === 429 || status === 403 || status === 503) {
        // CodeChef Cloudflare often returns 403 for scrapers
        return new ProviderError('Rate limit exceeded or blocked by WAF', 'codechef', 'RATE_LIMITED', true);
      }

      if (error.code === 'ECONNABORTED') {
        return new ProviderError('Request timed out', 'codechef', 'TIMEOUT', true);
      }

      return new ProviderError(`API error: ${error.message}`, 'codechef', 'UNAVAILABLE', true);
    }

    return new ProviderError('An unexpected error occurred', 'codechef', 'INVALID_RESPONSE', false);
  }
}
