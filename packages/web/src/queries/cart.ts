import { useMutation, useQuery, useQueryClient } from '@tanstack/solid-query';
import { apiFetch } from '~/lib/api-client';

export type CartItem = {
  id: number;
  product_id: number;
  product_name: string;
  product_slug: string;
  image_url: string;
  quantity: number;
  price_cents: number;
  subtotal_cents: number;
};

export type Cart = {
  id: number;
  items: CartItem[];
  total_cents: number;
};

export const CART_QUERY_KEY = ['cart'] as const;

export function useCartQuery() {
  return useQuery(() => ({
    queryKey: CART_QUERY_KEY,
    queryFn: () => apiFetch<Cart>('/api/v1/cart'),
  }));
}

export function useUpdateCartItemMutation() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) =>
      apiFetch<Cart>(`/api/v1/cart/items/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
      }),
    onSuccess: (cart) => queryClient.setQueryData(CART_QUERY_KEY, cart),
  }));
}

export function useRemoveCartItemMutation() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: (id: number) => apiFetch<void>(`/api/v1/cart/items/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY }),
  }));
}
