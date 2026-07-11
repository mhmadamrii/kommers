import { createFileRoute } from '@tanstack/react-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/product-card';
import { useCart } from '@/lib/cart-context';
import { fetchCategories, fetchProducts } from '@/lib/catalog-client';

interface ProductsSearch {
  category?: string;
}

export const Route = createFileRoute('/(main)/products/')({
  validateSearch: (search: Record<string, unknown>): ProductsSearch => ({
    category: typeof search.category === 'string' ? search.category : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { category } = Route.useSearch();
  const { addItem } = useCart();

  const productsQuery = useInfiniteQuery({
    queryKey: ['products', { category }],
    queryFn: ({ pageParam }) =>
      fetchProducts({ category, cursor: pageParam || undefined }),
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const products =
    productsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const activeCategory = categoriesQuery.data?.find(
    (c) => c.slug === category,
  );

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='font-heading text-2xl'>
          {activeCategory ? activeCategory.name : 'All products'}
        </h1>
        {productsQuery.isSuccess && (
          <p className='text-sm text-foreground/70'>
            {products.length} product{products.length === 1 ? '' : 's'}
            {productsQuery.hasNextPage ? '+' : ''}
          </p>
        )}
      </div>

      {productsQuery.isError && (
        <p className='text-foreground/70'>
          Could not load products. Is the catalog service running?
        </p>
      )}

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {productsQuery.isPending
          ? Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className='h-64' />
            ))
          : products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addItem}
              />
            ))}
      </div>

      {productsQuery.isSuccess && products.length === 0 && (
        <p className='text-foreground/70'>No products in this category yet.</p>
      )}

      {productsQuery.hasNextPage && (
        <Button
          variant='neutral'
          className='self-center'
          disabled={productsQuery.isFetchingNextPage}
          onClick={() => productsQuery.fetchNextPage()}
        >
          {productsQuery.isFetchingNextPage ? 'Loading...' : 'Load more'}
        </Button>
      )}
    </div>
  );
}
