import { useMutation, useQuery, useQueryClient } from '@tanstack/solid-query';
import type { Accessor } from 'solid-js';
import { apiFetch } from '~/lib/api-client';
import type { Address } from '~/queries/addresses';
import { CART_QUERY_KEY } from '~/queries/cart';

export type OrderStatus = 'pending' | 'paid' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export type OrderItem = {
  id: number;
  product_id: number;
  product_slug: string;
  product_name: string;
  image_url: string;
  seller_name: string;
  quantity: number;
  price_cents: number;
  campaign_id?: number;
  subtotal_cents: number;
};

// Matches GET /api/v1/orders' orderResponse exactly (packages/server
// internal/handler/order.go).
export type Order = {
  id: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  address_id: number;
  address?: Address;
  currency: string;
  total_cents: number;
  items: OrderItem[];
  created_at: string;
};

export type CheckoutResult = Order & { checkout_url: string };

export const ORDERS_QUERY_KEY = ['orders'] as const;

export function useOrdersQuery() {
  return useQuery(() => ({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: () => apiFetch<Order[]>('/api/v1/orders'),
  }));
}

export function useOrderQuery(id: Accessor<number>) {
  return useQuery(() => ({
    queryKey: ['orders', id()],
    queryFn: () => apiFetch<Order>(`/api/v1/orders/${id()}`),
    // Payment confirmation lands via a Stripe webhook, not this request —
    // poll briefly so "pending" flips to "paid" without a manual refresh.
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 3000 : false),
  }));
}

export function useCheckoutMutation() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: (addressId: number) =>
      apiFetch<CheckoutResult>('/api/v1/checkout', {
        method: 'POST',
        body: JSON.stringify({ address_id: addressId }),
      }),
    onSuccess: () => {
      queryClient.setQueryData(CART_QUERY_KEY, undefined);
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    },
  }));
}
