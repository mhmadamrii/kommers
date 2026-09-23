import { useNavigate } from '@solidjs/router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/solid-query';
import { createEffect } from 'solid-js';
import { ApiError, apiFetch, canResolveSession } from '~/lib/api-client';

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
    // See canResolveSession: a server render with no cookie would resolve
    // this to null and that null would outlive the page load.
    enabled: canResolveSession(),
  }));
}

// useRequireRole redirects home once the `me` query resolves to a user
// without one of the allowed roles (including logged-out) — for gating
// pages like seller product management with no server-side route guard.
export function useRequireRole(...roles: Role[]) {
  const navigate = useNavigate();
  const meQuery = useMeQuery();
  createEffect(() => {
    // isPending, not isLoading: a query that hasn't started fetching yet
    // (disabled during SSR, or the instant before the hydrated client
    // observer kicks off its mount fetch) reports isLoading === false while
    // still having no data, and redirecting on that bounces a logged-in
    // seller off their own page on every reload.
    if (meQuery.isPending) return;
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
    onSuccess: (data) => {
      // Paint from the response body for an instant transition, then
      // confirm against the server. The body only proves the credentials
      // were accepted — it does NOT prove the browser kept the auth
      // cookie, which it silently discards if the Set-Cookie's SameSite
      // doesn't permit the web app's origin. Without this refetch the UI
      // shows a logged-in session that doesn't exist, and the lie only
      // surfaces on the next reload.
      queryClient.setQueryData(ME_QUERY_KEY, data.user);
      void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
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
    onSuccess: (data) => {
      // Paint from the response body for an instant transition, then
      // confirm against the server. The body only proves the credentials
      // were accepted — it does NOT prove the browser kept the auth
      // cookie, which it silently discards if the Set-Cookie's SameSite
      // doesn't permit the web app's origin. Without this refetch the UI
      // shows a logged-in session that doesn't exist, and the lie only
      // surfaces on the next reload.
      queryClient.setQueryData(ME_QUERY_KEY, data.user);
      void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
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
    onSuccess: () => {
      // Same reasoning as login, inverted: if the clearing cookie didn't
      // match the attributes the original was set with, the browser keeps
      // the old one and the session is still live. Confirm rather than
      // assume.
      queryClient.setQueryData(ME_QUERY_KEY, null);
      void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  }));
}
