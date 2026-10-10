import { useMutation, useQuery, useQueryClient } from '@tanstack/solid-query';
import { ApiError, apiFetch, canResolveSession } from '~/lib/api-client';
import type { Product } from '~/queries/products';

export const WISHLIST_QUERY_KEY = ['wishlist'] as const;

// Matches GET /api/v1/me/wishlist — the server formats saved products
// through the same builder GET /products uses, so the shape here is
// identical to Product, not a separate wishlist-item wrapper.
//
// A logged-out visitor is the default state, not a failure: 401 resolves to
// an empty list (like useMeQuery) instead of throwing, which would retry and
// then blank the page through the unhandled query error.
export function useWishlistQuery() {
  return useQuery(() => ({
    queryKey: WISHLIST_QUERY_KEY,
    queryFn: async () => {
      try {
        return await apiFetch<Product[]>('/api/v1/me/wishlist');
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return [];
        throw err;
      }
    },
    retry: false,
    enabled: canResolveSession(),
  }));
}

// Every ProductCard calls this — since useWishlistQuery's queryKey is the
// same fixed tuple everywhere, TanStack Query dedupes them into one shared
// cache entry rather than firing a request per card.
export function useIsWishlisted(productId: () => number) {
  const wishlistQuery = useWishlistQuery();
  return () => (wishlistQuery.data ?? []).some((p) => p.id === productId());
}

export function useAddToWishlistMutation() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: (productId: number) =>
      apiFetch<void>(`/api/v1/wishlist/${productId}`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY }),
  }));
}

export function useRemoveFromWishlistMutation() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: (productId: number) =>
      apiFetch<void>(`/api/v1/wishlist/${productId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY }),
  }));
}
