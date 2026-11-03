/**
 * Codeforces API Raw Response Types
 *
 * Internal to the Codeforces provider package. Raw API responses are parsed
 * and validated against these types before being transformed into normalized
 * CampusAssess domain types (ExternalUserInfo, ExternalContestInfo, etc.).
 *
 * Reference: https://codeforces.com/apiHelp
 */

export interface CFResponse<T> {
  status: 'OK' | 'FAILED';
  comment?: string;
  result?: T;
}

export interface CFUser {
  handle: string;
  email?: string;
  vkId?: string;
  openId?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  city?: string;
  organization?: string;
  contribution?: number;
  rank?: string;
  rating?: number;
  maxRank?: string;
  maxRating?: number;
  lastOnlineTimeSeconds?: number;
  registrationTimeSeconds?: number;
  friendOfCount?: number;
  avatar?: string;
  titlePhoto?: string;
}

export interface CFContest {
  id: number;
  name: string;
  type: 'CF' | 'IOI' | 'ICPC';
  phase: 'BEFORE' | 'CODING' | 'PENDING_SYSTEM_TEST' | 'SYSTEM_TEST' | 'FINISHED';
  frozen: boolean;
  durationSeconds: number;
  startTimeSeconds?: number;
  relativeTimeSeconds?: number;
  preparedBy?: string;
  websiteUrl?: string;
  description?: string;
  difficulty?: number;
  kind?: string;
  icpcRegion?: string;
  country?: string;
  city?: string;
  season?: string;
}

export interface CFMember {
  handle: string;
  name?: string;
}

export interface CFParty {
  contestId?: number;
  members: CFMember[];
  participantType: 'CONTESTANT' | 'PRACTICE' | 'VIRTUAL' | 'OFFICIAL' | 'OUT_OF_COMPETITION';
  teamId?: number;
  teamName?: string;
  ghost?: boolean;
  room?: number;
  startTimeSeconds?: number;
}

export interface CFProblem {
  contestId?: number;
  problemsetArchive?: string;
  index: string; // e.g. "A", "B", "C1"
  name: string;
  type: 'PROGRAMMING' | 'QUESTION';
  points?: number;
  rating?: number;
  tags?: string[];
}

export interface CFProblemResult {
  points: number; // e.g. 1.0 or 0.0
  penalty?: number;
  rejectedAttemptCount: number;
  type: 'FINAL' | 'PRELIMINARY';
  bestSubmissionTimeSeconds?: number;
}

export interface CFStandingRow {
  party: CFParty;
  rank: number;
  points: number;
  penalty: number;
  successfulHackCount: number;
  unsuccessfulHackCount: number;
  problemResults: CFProblemResult[];
  lastSubmissionTimeSeconds?: number;
  /** Rating change information present in some standing responses or rating change API */
  oldRating?: number;
  newRating?: number;
}

export interface CFStandingsResult {
  contest: CFContest;
  problems: CFProblem[];
  rows: CFStandingRow[];
}
