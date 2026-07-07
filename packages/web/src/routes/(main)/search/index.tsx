import { createFileRoute } from '@tanstack/react-router';

import { ProductCard } from '@/components/product-card';
import { useCart } from '@/lib/cart-context';
import { products } from '@/lib/mock/products';

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

  const query = q?.trim().toLowerCase() ?? '';
  const results = query
    ? products.filter((product) => product.name.toLowerCase().includes(query))
    : [];

  return (
    <div className='flex flex-col gap-6'>
      <h1 className='font-heading text-2xl'>
        {query ? `Results for "${q}"` : 'Search'}
      </h1>
      {query && results.length === 0 && (
        <p className='text-foreground/70'>No products matched your search.</p>
      )}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {results.map((product) => (
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
