import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

export interface LinkedAccount {
  _id: string;
  provider: string;
  handle: string;
  isVerified: boolean;
  verifiedAt?: string;
  verificationToken?: string;
}

export const useCodingAccounts = () => {
  return useQuery({
    queryKey: ['codingAccounts'],
    queryFn: async () => {
      const response = await api.get('/accounts');
      return response.data.data as LinkedAccount[];
    },
  });
};

export const useLinkAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ provider, handle }: { provider: string; handle: string }) => {
      const response = await api.post('/accounts', { provider, handle });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['codingAccounts'] });
    },
  });
};

export const useVerifyAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/accounts/${id}/verify`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['codingAccounts'] });
    },
  });
};

export const useUnlinkAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/accounts/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['codingAccounts'] });
    },
  });
};
