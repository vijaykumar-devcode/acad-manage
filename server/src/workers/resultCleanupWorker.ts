import cron, { ScheduledTask } from 'node-cron';
import { CodingChallenge } from '../models/CodingChallenge';
import { ContestResult } from '../models/ContestResult';
import { ContestProblemResult } from '../models/ContestProblemResult';
import { ChallengeParticipant } from '../models/ChallengeParticipant';
import logger from '../utils/logger';

let cleanupTask: ScheduledTask | null = null;

const STALE_DAYS = 7;

/**
 * Purges all participant and result data for challenges whose endTime was
 * more than STALE_DAYS days ago, then resets those challenges so they can
 * be reused for a new contest without creating a new card.
 */
export const runResultCleanup = async (): Promise<void> => {
  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

  const staleChallenges = await CodingChallenge.find({
    isActive: true,
    endTime: { $lt: cutoff },
    participantCount: { $gt: 0 },
  }).lean();

  if (staleChallenges.length === 0) {
    logger.info('Result cleanup: no stale challenges found');
    return;
  }

  logger.info({ count: staleChallenges.length }, 'Result cleanup: beginning purge of stale challenge data');

  for (const challenge of staleChallenges) {
    try {
      const challengeId = challenge._id;

      const [contestResults, problemResults, participants] = await Promise.all([
        ContestResult.deleteMany({ challengeId }),
        ContestProblemResult.deleteMany({ challengeId }),
        ChallengeParticipant.deleteMany({ challengeId }),
      ]);

      await CodingChallenge.updateOne(
        { _id: challengeId },
        {
          $set: {
            participantCount: 0,
            syncStatus: 'NotRequired',
            syncAttempts: 0,
            lastSyncAttemptAt: null,
            lastSuccessfulSyncAt: null,
            lastSyncError: null,
          },
        }
      );

      logger.info(
        {
          challengeId,
          title: challenge.title,
          endTime: challenge.endTime,
          deletedContestResults: contestResults.deletedCount,
          deletedProblemResults: problemResults.deletedCount,
          deletedParticipants: participants.deletedCount,
        },
        'Result cleanup: stale challenge data purged'
      );
    } catch (err) {
      logger.error({ err, challengeId: challenge._id }, 'Result cleanup: failed to purge challenge');
    }
  }
};

export const startCleanupWorker = () => {
  if (cleanupTask) {
    logger.warn('Result cleanup worker is already initialized');
    return;
  }

  logger.info('Initializing Automated Result Cleanup Worker (runs daily at 02:00)');

  cleanupTask = cron.schedule('0 2 * * *', async () => {
    logger.info('Result cleanup worker triggered');
    try {
      await runResultCleanup();
    } catch (err) {
      logger.error({ err }, 'Fatal error in result cleanup worker');
    }
  });
};

export const stopCleanupWorker = () => {
  if (cleanupTask) {
    cleanupTask.stop();
    cleanupTask = null;
    logger.info('Result cleanup worker stopped');
  }
};
