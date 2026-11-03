import crypto from 'node:crypto';
import * as cheerio from 'cheerio';
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
import { AtcoderApiClient } from './atcoder.client';
import { AtCoderStandingsRow, AtCoderTaskInfo, AtCoderTaskResult } from './atcoder.types';

export class AtcoderProvider implements CompetitiveProgrammingProvider, VerificationCapable {
  readonly platformId: CodingPlatformId = 'atcoder';
  readonly displayName = 'AtCoder';
  readonly allowedDomains = ['atcoder.jp'];
  readonly capabilities: ProviderCapabilities = {
    verification: true,
    ratings: true,
  };

  private readonly client: AtcoderApiClient;

  constructor(client?: AtcoderApiClient) {
    this.client = client ?? new AtcoderApiClient();
  }

  normalizeHandle(handle: string): string {
    return handle.trim();
  }

  async fetchUserInfo(handle: string): Promise<ExternalUserInfo | null> {
    const normalized = this.normalizeHandle(handle);
    if (!normalized) return null;

    try {
      const html = await this.client.getUserProfileHtml(normalized);
      const $ = cheerio.load(html);
      
      const affiliationRow = $('th:contains("Affiliation")').parent();
      const affiliation = affiliationRow.find('td').text().trim();
      
      let rating = undefined;
      const ratingRow = $('th:contains("Rating")').parent();
      const ratingText = ratingRow.find('span').first().text();
      if (ratingText && !isNaN(parseInt(ratingText, 10))) {
        rating = parseInt(ratingText, 10);
      }
      
      let maxRating = undefined;
      const maxRatingRow = $('th:contains("Highest Rating")').parent();
      const maxRatingText = maxRatingRow.find('span').first().text();
      if (maxRatingText && !isNaN(parseInt(maxRatingText, 10))) {
        maxRating = parseInt(maxRatingText, 10);
      }

      return {
        handle: normalized,
        rating,
        maxRating,
        profileFields: {
          affiliation,
        },
      };
    } catch (err: unknown) {
      if (err instanceof ProviderError && err.code === 'HANDLE_NOT_FOUND') {
        return null;
      }
      throw err;
    }
  }

  generateVerificationToken(): string {
    const randomHex = crypto.randomBytes(8).toString('hex');
    return `campusassess_v_${randomHex}`;
  }

  async checkVerification(handle: string, rawToken: string): Promise<boolean> {
    if (!rawToken || !handle) return false;
    const userInfo = await this.fetchUserInfo(handle);
    if (!userInfo) return false;

    const tokenTrimmed = rawToken.trim();
    const affiliation = userInfo.profileFields['affiliation'] ?? '';

    return affiliation.includes(tokenTrimmed);
  }

  getVerificationInstructions(token: string): string {
    return `To verify ownership, open your AtCoder Basic Settings (https://atcoder.jp/settings) and temporarily set your "Affiliation" to: ${token}`;
  }

  async fetchContestInfo(externalContestId: string): Promise<ExternalContestInfo | null> {
    const idTrimmed = externalContestId.trim();
    if (!idTrimmed) return null;

    try {
      // Fetch standings to get contest metadata if not easily available elsewhere, 
      // but usually we might need to parse HTML or just use placeholder if AtCoder API lacks it.
      // AtCoder Standings JSON does not contain startTime/duration explicitly unfortunately.
      // However, we can fetch the contest page HTML to parse it, OR we just require manual input.
      // For now, we will return a minimal structure. The backend usually saves what the Faculty inputted.
      // The instructions say: "Implement AtCoder standings using the planned standings/json endpoint and use profile HTML only for verification."
      // Since we shouldn't scrape contest HTML, we return a fallback or 0.
      return {
        externalContestId: idTrimmed,
        name: idTrimmed,
        startTimeSeconds: 0,
        durationSeconds: 0,
      };
    } catch (err: unknown) {
      if (err instanceof ProviderError && err.code === 'CONTEST_NOT_FOUND') {
        return null;
      }
      throw err;
    }
  }

  async fetchStandings(externalContestId: string, handles: string[]): Promise<ExternalStanding[]> {
    const idTrimmed = externalContestId.trim();
    if (!idTrimmed || handles.length === 0) return [];

    const normalizedHandles = handles.map(h => this.normalizeHandle(h)).filter(h => h.length > 0);
    if (normalizedHandles.length === 0) return [];

    try {
      const standingsData = await this.client.getContestStandings(idTrimmed);
      const taskInfo = standingsData.TaskInfo;
      const totalProblems = taskInfo.length;

      const handleSet = new Set(normalizedHandles);
      const filteredRows = standingsData.StandingsData.filter(row => handleSet.has(row.UserScreenName));

      return filteredRows.map(row => this.mapStandingRow(row, taskInfo, totalProblems));
    } catch (err: unknown) {
      if (err instanceof ProviderError && err.code === 'CONTEST_NOT_FOUND') {
        return [];
      }
      throw err;
    }
  }

  buildContestUrl(externalContestId: string): string {
    const cleanId = externalContestId.trim();
    return `https://atcoder.jp/contests/${cleanId}`;
  }

  isValidContestUrl(url: string): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      const hostLower = parsed.hostname.toLowerCase();

      const isAllowedHost = this.allowedDomains.includes(hostLower);
      if (!isAllowedHost) return false;

      const contestPathPattern = /^\/contests\/[a-zA-Z0-9_-]+(\/.*)?$/i;
      return contestPathPattern.test(parsed.pathname);
    } catch {
      return false;
    }
  }

  normalizeParticipationType(providerType: string): ParticipationStatus {
    // AtCoder doesn't provide explicit participation types in JSON typically, 
    // it just has IsRated and Competitions count, but everyone in the standings is a Contestant (or unrated).
    return 'Contestant';
  }

  private mapStandingRow(
    row: AtCoderStandingsRow,
    taskInfo: AtCoderTaskInfo[],
    totalProblems: number
  ): ExternalStanding {
    const problemResults: ExternalProblemResult[] = taskInfo.map(task => {
      const taskRes = row.TaskResults[task.TaskScreenName];
      return this.mapProblemResult(taskRes, task.TaskScreenName, task.TaskAssignment || task.TaskName);
    });

    let ratingChange: number | undefined;
    if (row.OldRating !== undefined && row.Rating !== undefined && row.IsRated) {
      ratingChange = row.Rating - row.OldRating;
    }

    // Elapsed is the total time (including penalty if applicable) in nanoseconds.
    // Penalty on AtCoder standings JSON is the count of wrong submissions, not time.
    const penaltySeconds = Math.floor((row.TotalResult.Elapsed || 0) / 1e9);

    return {
      handle: row.UserScreenName,
      rank: row.Rank,
      solvedCount: row.TotalResult.Accepted,
      totalProblems,
      penaltySeconds,
      ratingBefore: row.OldRating,
      ratingAfter: row.Rating,
      ratingChange,
      participationType: 'Contestant',
      problems: problemResults,
    };
  }

  private mapProblemResult(
    taskRes: AtCoderTaskResult | undefined,
    problemId: string,
    problemName: string
  ): ExternalProblemResult {
    if (!taskRes) {
      return {
        problemId,
        problemName,
        solved: false,
        attempts: 0,
        penaltySeconds: 0,
      };
    }

    const solved = taskRes.Status === 1 || taskRes.Score > 0;
    const attempts = taskRes.Failure + (solved ? 1 : 0);
    const penaltySeconds = taskRes.Penalty || 0;
    // Elapsed is in nanoseconds, convert to seconds
    const solvedAtSeconds = taskRes.Elapsed ? Math.floor(taskRes.Elapsed / 1000000000) : undefined;

    return {
      problemId,
      problemName,
      solved,
      attempts,
      penaltySeconds,
      solvedAtSeconds,
    };
  }
}
