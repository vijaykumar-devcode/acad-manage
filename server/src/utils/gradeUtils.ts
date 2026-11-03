/**
 * Shared grade computation utilities (CQ-011).
 *
 * computeGrade() uses the stored GradeScale (admin-configurable) when available,
 * and falls back to a built-in default scale if none is configured.
 *
 * This eliminates copy-paste grade logic across markController and resultController.
 */

import { GradeScale, IGradeRule } from '../models/GradeScale';

export interface GradeResult {
  grade: string;
  status: 'Pass' | 'Fail';
}

/** Built-in default grade scale — mirrors the legacy hardcoded logic */
const DEFAULT_RULES: IGradeRule[] = [
  { grade: 'O', minPercentage: 90, maxPercentage: 100 },
  { grade: 'A+', minPercentage: 80, maxPercentage: 89.99 },
  { grade: 'A', minPercentage: 70, maxPercentage: 79.99 },
  { grade: 'B+', minPercentage: 60, maxPercentage: 69.99 },
  { grade: 'B', minPercentage: 50, maxPercentage: 59.99 },
  { grade: 'C', minPercentage: 40, maxPercentage: 49.99 },
  { grade: 'F', minPercentage: 0, maxPercentage: 39.99 },
];

/**
 * Computes the letter grade and pass/fail status for a given percentage.
 * Uses GradeScale rules from the database when available.
 *
 * @param percentage - The percentage score (0-100)
 * @param rules      - Optional rules override; if not provided, loads from DB
 */
export function computeGradeFromRules(percentage: number, rules: IGradeRule[]): GradeResult {
  if (rules.length === 0) return { grade: 'F', status: 'Fail' };

  const sorted = [...rules].sort((a, b) => b.minPercentage - a.minPercentage);

  // The lowest-ranked rule (lowest minPercentage) is the failing band
  const lowestRule = [...rules].sort((a, b) => a.minPercentage - b.minPercentage)[0];

  for (const rule of sorted) {
    if (percentage >= rule.minPercentage) {
      // A grade is Fail if it is the lowest-ranked rule (the catch-all failing band)
      const isFailing =
        rule.grade === lowestRule.grade && rule.minPercentage === lowestRule.minPercentage;
      const status = isFailing ? 'Fail' : 'Pass';
      return { grade: rule.grade, status };
    }
  }

  return { grade: lowestRule.grade, status: 'Fail' };
}

/**
 * Fetches the active GradeScale from the database (singleton pattern — only one
 * grade scale document is expected). Falls back to DEFAULT_RULES if none exists.
 *
 * Callers that process many records should call this once and pass the rules
 * to computeGradeFromRules() in a loop to avoid repeated DB round-trips.
 */
export async function fetchGradeRules(): Promise<IGradeRule[]> {
  const scale = await GradeScale.findOne().sort({ createdAt: -1 });
  return scale && scale.rules.length > 0 ? scale.rules : DEFAULT_RULES;
}
