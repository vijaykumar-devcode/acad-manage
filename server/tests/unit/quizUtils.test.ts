import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeQuizStatus } from '../../src/utils/quizUtils';

describe('computeQuizStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns Active when now is between start and end', () => {
    const now = new Date('2024-06-15T10:00:00Z');
    vi.setSystemTime(now);
    const start = new Date('2024-06-15T09:00:00Z');
    const end = new Date('2024-06-15T11:00:00Z');
    expect(computeQuizStatus(start, end)).toBe('Active');
  });

  it('returns Scheduled when now is before start', () => {
    const now = new Date('2024-06-15T08:00:00Z');
    vi.setSystemTime(now);
    const start = new Date('2024-06-15T09:00:00Z');
    const end = new Date('2024-06-15T11:00:00Z');
    expect(computeQuizStatus(start, end)).toBe('Scheduled');
  });

  it('returns Closed when now is after end', () => {
    const now = new Date('2024-06-15T12:00:00Z');
    vi.setSystemTime(now);
    const start = new Date('2024-06-15T09:00:00Z');
    const end = new Date('2024-06-15T11:00:00Z');
    expect(computeQuizStatus(start, end)).toBe('Closed');
  });

  it('returns Active when now equals startTime exactly', () => {
    const now = new Date('2024-06-15T09:00:00Z');
    vi.setSystemTime(now);
    const start = new Date('2024-06-15T09:00:00Z');
    const end = new Date('2024-06-15T11:00:00Z');
    expect(computeQuizStatus(start, end)).toBe('Active');
  });

  it('returns Active when now equals endTime exactly', () => {
    const now = new Date('2024-06-15T11:00:00Z');
    vi.setSystemTime(now);
    const start = new Date('2024-06-15T09:00:00Z');
    const end = new Date('2024-06-15T11:00:00Z');
    expect(computeQuizStatus(start, end)).toBe('Active');
  });

  it('returns Closed when now is 1ms past endTime', () => {
    const end = new Date('2024-06-15T11:00:00Z');
    vi.setSystemTime(new Date(end.getTime() + 1));
    const start = new Date('2024-06-15T09:00:00Z');
    expect(computeQuizStatus(start, end)).toBe('Closed');
  });
});
