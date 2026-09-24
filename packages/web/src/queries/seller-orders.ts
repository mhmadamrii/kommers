import { useMutation, useQuery, useQueryClient } from '@tanstack/solid-query';
import { apiFetch, canResolveSession } from '~/lib/api-client';
import type { Order, OrderStatus } from '~/queries/orders';

export const SELLER_ORDERS_QUERY_KEY = ['orders', 'selling'] as const;

// Matches GET /api/v1/me/orders/selling — same orderResponse shape as the
// buyer-facing /orders endpoints, just scoped server-side to orders
// containing at least one of the current seller's products.
export function useSellerOrdersQuery() {
  return useQuery(() => ({
    queryKey: SELLER_ORDERS_QUERY_KEY,
    queryFn: () => apiFetch<Order[]>('/api/v1/me/orders/selling'),
    enabled: canResolveSession(),
  }));
}

export function useUpdateShippingMutation() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: (input: { orderId: number; status: OrderStatus; trackingNumber?: string; courier?: string }) =>
      apiFetch<Order>(`/api/v1/orders/${input.orderId}/shipping`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: input.status,
          tracking_number: input.trackingNumber,
          courier: input.courier,
        }),
      }),
    // ['orders'] is a prefix of both ORDERS_QUERY_KEY and
    // SELLER_ORDERS_QUERY_KEY — TanStack Query matches by prefix, so one
    // invalidation covers the buyer's order list/detail and the seller list.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  }));
}
