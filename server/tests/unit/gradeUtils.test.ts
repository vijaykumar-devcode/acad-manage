import { describe, it, expect } from 'vitest';
import { computeGradeFromRules } from '../../src/utils/gradeUtils';
import type { IGradeRule } from '../../src/models/GradeScale';

const DEFAULT_RULES: IGradeRule[] = [
  { grade: 'O',  minPercentage: 90, maxPercentage: 100 },
  { grade: 'A+', minPercentage: 80, maxPercentage: 89.99 },
  { grade: 'A',  minPercentage: 70, maxPercentage: 79.99 },
  { grade: 'B+', minPercentage: 60, maxPercentage: 69.99 },
  { grade: 'B',  minPercentage: 50, maxPercentage: 59.99 },
  { grade: 'C',  minPercentage: 40, maxPercentage: 49.99 },
  { grade: 'F',  minPercentage: 0,  maxPercentage: 39.99 },
];

describe('computeGradeFromRules', () => {
  it('returns O and Pass for 100%', () => {
    expect(computeGradeFromRules(100, DEFAULT_RULES)).toEqual({ grade: 'O', status: 'Pass' });
  });

  it('returns O and Pass for exactly 90%', () => {
    expect(computeGradeFromRules(90, DEFAULT_RULES)).toEqual({ grade: 'O', status: 'Pass' });
  });

  it('returns A+ for 85%', () => {
    expect(computeGradeFromRules(85, DEFAULT_RULES)).toEqual({ grade: 'A+', status: 'Pass' });
  });

  it('returns A for 70%', () => {
    expect(computeGradeFromRules(70, DEFAULT_RULES)).toEqual({ grade: 'A', status: 'Pass' });
  });

  it('returns B+ for 65%', () => {
    expect(computeGradeFromRules(65, DEFAULT_RULES)).toEqual({ grade: 'B+', status: 'Pass' });
  });

  it('returns B for 55%', () => {
    expect(computeGradeFromRules(55, DEFAULT_RULES)).toEqual({ grade: 'B', status: 'Pass' });
  });

  it('returns C for 45%', () => {
    expect(computeGradeFromRules(45, DEFAULT_RULES)).toEqual({ grade: 'C', status: 'Pass' });
  });

  it('returns F and Fail for 39%', () => {
    expect(computeGradeFromRules(39, DEFAULT_RULES)).toEqual({ grade: 'F', status: 'Fail' });
  });

  it('returns F and Fail for 0%', () => {
    expect(computeGradeFromRules(0, DEFAULT_RULES)).toEqual({ grade: 'F', status: 'Fail' });
  });

  it('returns F and Fail for empty rules array', () => {
    expect(computeGradeFromRules(95, [])).toEqual({ grade: 'F', status: 'Fail' });
  });

  it('supports custom grade scale', () => {
    const customRules: IGradeRule[] = [
      { grade: 'Distinction', minPercentage: 75, maxPercentage: 100 },
      { grade: 'Credit',      minPercentage: 50, maxPercentage: 74.99 },
      { grade: 'Fail',        minPercentage: 0,  maxPercentage: 49.99 },
    ];
    expect(computeGradeFromRules(80, customRules)).toEqual({ grade: 'Distinction', status: 'Pass' });
    expect(computeGradeFromRules(60, customRules)).toEqual({ grade: 'Credit', status: 'Pass' });
    expect(computeGradeFromRules(40, customRules)).toEqual({ grade: 'Fail', status: 'Fail' });
  });

  it('handles boundary exactly at 40 (C, not F)', () => {
    expect(computeGradeFromRules(40, DEFAULT_RULES)).toEqual({ grade: 'C', status: 'Pass' });
  });
});
