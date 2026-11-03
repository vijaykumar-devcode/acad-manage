import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChallengeLeaderboard } from './ChallengeLeaderboard';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../../hooks/queries/useChallenges', () => ({
  useChallenge: vi.fn(),
  useChallengeLeaderboard: vi.fn(),
  useChallengeAnalytics: vi.fn(),
}));

import { useAuthStore } from '../../store/authStore';
import { useChallenge, useChallengeLeaderboard, useChallengeAnalytics } from '../../hooks/queries/useChallenges';

describe('ChallengeLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders competition ranking from DTO .entries array without crashing (Regression Test)', () => {
    // Setup mocks
    (useAuthStore as any).mockReturnValue({ user: { role: 'Student' } });
    
    (useChallenge as any).mockReturnValue({
      data: {
        _id: '123',
        title: 'Test Challenge',
        status: 'Ended',
        syncStatus: 'Synced'
      },
      isLoading: false
    });

    (useChallengeAnalytics as any).mockReturnValue({
      data: null,
      isLoading: false
    });

    // BEFORE THE FIX, the code mapped over `leaderboard` directly (causing a crash).
    // AFTER THE FIX, the code maps over `leaderboard.entries`.
    // This test provides the exact DTO returned by the backend:
    (useChallengeLeaderboard as any).mockReturnValue({
      data: {
        syncStatus: 'Synced',
        lastSuccessfulSyncAt: new Date().toISOString(),
        entries: [
          {
            participantId: 'p1',
            leaderboardRank: 1,
            rollNo: '2023001',
            name: 'Alice Smith',
            handle: 'alice_coder',
            solvedCount: 3,
            penalty: 150
          },
          {
            participantId: 'p2',
            leaderboardRank: 2,
            rollNo: '2023002',
            name: 'Bob Jones',
            handle: 'bob_dev',
            solvedCount: 2,
            penalty: 100
          }
        ]
      },
      isLoading: false
    });

    render(
      <MemoryRouter>
        <ChallengeLeaderboard />
      </MemoryRouter>
    );

    // It should successfully map the entries and display them
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('alice_coder')).toBeInTheDocument();
    expect(screen.getByText('2023001')).toBeInTheDocument();
    
    // Check if competition ranking rendering is displayed
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('displays Syncing state properly instead of empty leaderboard', () => {
    (useAuthStore as any).mockReturnValue({ user: { role: 'Student' } });
    (useChallenge as any).mockReturnValue({
      data: {
        _id: '123',
        title: 'Test Challenge',
        status: 'Active',
        syncStatus: 'Syncing' // The critical state
      },
      isLoading: false
    });
    (useChallengeLeaderboard as any).mockReturnValue({
      data: { syncStatus: 'Syncing', entries: [] },
      isLoading: false
    });
    (useChallengeAnalytics as any).mockReturnValue({
      data: null,
      isLoading: false
    });

    render(
      <MemoryRouter>
        <ChallengeLeaderboard />
      </MemoryRouter>
    );

    expect(screen.getByText('Synchronization is currently in progress. The leaderboard will appear shortly.')).toBeInTheDocument();
  });

  it('displays role-based controls (Analytics Tab for Admin only)', () => {
    (useChallenge as any).mockReturnValue({
      data: { _id: '123', title: 'Test', status: 'Ended', syncStatus: 'Synced' },
      isLoading: false
    });
    (useChallengeLeaderboard as any).mockReturnValue({ data: { entries: [] }, isLoading: false });
    (useChallengeAnalytics as any).mockReturnValue({ data: null, isLoading: false });

    // Student case
    (useAuthStore as any).mockReturnValue({ user: { role: 'Student' } });
    const { rerender } = render(
      <MemoryRouter>
        <ChallengeLeaderboard />
      </MemoryRouter>
    );
    expect(screen.queryByText('Analytics')).not.toBeInTheDocument();

    // Faculty case
    (useAuthStore as any).mockReturnValue({ user: { role: 'Faculty' } });
    rerender(
      <MemoryRouter>
        <ChallengeLeaderboard />
      </MemoryRouter>
    );
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });
});
