/**
 * Shared utilities for the quiz domain.
 * Extracted here to eliminate copy-paste across quizController (CQ-004).
 */

type QuizStatus = 'Draft' | 'Scheduled' | 'Active' | 'Closed';

/**
 * Determines the current status of a quiz based on its time window.
 *
 * @param startTime - Quiz start time
 * @param endTime - Quiz end time
 * @returns The computed QuizStatus
 */
export function computeQuizStatus(startTime: Date, endTime: Date): QuizStatus {
  const now = new Date();
  if (now >= startTime && now <= endTime) return 'Active';
  if (now > endTime) return 'Closed';
  return 'Scheduled';
}
