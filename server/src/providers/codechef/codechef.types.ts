export interface CodeChefUserInfoResponse {
  code: number;
  message: string;
  // This endpoint might just return basic info or empty list if the user exists
  // but if the user doesn't exist, it usually returns an error or code != 200
  // Often, we can also just scrape the profile page `<h1 class="h2-style">tourist</h1>`
}

export interface CodeChefProblemResult {
  problemCode: string;
  solved: boolean;
  attempts: number;
  penaltySeconds: number;
}

export interface CodeChefStandingRow {
  rank: number;
  handle: string;
  totalScore: number;
  totalPenalty: number;
  problems: CodeChefProblemResult[];
}
