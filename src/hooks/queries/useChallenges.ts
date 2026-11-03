import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

export interface Challenge {
  _id: string;
  title: string;
  provider: string;      // kept for backward compat
  platform: string;      // canonical field name used by the backend
  externalContestId: string;
  externalUrl: string;
  startTime: string;
  endTime: string;
  status: string;
  publicationStatus: 'Draft' | 'Published';
  syncStatus: 'NotRequired' | 'Pending' | 'Syncing' | 'Synced' | 'Failed';
  participantCount: number;
  isActive: boolean;
  classId?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}

export const useChallenges = (page: number, limit: number, filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['challenges', page, limit, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
      });
      const response = await api.get(`/challenges?${params.toString()}`);
      return response.data as PaginatedResponse<Challenge>;
    },
  });
};

export const useChallenge = (id: string) => {
  return useQuery({
    queryKey: ['challenge', id],
    queryFn: async () => {
      const response = await api.get(`/challenges/${id}`);
      return response.data.data as Challenge;
    },
    enabled: !!id,
  });
};

export const useCreateChallenge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/challenges', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
    },
  });
};

export const usePublishChallenge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const response = await api.patch(`/challenges/${id}/publish`, { publish });
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['challenge', id] });
    },
  });
};

export const useUpdateChallenge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const response = await api.patch(`/challenges/${id}`, data);
      return response.data.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['challenge', id] });
    },
  });
};

export const useResetChallenge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/challenges/${id}/reset`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['challenge', id] });
    },
  });
};

export const useRegisterChallenge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/challenges/${id}/register`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['challenge', id] });
    },
  });
};

export const useSyncChallenge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/challenges/${id}/sync`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['challenge', id] });
      queryClient.invalidateQueries({ queryKey: ['challengeLeaderboard', id] });
      queryClient.invalidateQueries({ queryKey: ['challengeAnalytics', id] });
    },
  });
};

export const useChallengeLeaderboard = (id: string) => {
  return useQuery({
    queryKey: ['challengeLeaderboard', id],
    queryFn: async () => {
      const response = await api.get(`/challenges/${id}/leaderboard`);
      return response.data.data;
    },
    enabled: !!id,
  });
};

export const useChallengeAnalytics = (id: string) => {
  return useQuery({
    queryKey: ['challengeAnalytics', id],
    queryFn: async () => {
      const response = await api.get(`/challenges/${id}/analytics`);
      return response.data.data;
    },
    enabled: !!id,
  });
};
