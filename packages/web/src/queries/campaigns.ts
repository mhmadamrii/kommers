import { useMutation, useQuery, useQueryClient } from '@tanstack/solid-query';
import { apiFetch, canResolveSession } from '~/lib/api-client';

// Matches campaignResponse / campaignRequest in packages/server
// internal/handler/campaign.go.
export type Campaign = {
  id: number;
  name: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  starts_at: string;
  ends_at: string;
  stock_limit: number | null;
  stock_used: number;
  free_shipping: boolean;
  is_active: boolean;
  category_id?: number;
  product_ids?: number[];
  created_at: string;
};

// Exactly one of category_id / product_ids is set (the API enforces it).
export type CampaignRequest = {
  name: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  starts_at: string;
  ends_at: string;
  stock_limit?: number;
  free_shipping: boolean;
  category_id?: number;
  product_ids?: number[];
};

export const CAMPAIGNS_QUERY_KEY = ['campaigns', 'mine'] as const;

export function useCampaignsQuery() {
  return useQuery(() => ({
    queryKey: CAMPAIGNS_QUERY_KEY,
    queryFn: () => apiFetch<Campaign[]>('/api/v1/campaigns'),
    enabled: canResolveSession(),
  }));
}

// Creating/deleting changes what buyers see (prices, the flash-sale strip),
// so those caches go stale too.
function invalidateStorefront(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: CAMPAIGNS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ['flash-sales'] });
  queryClient.invalidateQueries({ queryKey: ['products'] });
}

export function useCreateCampaignMutation() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: (input: CampaignRequest) =>
      apiFetch<Campaign>('/api/v1/campaigns', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => invalidateStorefront(queryClient),
  }));
}

export function useDeleteCampaignMutation() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: (id: number) => apiFetch<void>(`/api/v1/campaigns/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateStorefront(queryClient),
  }));
}

export type CampaignStatus = 'live' | 'upcoming' | 'ended' | 'sold_out';

export function campaignStatus(c: Campaign, now = Date.now()): CampaignStatus {
  if (now > new Date(c.ends_at).getTime()) return 'ended';
  if (c.stock_limit !== null && c.stock_used >= c.stock_limit) return 'sold_out';
  if (now < new Date(c.starts_at).getTime()) return 'upcoming';
  return 'live';
}
