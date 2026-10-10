import { useQuery } from '@tanstack/solid-query';
import { apiFetch } from '~/lib/api-client';
import type { Product } from '~/queries/products';

// Matches GET /api/v1/flash-sales' flashSaleResponse (packages/server
// internal/handler/flash_sale.go) — a public view of live/upcoming Campaigns.
export type FlashSaleProduct = Product & { sale_price_cents: number };

export type FlashSale = {
  id: number;
  name: string;
  status: 'live' | 'upcoming';
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  starts_at: string;
  ends_at: string;
  free_shipping: boolean;
  stock_limit: number | null;
  stock_used: number;
  products: FlashSaleProduct[];
};

export function useFlashSalesQuery() {
  return useQuery(() => ({
    queryKey: ['flash-sales'],
    queryFn: () => apiFetch<FlashSale[]>('/api/v1/flash-sales'),
    retry: false,
    // Stock-left and live/upcoming status drift while the page is open.
    refetchInterval: 30_000,
  }));
}
