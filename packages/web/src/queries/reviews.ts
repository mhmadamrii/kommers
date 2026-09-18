import { useMutation, useQuery, useQueryClient } from '@tanstack/solid-query';
import type { Accessor } from 'solid-js';
import { apiFetch } from '~/lib/api-client';

export type ReviewImage = {
  id: number;
  url: string;
};

// Matches GET /api/v1/products/:slug/reviews' reviewResponse exactly
// (packages/server internal/handler/review.go).
export type Review = {
  id: number;
  product_id: number;
  rating: number;
  comment: string;
  reviewer_name: string;
  images: ReviewImage[];
  created_at: string;
};

export type ReviewEligibility = {
  can_review: boolean;
  already_reviewed: boolean;
};

function reviewsQueryKey(slug: string) {
  return ['reviews', slug] as const;
}

export function useProductReviewsQuery(slug: Accessor<string>) {
  return useQuery(() => ({
    queryKey: reviewsQueryKey(slug()),
    queryFn: () => apiFetch<Review[]>(`/api/v1/products/${slug()}/reviews`),
  }));
}

// Only meaningful for a logged-in visitor — callers gate `enabled` on
// whether `me` resolved to a real user, same as the product page does.
export function useReviewEligibilityQuery(slug: Accessor<string>, enabled: Accessor<boolean>) {
  return useQuery(() => ({
    queryKey: ['reviews', 'eligibility', slug()],
    queryFn: () => apiFetch<ReviewEligibility>(`/api/v1/products/${slug()}/reviews/eligibility`),
    enabled: enabled(),
  }));
}

export function useCreateReviewMutation(slug: Accessor<string>) {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: (input: { rating: number; comment: string }) =>
      apiFetch<Review>(`/api/v1/products/${slug()}/reviews`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewsQueryKey(slug()) });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'eligibility', slug()] });
      queryClient.invalidateQueries({ queryKey: ['products', 'slug', slug()] });
    },
  }));
}

export function useUploadReviewImagesMutation(slug: Accessor<string>) {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: ({ reviewId, files }: { reviewId: number; files: File[] }) => {
      const form = new FormData();
      for (const file of files) form.append('images', file);
      return apiFetch<Review>(`/api/v1/reviews/${reviewId}/images`, {
        method: 'POST',
        body: form,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reviewsQueryKey(slug()) }),
  }));
}
