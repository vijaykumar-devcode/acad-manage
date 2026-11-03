/**
 * Challenge status utility — computes the effective contest state.
 *
 * Effective status is derived from publicationStatus and time, not stored
 * in the database. This mirrors the existing computeQuizStatus() pattern
 * in quizUtils.ts.
 *
 * publicationStatus === 'Draft'                         → Draft
 * publicationStatus === 'Published' + now < startTime   → Upcoming
 * publicationStatus === 'Published' + startTime ≤ now < endTime → Active
 * publicationStatus === 'Published' + now ≥ endTime     → Ended
 */

export type EffectiveStatus = 'Draft' | 'Upcoming' | 'Active' | 'Ended';

/**
 * Compute the effective contest status from publication state and time.
 *
 * Uses Date.getTime() for millisecond-precision comparisons, avoiding
 * timezone and string-formatting issues. Behavior is deterministic and
 * consistent regardless of server timezone.
 *
 * @param challenge - Object with publicationStatus, startTime, endTime
 * @param now       - Current time; defaults to new Date(). Injectable for testing.
 */
export function computeEffectiveStatus(
  challenge: { publicationStatus: string; startTime: Date; endTime: Date },
  now: Date = new Date()
): EffectiveStatus {
  if (challenge.publicationStatus !== 'Published') {
    return 'Draft';
  }

  const nowMs = now.getTime();
  const startMs = new Date(challenge.startTime).getTime();
  const endMs = new Date(challenge.endTime).getTime();

  if (nowMs < startMs) return 'Upcoming';
  if (nowMs < endMs) return 'Active';
  return 'Ended';
}
