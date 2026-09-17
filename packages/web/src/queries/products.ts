import { useQuery } from '@tanstack/solid-query';
import type { Accessor } from 'solid-js';
import { apiFetch } from '~/lib/api-client';

export type ProductOwner = {
  id: number;
  email: string;
  full_name: string;
};

// Matches GET /api/v1/products' productResponse exactly (packages/server
// internal/handler/product.go) — snake_case, on purpose, so the shape is
// obviously "this is the wire format" rather than a client convention.
export type Product = {
  id: number;
  category_id: number;
  owner: ProductOwner;
  name: string;
  slug: string;
  description: string;
  // price_cents is the base price; effective_price_cents is what a buyer
  // pays right now — equal to price_cents unless a Campaign is live.
  price_cents: number;
  effective_price_cents: number;
  campaign_id?: number;
  campaign_ends_at?: string;
  stock: number;
  image_url: string;
  is_active: boolean;
  location: string;
  free_shipping: boolean;
  created_at: string;
  updated_at: string;
};

export function discountPercent(product: Product): number | null {
  if (!product.campaign_id || product.effective_price_cents >= product.price_cents) return null;
  return Math.round(
    ((product.price_cents - product.effective_price_cents) / product.price_cents) * 100,
  );
}

export type ProductFilters = {
  categoryId?: number;
  q?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  sort?: string;
  limit?: number;
};

// Server supports category_id/q/page/limit. Price range and sort aren't
// backend query params (yet), so they're applied client-side over the
// fetched page — fine at this data size, revisit if pagination grows.
function sortProducts(products: Product[], sort: string): Product[] {
  const sorted = [...products];
  switch (sort) {
    case 'price_asc':
      return sorted.sort((a, b) => a.effective_price_cents - b.effective_price_cents);
    case 'price_desc':
      return sorted.sort((a, b) => b.effective_price_cents - a.effective_price_cents);
    default:
      return sorted;
  }
}

async function fetchProducts(filters: ProductFilters): Promise<Product[]> {
  const params = new URLSearchParams();
  if (filters.categoryId !== undefined) params.set('category_id', String(filters.categoryId));
  if (filters.q) params.set('q', filters.q);
  params.set('limit', String(filters.limit ?? 20));

  let products = await apiFetch<Product[]>(`/api/v1/products?${params.toString()}`);

  if (filters.minPriceCents !== undefined) {
    products = products.filter((p) => p.effective_price_cents >= filters.minPriceCents!);
  }
  if (filters.maxPriceCents !== undefined) {
    products = products.filter((p) => p.effective_price_cents <= filters.maxPriceCents!);
  }

  return sortProducts(products, filters.sort ?? 'relevant');
}

export function useProductsQuery(filters: Accessor<ProductFilters>) {
  return useQuery(() => ({
    queryKey: ['products', filters()],
    queryFn: () => fetchProducts(filters()),
  }));
}
