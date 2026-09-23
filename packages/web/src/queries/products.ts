import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/solid-query';
import type { Accessor } from 'solid-js';
import { apiFetch, canResolveSession } from '~/lib/api-client';

export type ProductOwner = {
  id: number;
  email: string;
  full_name: string;
};

export type ProductImage = {
  id: number;
  url: string;
  sort_order: number;
  is_primary: boolean;
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
  // Sorted primary-first, then by sort_order — images[0] is always the
  // one to show as the product's thumbnail.
  images: ProductImage[];
  // Computed from real Review rows — 0/0 when nobody has reviewed yet.
  average_rating: number;
  review_count: number;
  is_active: boolean;
  location: string;
  free_shipping: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductRequest = {
  category_id: number;
  name: string;
  description?: string;
  price_cents: number;
  stock: number;
  is_active?: boolean;
  location?: string;
  free_shipping?: boolean;
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
    // Picking a filter combination visited for the first time this session
    // has nothing cached under its queryKey, so solid-query's Suspense
    // integration has no data to read and suspends — that bubbles all the
    // way to app.tsx's single fallback-less root <Suspense> and blanks the
    // entire page, not just this grid. keepPreviousData keeps the last
    // result in `.data` across the key change so there's always something
    // to read, trading a flash of stale results (isFetching still flips
    // true, so a spinner/skeleton driven off that is still accurate) for
    // never suspending on a filter change.
    placeholderData: keepPreviousData,
  }));
}

export function useProductQuery(slug: Accessor<string>) {
  return useQuery(() => ({
    queryKey: ['products', 'slug', slug()],
    queryFn: () => apiFetch<Product>(`/api/v1/products/${slug()}`),
  }));
}

export const MY_PRODUCTS_QUERY_KEY = ['products', 'mine'] as const;

export function useMyProductsQuery() {
  return useQuery(() => ({
    queryKey: MY_PRODUCTS_QUERY_KEY,
    queryFn: () => apiFetch<Product[]>('/api/v1/me/products'),
    enabled: canResolveSession(),
  }));
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: (input: ProductRequest) =>
      apiFetch<Product>('/api/v1/products', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_PRODUCTS_QUERY_KEY }),
  }));
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: ({ id, ...input }: ProductRequest & { id: number }) =>
      apiFetch<Product>(`/api/v1/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_PRODUCTS_QUERY_KEY }),
  }));
}

export function useUploadProductImagesMutation() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: ({ productId, files }: { productId: number; files: File[] }) => {
      const form = new FormData();
      for (const file of files) form.append('images', file);
      return apiFetch<Product>(`/api/v1/products/${productId}/images`, {
        method: 'POST',
        body: form,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_PRODUCTS_QUERY_KEY }),
  }));
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: (id: number) => apiFetch<void>(`/api/v1/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_PRODUCTS_QUERY_KEY }),
  }));
}

export function useDeleteProductImageMutation() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: ({ productId, imageId }: { productId: number; imageId: number }) =>
      apiFetch<void>(`/api/v1/products/${productId}/images/${imageId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_PRODUCTS_QUERY_KEY }),
  }));
}
