import { useNavigate } from '@solidjs/router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/solid-query';
import { createEffect } from 'solid-js';
import { ApiError, apiFetch } from '~/lib/api-client';

export type Role = 'customer' | 'seller' | 'admin';

export type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  role: Role;
};

type AuthResponse = { token: string; user: AuthUser };

export const ME_QUERY_KEY = ['me'] as const;

// Returns null (not an error) when unauthenticated — a logged-out visitor
// is the expected default state, not a failure.
export function useMeQuery() {
  return useQuery(() => ({
    queryKey: ME_QUERY_KEY,
    queryFn: async () => {
      try {
        return await apiFetch<AuthUser>('/api/v1/me');
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    retry: false,
  }));
}

// useRequireRole redirects home once the `me` query resolves to a user
// without one of the allowed roles (including logged-out) — for gating
// pages like seller product management with no server-side route guard.
export function useRequireRole(...roles: Role[]) {
  const navigate = useNavigate();
  const meQuery = useMeQuery();
  createEffect(() => {
    if (meQuery.isLoading) return;
    if (!meQuery.data || !roles.includes(meQuery.data.role)) {
      navigate('/');
    }
  });
  return meQuery;
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: (input: { email: string; password: string }) =>
      apiFetch<AuthResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => queryClient.setQueryData(ME_QUERY_KEY, data.user),
  }));
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: (input: { email: string; password: string; full_name: string }) =>
      apiFetch<AuthResponse>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => queryClient.setQueryData(ME_QUERY_KEY, data.user),
  }));
}

export function useApplySellerMutation() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: () =>
      apiFetch<AuthUser>('/api/v1/sellers/apply', {
        method: 'POST',
        body: JSON.stringify({ accept_terms: true }),
      }),
    onSuccess: (user) => queryClient.setQueryData(ME_QUERY_KEY, user),
  }));
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: () => apiFetch<void>('/api/v1/auth/logout', { method: 'POST' }),
    onSuccess: () => queryClient.setQueryData(ME_QUERY_KEY, null),
  }));
}
