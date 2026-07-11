import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';

import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/product-card';
import { useCart } from '@/lib/cart-context';
import { fetchProducts } from '@/lib/catalog-client';

interface SearchPageSearch {
  q?: string;
}

export const Route = createFileRoute('/(main)/search/')({
  validateSearch: (search: Record<string, unknown>): SearchPageSearch => ({
    q: typeof search.q === 'string' ? search.q : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { q } = Route.useSearch();
  const { addItem } = useCart();
  const query = q?.trim() ?? '';

  const resultsQuery = useQuery({
    queryKey: ['products', { q: query }],
    queryFn: () => fetchProducts({ q: query }),
    enabled: query.length > 0,
  });

  const results = resultsQuery.data?.items ?? [];

  return (
    <div className='flex flex-col gap-6'>
      <h1 className='font-heading text-2xl'>
        {query ? `Results for "${q}"` : 'Search'}
      </h1>
      {resultsQuery.isError && (
        <p className='text-foreground/70'>
          Search failed. Is the catalog service running?
        </p>
      )}
      {resultsQuery.isSuccess && results.length === 0 && (
        <p className='text-foreground/70'>No products matched your search.</p>
      )}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {query && resultsQuery.isPending
          ? Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className='h-64' />
            ))
          : results.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addItem}
              />
            ))}
      </div>
    </div>
  );
}
