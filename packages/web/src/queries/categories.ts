import { useQuery } from '@tanstack/solid-query';
import { apiFetch } from '~/lib/api-client';

// Matches GET /api/v1/categories' categoryResponse exactly.
export type Category = {
  id: number;
  name: string;
  slug: string;
};

export function useCategoriesQuery() {
  return useQuery(() => ({
    queryKey: ['categories'],
    queryFn: () => apiFetch<Category[]>('/api/v1/categories'),
    staleTime: 5 * 60_000, // categories change rarely
  }));
}
