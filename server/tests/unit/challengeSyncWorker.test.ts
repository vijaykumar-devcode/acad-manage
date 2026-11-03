import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import cron from 'node-cron';
import { startSyncWorker, stopSyncWorker } from '../../src/workers/challengeSyncWorker';
import { CodingChallenge } from '../../src/models/CodingChallenge';
import { ChallengeParticipant } from '../../src/models/ChallengeParticipant';
import { ChallengeSyncService } from '../../src/services/challengeSyncService';
import { ProviderError } from '../../src/providers/types';
import logger from '../../src/utils/logger';

vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(),
  }
}));

vi.mock('../../src/models/CodingChallenge');
vi.mock('../../src/models/ChallengeParticipant');
vi.mock('../../src/services/challengeSyncService');
vi.mock('../../src/utils/logger', () => ({
  default: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }
}));

describe('challengeSyncWorker', () => {
  let cronCallback: () => Promise<void>;
  let mockStop: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockStop = vi.fn();
    vi.mocked(cron.schedule).mockImplementation((expr, cb) => {
      cronCallback = cb as any;
      return { stop: mockStop } as any;
    });
  });

  afterEach(() => {
    stopSyncWorker();
    vi.useRealTimers();
  });

  it('should initialize idempotently', () => {
    startSyncWorker();
    expect(cron.schedule).toHaveBeenCalledTimes(1);

    startSyncWorker();
    expect(logger.warn).toHaveBeenCalledWith('Sync worker is already initialized');
    expect(cron.schedule).toHaveBeenCalledTimes(1); // Not called again
  });

  it('should sync challenges matching criteria sequentially with delay', async () => {
    startSyncWorker();

    const mockChallenges = [
      { _id: '1' },
      { _id: '2' },
    ];
    
    vi.mocked(CodingChallenge.find).mockResolvedValue(mockChallenges as any);
    // Both have participants
    vi.mocked(ChallengeParticipant.exists).mockResolvedValue({ _id: 'p1' } as any);

    // Call the cron job
    const promise = cronCallback();

    // Fast forward for the first delay (5 seconds)
    await vi.runAllTimersAsync();
    await promise;

    expect(CodingChallenge.find).toHaveBeenCalledWith({
      isActive: true,
      publicationStatus: 'Published',
      startTime: { $lte: expect.any(Date) },
      endTime: { $gte: expect.any(Date) },
    });

    expect(ChallengeSyncService.syncChallenge).toHaveBeenCalledWith('1');
    expect(ChallengeSyncService.syncChallenge).toHaveBeenCalledWith('2');
    expect(ChallengeSyncService.syncChallenge).toHaveBeenCalledTimes(2);
  });

  it('should skip challenges with no participants', async () => {
    startSyncWorker();

    vi.mocked(CodingChallenge.find).mockResolvedValue([{ _id: '1' }] as any);
    vi.mocked(ChallengeParticipant.exists).mockResolvedValue(null); // No participants

    const promise = cronCallback();
    await vi.runAllTimersAsync();
    await promise;

    expect(ChallengeSyncService.syncChallenge).not.toHaveBeenCalled();
  });

  it('should abort current run on RATE_LIMITED error', async () => {
    startSyncWorker();

    const mockChallenges = [
      { _id: '1' },
      { _id: '2' }, // Should not be reached
    ];
    
    vi.mocked(CodingChallenge.find).mockResolvedValue(mockChallenges as any);
    vi.mocked(ChallengeParticipant.exists).mockResolvedValue({ _id: 'p1' } as any);

    // First sync throws RATE_LIMITED
    vi.mocked(ChallengeSyncService.syncChallenge).mockRejectedValueOnce(
      new ProviderError('Rate limit exceeded', 'codeforces', 'RATE_LIMITED')
    );

    const promise = cronCallback();
    await vi.runAllTimersAsync();
    await promise;

    expect(ChallengeSyncService.syncChallenge).toHaveBeenCalledWith('1');
    expect(ChallengeSyncService.syncChallenge).toHaveBeenCalledTimes(1); // Stops after first error

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ challengeId: '1' }),
      'Provider rate limit hit. Aborting current cron run.'
    );
  });

  it('should continue to next challenge on general errors', async () => {
    startSyncWorker();

    const mockChallenges = [
      { _id: '1' },
      { _id: '2' },
    ];
    
    vi.mocked(CodingChallenge.find).mockResolvedValue(mockChallenges as any);
    vi.mocked(ChallengeParticipant.exists).mockResolvedValue({ _id: 'p1' } as any);

    // First sync throws generic error
    vi.mocked(ChallengeSyncService.syncChallenge).mockRejectedValueOnce(
      new Error('Network timeout')
    );

    const promise = cronCallback();
    await vi.runAllTimersAsync();
    await promise;

    expect(ChallengeSyncService.syncChallenge).toHaveBeenCalledWith('1');
    expect(ChallengeSyncService.syncChallenge).toHaveBeenCalledWith('2'); // Continues
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ challengeId: '1' }),
      'Worker failed to sync individual challenge'
    );
  });

  it('should not allow concurrent runs', async () => {
    startSyncWorker();
    
    vi.mocked(CodingChallenge.find).mockReturnValue(new Promise(() => {}) as any); // Hangs forever

    cronCallback(); // First run starts
    await cronCallback(); // Second run starts immediately

    expect(logger.warn).toHaveBeenCalledWith('Previous sync run is still in progress. Skipping this iteration.');
    expect(CodingChallenge.find).toHaveBeenCalledTimes(1); // Only called for the first run
  });
});
