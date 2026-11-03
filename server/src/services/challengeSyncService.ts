import mongoose from 'mongoose';
import { CodingChallenge } from '../models/CodingChallenge';
import { ChallengeParticipant } from '../models/ChallengeParticipant';
import { ContestResult } from '../models/ContestResult';
import { ContestProblemResult } from '../models/ContestProblemResult';
import { getProvider } from '../providers/registry';
import { ProviderError, ExternalStanding } from '../providers/types';

export class ChallengeSyncService {
  /**
   * Synchronizes a coding challenge by fetching standings from the external provider
   * and updating the local database with idempotent bulk writes.
   */
  static async syncChallenge(challengeId: string | mongoose.Types.ObjectId): Promise<void> {
    const challenge = await CodingChallenge.findById(challengeId);
    if (!challenge) {
      throw new Error(`CodingChallenge with ID ${challengeId} not found`);
    }

    // 1. STALE SYNC RECOVERY & CONCURRENCY CHECK
    const now = new Date();
    if (challenge.syncStatus === 'Syncing') {
      const tenMinutes = 10 * 60 * 1000;
      if (
        challenge.lastSyncAttemptAt &&
        now.getTime() - challenge.lastSyncAttemptAt.getTime() < tenMinutes
      ) {
        throw new Error('Synchronization is already in progress');
      }
      // If older than 10 mins, it's stale; we can recover and proceed.
    }

    // Mark as syncing
    challenge.syncStatus = 'Syncing';
    challenge.syncAttempts += 1;
    challenge.lastSyncAttemptAt = now;
    await challenge.save();

    try {
      // 2. FETCH SNAPSHOT HANDLES
      const participants = await ChallengeParticipant.find({ challengeId: challenge._id }).lean();
      if (participants.length === 0) {
        // No participants to sync, mark as Synced directly
        challenge.syncStatus = 'Synced';
        challenge.syncAttempts = 0;
        challenge.lastSuccessfulSyncAt = new Date();
        challenge.lastSyncError = undefined;
        await challenge.save();
        return;
      }

      const handles = participants.map((p) => p.handle);

      // 3. QUERY PROVIDER
      const provider = getProvider(challenge.platform);
      if (!provider) {
        throw new Error(`Provider not found for platform: ${challenge.platform}`);
      }

      // This throws a ProviderError on failure (authoritative response requirement)
      const standings = await provider.fetchStandings(challenge.externalContestId, handles);

      const standingsMap = new Map<string, ExternalStanding>(standings.map((s) => [s.handle, s]));

      // 4. MAP TO BULK OPS
      const resultOps = [];

      for (const participant of participants) {
        const standing = standingsMap.get(participant.handle);

        let updateData: any = {
          platform: challenge.platform,
          syncedAt: new Date(),
        };

        if (standing) {
          updateData = {
            ...updateData,
            providerRank: standing.rank,
            solvedCount: standing.solvedCount,
            totalProblems: standing.totalProblems,
            penalty: standing.penaltySeconds,
            ratingBefore: standing.ratingBefore ?? null,
            ratingAfter: standing.ratingAfter ?? null,
            ratingChange: standing.ratingChange ?? null,
            participationStatus: provider.normalizeParticipationType(standing.participationType),
          };
        } else {
          // DidNotParticipate logic
          updateData = {
            ...updateData,
            providerRank: 0,
            solvedCount: 0,
            totalProblems: 0,
            penalty: 0,
            ratingBefore: null,
            ratingAfter: null,
            ratingChange: null,
            participationStatus: 'DidNotParticipate',
          };
        }

        resultOps.push({
          updateOne: {
            filter: { challengeId: challenge._id, studentId: participant.studentId },
            update: { $set: updateData },
            upsert: true,
          },
        });
      }

      // Execute ContestResult Upserts
      await ContestResult.bulkWrite(resultOps, { ordered: false });

      // Fetch the upserted ContestResults to get their _ids for the child records
      const savedResults = await ContestResult.find({ challengeId: challenge._id }).lean();
      const studentResultMap = new Map(savedResults.map((r) => [r.studentId.toString(), r._id]));

      // Prepare ContestProblemResult bulk ops
      const problemOps: any[] = [];
      for (const participant of participants) {
        const standing = standingsMap.get(participant.handle);
        if (!standing) continue;

        const contestResultId = studentResultMap.get(participant.studentId.toString());
        if (!contestResultId) continue;

        for (const problem of standing.problems) {
          let solvedAtVal: Date | undefined = undefined;
          if (problem.solvedAtSeconds !== undefined) {
            const contestStart = challenge.startTime.getTime();
            solvedAtVal = new Date(contestStart + problem.solvedAtSeconds * 1000);
          }

          problemOps.push({
            updateOne: {
              filter: {
                challengeId: challenge._id,
                studentId: participant.studentId,
                problemId: problem.problemId,
              },
              update: {
                $set: {
                  contestResultId,
                  problemName: problem.problemName,
                  solved: problem.solved,
                  attempts: problem.attempts,
                  penalty: problem.penaltySeconds,
                  solvedAt: solvedAtVal,
                },
              },
              upsert: true,
            },
          });
        }
      }

      if (problemOps.length > 0) {
        await ContestProblemResult.bulkWrite(problemOps, { ordered: false });
      }

      // 5. SUCCESS STATE
      challenge.syncStatus = 'Synced';
      challenge.syncAttempts = 0; // Reset consecutive failures
      challenge.lastSuccessfulSyncAt = new Date();
      challenge.lastSyncError = undefined;
      await challenge.save();
    } catch (error: any) {
      // 6. FAILURE STATE
      challenge.syncStatus = 'Failed';

      // Store sanitized representation
      if (error instanceof ProviderError) {
        challenge.lastSyncError = `[${error.code}] ${error.message}`;
      } else {
        // Fallback for unexpected internal errors (prevent leaking raw stack traces)
        challenge.lastSyncError = 'An unexpected internal error occurred during synchronization';
        console.error('ChallengeSyncService Internal Error:', error); // Server-side log only
      }

      await challenge.save();
      throw error;
    }
  }
}
