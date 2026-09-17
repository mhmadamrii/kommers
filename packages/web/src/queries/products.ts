import { useQuery } from '@tanstack/solid-query';
import type { Accessor } from 'solid-js';
import { dummyProducts, type DummyProduct } from '~/lib/dummy-data';

export type ProductFilters = {
  categoryId?: number;
  q?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  minRating?: number;
  sort?: string;
};

function sortProducts(products: DummyProduct[], sort: string): DummyProduct[] {
  const sorted = [...products];
  switch (sort) {
    case 'newest':
      return sorted.reverse();
    case 'price_asc':
      return sorted.sort((a, b) => a.priceCents - b.priceCents);
    case 'price_desc':
      return sorted.sort((a, b) => b.priceCents - a.priceCents);
    case 'rating':
      return sorted.sort((a, b) => b.rating - a.rating);
    default:
      return sorted;
  }
}

// Stands in for `await fetch('/api/v1/products?...')`'s latency so the
// loading state is real to develop against before the backend is wired up.
function simulateNetworkDelay() {
  return new Promise((resolve) => setTimeout(resolve, 250));
}

async function fetchProducts(filters: ProductFilters): Promise<DummyProduct[]> {
  await simulateNetworkDelay();

  const result = dummyProducts.filter((product) => {
    if (filters.categoryId !== undefined && product.categoryId !== filters.categoryId) return false;
    if (filters.q && !product.name.toLowerCase().includes(filters.q.toLowerCase())) return false;
    if (filters.minPriceCents !== undefined && product.priceCents < filters.minPriceCents) return false;
    if (filters.maxPriceCents !== undefined && product.priceCents > filters.maxPriceCents) return false;
    if (filters.minRating !== undefined && product.rating < filters.minRating) return false;
    return true;
  });

  return sortProducts(result, filters.sort ?? 'relevant');
}

export function useProductsQuery(filters: Accessor<ProductFilters>) {
  return useQuery(() => ({
    queryKey: ['products', filters()],
    queryFn: () => fetchProducts(filters()),
  }));
}
