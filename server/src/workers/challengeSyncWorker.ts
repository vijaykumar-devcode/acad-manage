import cron, { ScheduledTask } from 'node-cron';
import { CodingChallenge } from '../models/CodingChallenge';
import { ChallengeParticipant } from '../models/ChallengeParticipant';
import { ChallengeSyncService } from '../services/challengeSyncService';
import { ProviderError } from '../providers/types';
import logger from '../utils/logger';

let syncTask: ScheduledTask | null = null;
let isRunning = false;

export const startSyncWorker = () => {
  if (syncTask) {
    logger.warn('Sync worker is already initialized');
    return;
  }

  logger.info('Initializing Automated Background Synchronization Worker');

  syncTask = cron.schedule('*/30 * * * *', async () => {
    if (isRunning) {
      logger.warn('Previous sync run is still in progress. Skipping this iteration.');
      return;
    }

    isRunning = true;
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const challenges = await CodingChallenge.find({
        isActive: true,
        publicationStatus: 'Published',
        startTime: { $lte: now },
        endTime: { $gte: yesterday },
      });

      for (const challenge of challenges) {
        const hasParticipants = await ChallengeParticipant.exists({ challengeId: challenge._id });
        if (!hasParticipants) {
          continue;
        }

        try {
          logger.info({ challengeId: challenge._id }, 'Worker triggering sync');
          await ChallengeSyncService.syncChallenge(challenge._id.toString());

          await new Promise((resolve) => setTimeout(resolve, 5000));
        } catch (error) {
          if (error instanceof ProviderError && error.code === 'RATE_LIMITED') {
            logger.warn(
              { challengeId: challenge._id, message: error.message },
              'Provider rate limit hit. Aborting current cron run.'
            );
            break;
          }

          logger.error(
            { challengeId: challenge._id, err: error },
            'Worker failed to sync individual challenge'
          );
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Fatal error in sync worker execution');
    } finally {
      isRunning = false;
    }
  });
};

export const stopSyncWorker = () => {
  if (syncTask) {
    syncTask.stop();
    syncTask = null;
    isRunning = false;
    logger.info('Sync worker stopped');
  }
};
