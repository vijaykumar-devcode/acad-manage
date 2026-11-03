import { describe, it, expect } from 'vitest';
import { computeEffectiveStatus } from '../../src/utils/challengeUtils';

describe('computeEffectiveStatus', () => {
  // Fixed test dates — all in UTC to avoid timezone ambiguity
  const startTime = new Date('2024-06-15T10:00:00Z');
  const endTime = new Date('2024-06-15T14:00:00Z');

  // ── Draft states ────────────────────────────────────────────────────────

  it('returns Draft when publicationStatus is Draft', () => {
    const result = computeEffectiveStatus(
      { publicationStatus: 'Draft', startTime, endTime },
      new Date('2024-06-15T12:00:00Z') // mid-contest, but unpublished
    );
    expect(result).toBe('Draft');
  });

  it('returns Draft for any non-Published publicationStatus', () => {
    const result = computeEffectiveStatus(
      { publicationStatus: 'Unpublished', startTime, endTime },
      new Date('2024-06-15T12:00:00Z')
    );
    expect(result).toBe('Draft');
  });

  it('returns Draft even if now is after endTime when not Published', () => {
    const result = computeEffectiveStatus(
      { publicationStatus: 'Draft', startTime, endTime },
      new Date('2024-06-16T00:00:00Z') // well past endTime
    );
    expect(result).toBe('Draft');
  });

  // ── Upcoming state ──────────────────────────────────────────────────────

  it('returns Upcoming when published and now is before startTime', () => {
    const result = computeEffectiveStatus(
      { publicationStatus: 'Published', startTime, endTime },
      new Date('2024-06-15T09:00:00Z')
    );
    expect(result).toBe('Upcoming');
  });

  it('returns Upcoming 1ms before startTime', () => {
    const result = computeEffectiveStatus(
      { publicationStatus: 'Published', startTime, endTime },
      new Date(startTime.getTime() - 1)
    );
    expect(result).toBe('Upcoming');
  });

  // ── Active state ────────────────────────────────────────────────────────

  it('returns Active exactly at startTime', () => {
    const result = computeEffectiveStatus(
      { publicationStatus: 'Published', startTime, endTime },
      new Date(startTime.getTime()) // exactly startTime
    );
    expect(result).toBe('Active');
  });

  it('returns Active 1ms after startTime', () => {
    const result = computeEffectiveStatus(
      { publicationStatus: 'Published', startTime, endTime },
      new Date(startTime.getTime() + 1)
    );
    expect(result).toBe('Active');
  });

  it('returns Active during the contest', () => {
    const result = computeEffectiveStatus(
      { publicationStatus: 'Published', startTime, endTime },
      new Date('2024-06-15T12:00:00Z')
    );
    expect(result).toBe('Active');
  });

  it('returns Active 1ms before endTime', () => {
    const result = computeEffectiveStatus(
      { publicationStatus: 'Published', startTime, endTime },
      new Date(endTime.getTime() - 1)
    );
    expect(result).toBe('Active');
  });

  // ── Ended state ─────────────────────────────────────────────────────────

  it('returns Ended exactly at endTime', () => {
    const result = computeEffectiveStatus(
      { publicationStatus: 'Published', startTime, endTime },
      new Date(endTime.getTime()) // exactly endTime
    );
    expect(result).toBe('Ended');
  });

  it('returns Ended 1ms after endTime', () => {
    const result = computeEffectiveStatus(
      { publicationStatus: 'Published', startTime, endTime },
      new Date(endTime.getTime() + 1)
    );
    expect(result).toBe('Ended');
  });

  it('returns Ended well after endTime', () => {
    const result = computeEffectiveStatus(
      { publicationStatus: 'Published', startTime, endTime },
      new Date('2024-06-20T00:00:00Z') // 5 days later
    );
    expect(result).toBe('Ended');
  });

  // ── Timezone consistency ────────────────────────────────────────────────

  it('handles dates consistently regardless of timezone offset in constructor', () => {
    // These represent the same moments in time despite different offset strings
    const start = new Date('2024-06-15T10:00:00+05:30');
    const end = new Date('2024-06-15T14:00:00+05:30');
    const now = new Date('2024-06-15T12:00:00+05:30');

    const result = computeEffectiveStatus(
      { publicationStatus: 'Published', startTime: start, endTime: end },
      now
    );
    expect(result).toBe('Active');
  });

  // ── Default now parameter ──────────────────────────────────────────────

  it('defaults to current time when now is omitted', () => {
    // Use a start time far in the future so we reliably get 'Upcoming'
    const futureStart = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const futureEnd = new Date(futureStart.getTime() + 4 * 60 * 60 * 1000);

    const result = computeEffectiveStatus({
      publicationStatus: 'Published',
      startTime: futureStart,
      endTime: futureEnd,
    });
    expect(result).toBe('Upcoming');
  });
});
