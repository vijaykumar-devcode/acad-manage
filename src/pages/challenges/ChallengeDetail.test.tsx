import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChallengeDetail } from './ChallengeDetail';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../../hooks/queries/useChallenges', () => ({
  useChallenge: vi.fn(),
  usePublishChallenge: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRegisterChallenge: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSyncChallenge: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useChallengeLeaderboard: vi.fn(),
}));

vi.mock('../../hooks/queries/useCodingAccounts', () => ({
  useCodingAccounts: vi.fn(),
}));

import { useAuthStore } from '../../store/authStore';
import { useChallenge, useChallengeLeaderboard } from '../../hooks/queries/useChallenges';
import { useCodingAccounts } from '../../hooks/queries/useCodingAccounts';

describe('ChallengeDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Already Registered if the student is in the leaderboard', () => {
    (useAuthStore as any).mockReturnValue({ user: { role: 'Student', rollNo: '2023001' } });
    
    (useChallenge as any).mockReturnValue({
      data: {
        _id: '123',
        title: 'Test Challenge',
        status: 'Active',
        syncStatus: 'Synced',
        provider: 'codeforces'
      },
      isLoading: false
    });

    (useCodingAccounts as any).mockReturnValue({
      data: [{ provider: 'codeforces', isVerified: true }],
      isLoading: false
    });

    // The student is in the leaderboard
    (useChallengeLeaderboard as any).mockReturnValue({
      data: {
        entries: [
          { rollNo: '2023001' }
        ]
      },
      isLoading: false
    });

    render(
      <MemoryRouter>
        <ChallengeDetail />
      </MemoryRouter>
    );

    expect(screen.getByText('Already Registered')).toBeInTheDocument();
    expect(screen.queryByText('Register for Challenge')).not.toBeInTheDocument();
  });

  it('shows Register for Challenge if the student has verified account and is not registered', () => {
    (useAuthStore as any).mockReturnValue({ user: { role: 'Student', rollNo: '2023001' } });
    
    (useChallenge as any).mockReturnValue({
      data: {
        _id: '123',
        title: 'Test Challenge',
        status: 'Active',
        syncStatus: 'Synced',
        provider: 'codeforces'
      },
      isLoading: false
    });

    (useCodingAccounts as any).mockReturnValue({
      data: [{ provider: 'codeforces', isVerified: true }],
      isLoading: false
    });

    (useChallengeLeaderboard as any).mockReturnValue({
      data: { entries: [] },
      isLoading: false
    });

    render(
      <MemoryRouter>
        <ChallengeDetail />
      </MemoryRouter>
    );

    expect(screen.getByText('Register for Challenge')).toBeInTheDocument();
  });

  it('shows Account Required if student does not have verified account', () => {
    (useAuthStore as any).mockReturnValue({ user: { role: 'Student', rollNo: '2023001' } });
    (useChallenge as any).mockReturnValue({
      data: {
        _id: '123',
        title: 'Test Challenge',
        status: 'Active',
        provider: 'codeforces'
      },
      isLoading: false
    });
    (useCodingAccounts as any).mockReturnValue({
      data: [], // No accounts
      isLoading: false
    });
    (useChallengeLeaderboard as any).mockReturnValue({ data: null, isLoading: false });

    render(
      <MemoryRouter>
        <ChallengeDetail />
      </MemoryRouter>
    );

    expect(screen.getByText('Account Required')).toBeInTheDocument();
  });

  it('shows Force Sync for Faculty', () => {
    (useAuthStore as any).mockReturnValue({ user: { role: 'Faculty' } });
    (useChallenge as any).mockReturnValue({
      data: {
        _id: '123',
        title: 'Test Challenge',
        status: 'Active',
        syncStatus: 'Synced'
      },
      isLoading: false
    });
    (useCodingAccounts as any).mockReturnValue({ data: [], isLoading: false });
    (useChallengeLeaderboard as any).mockReturnValue({ data: null, isLoading: false });

    render(
      <MemoryRouter>
        <ChallengeDetail />
      </MemoryRouter>
    );

    expect(screen.getByText('Force Sync Now')).toBeInTheDocument();
  });
});
