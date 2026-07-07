import { createFileRoute } from '@tanstack/react-router';

import { ProductCard } from '@/components/product-card';
import { useCart } from '@/lib/cart-context';
import { categories } from '@/lib/mock/categories';
import { products } from '@/lib/mock/products';

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

  const filtered = category
    ? products.filter((product) => product.categorySlug === category)
    : products;

  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='font-heading text-2xl'>
          {activeCategory ? activeCategory.name : 'All products'}
        </h1>
        <p className='text-sm text-foreground/70'>
          {filtered.length} product{filtered.length === 1 ? '' : 's'}
        </p>
      </div>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {filtered.map((product) => (
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
