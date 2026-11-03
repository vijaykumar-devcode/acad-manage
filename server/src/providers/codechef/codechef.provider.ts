import {
  type CompetitiveProgrammingProvider,
  type CodingPlatformId,
  type ProviderCapabilities,
  type ExternalUserInfo,
  type ExternalContestInfo,
  type ExternalStanding,
  type ExternalProblemResult,
  type ParticipationStatus,
  ProviderError,
} from '../types';
import { CodechefApiClient } from './codechef.client';
import { CodeChefStandingRow, CodeChefProblemResult } from './codechef.types';

export class CodechefProvider implements CompetitiveProgrammingProvider {
  readonly platformId: CodingPlatformId = 'codechef';
  readonly displayName = 'CodeChef';
  readonly allowedDomains = ['www.codechef.com', 'codechef.com'];
  readonly capabilities: ProviderCapabilities = {
    verification: false, // Explicitly unsupported per Phase 10 plan
    ratings: false, // Ratings usually not available in live ranklists easily
  };

  private readonly client: CodechefApiClient;

  constructor(client?: CodechefApiClient) {
    this.client = client ?? new CodechefApiClient();
  }

  normalizeHandle(handle: string): string {
    return handle.trim();
  }

  async fetchUserInfo(handle: string): Promise<ExternalUserInfo | null> {
    const normalized = this.normalizeHandle(handle);
    if (!normalized) return null;

    try {
      const exists = await this.client.checkUserExists(normalized);
      if (!exists) return null;

      // We only return minimal info since we can't reliably scrape everything without APIs
      return {
        handle: normalized,
        profileFields: {},
      };
    } catch (err: unknown) {
      if (err instanceof ProviderError && err.code === 'HANDLE_NOT_FOUND') {
        return null;
      }
      throw err;
    }
  }

  async fetchContestInfo(externalContestId: string): Promise<ExternalContestInfo | null> {
    const idTrimmed = externalContestId.trim();
    if (!idTrimmed) return null;

    try {
      // Again, minimal metadata since we don't have a structured API
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
      const { rows, problemCodes } = await this.client.getContestStandings(idTrimmed);
      const totalProblems = problemCodes.length;

      const handleSet = new Set(normalizedHandles.map(h => h.toLowerCase()));
      const filteredRows = rows.filter(row => handleSet.has(row.handle.toLowerCase()));

      return filteredRows.map(row => this.mapStandingRow(row, totalProblems));
    } catch (err: unknown) {
      if (err instanceof ProviderError && err.code === 'CONTEST_NOT_FOUND') {
        return [];
      }
      throw err;
    }
  }

  buildContestUrl(externalContestId: string): string {
    const cleanId = externalContestId.trim();
    return `https://www.codechef.com/${cleanId}`;
  }

  isValidContestUrl(url: string): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      const hostLower = parsed.hostname.toLowerCase();

      const isAllowedHost = this.allowedDomains.includes(hostLower);
      if (!isAllowedHost) return false;

      // CodeChef paths can be /START100 or /rankings/START100
      return parsed.pathname.length > 1;
    } catch {
      return false;
    }
  }

  normalizeParticipationType(providerType: string): ParticipationStatus {
    return 'Contestant';
  }

  private mapStandingRow(
    row: CodeChefStandingRow,
    totalProblems: number
  ): ExternalStanding {
    const problemResults: ExternalProblemResult[] = row.problems.map(p => this.mapProblemResult(p));
    const solvedCount = problemResults.filter(p => p.solved).length;

    return {
      handle: row.handle,
      rank: row.rank,
      solvedCount,
      totalProblems,
      penaltySeconds: row.totalPenalty,
      participationType: 'Contestant',
      problems: problemResults,
    };
  }

  private mapProblemResult(p: CodeChefProblemResult): ExternalProblemResult {
    return {
      problemId: p.problemCode,
      problemName: p.problemCode,
      solved: p.solved,
      attempts: p.attempts,
      penaltySeconds: p.penaltySeconds,
    };
  }
}
