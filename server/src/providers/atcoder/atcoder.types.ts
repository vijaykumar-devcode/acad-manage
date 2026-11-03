export interface AtCoderTaskInfo {
  TaskScreenName: string;
  TaskName: string;
  TaskAssignment: string;
}

export interface AtCoderTaskResult {
  Count: number;
  Failure: number;
  Penalty: number;
  Score: number;
  Elapsed: number; // In nanoseconds
  Status: number;  // 1 = AC
  Pending: boolean;
}

export interface AtCoderStandingsRow {
  Rank: number;
  UserScreenName: string;
  UserIsDeleted: boolean;
  Affiliation: string;
  Country: string;
  Rating: number;
  OldRating: number;
  IsRated: boolean;
  Competitions: number;
  TotalResult: {
    Count: number;
    Score: number;
    Penalty: number;
    Accepted: number;
    Elapsed: number;
  };
  TaskResults: Record<string, AtCoderTaskResult>;
}

export interface AtCoderStandingsResponse {
  Fixed: boolean;
  TaskInfo: AtCoderTaskInfo[];
  StandingsData: AtCoderStandingsRow[];
}
