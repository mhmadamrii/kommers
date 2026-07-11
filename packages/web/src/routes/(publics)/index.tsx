import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/product-card';
import { CategoryCard } from '@/components/category-card';
import { UserMenu } from '@/components/user-menu';
import { useCart } from '@/lib/cart-context';
import { fetchCategories, fetchProducts } from '@/lib/catalog-client';

export const Route = createFileRoute('/(publics)/')({
  component: Home,
});

function Home() {
  const { addItem } = useCart();

  const productsQuery = useQuery({
    queryKey: ['products', 'home'],
    queryFn: () => fetchProducts({ limit: 8 }),
  });
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const products = productsQuery.data?.items ?? [];
  const featured = products.slice(0, 4);
  const recommended = products.slice(4, 8);

  return (
    <div className='mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10'>
      <header className='flex items-center justify-between'>
        <span className='font-heading text-xl'>kommers</span>
        <div className='flex items-center gap-2'>
          <UserMenu />
          <Button asChild>
            <Link to='/products'>Shop now</Link>
          </Button>
        </div>
      </header>

      <section className='flex flex-col items-start gap-4 py-8'>
        <h1 className='font-heading text-4xl'>Gear for how you build.</h1>
        <p className='max-w-md text-foreground/70'>
          Keyboards, monitors, laptops and accessories curated for developers.
        </p>
        <Button asChild size='lg'>
          <Link to='/products'>
            Browse products <ArrowRight className='size-4' />
          </Link>
        </Button>
      </section>

      <section className='flex flex-col gap-4'>
        <h2 className='font-heading text-2xl'>Categories</h2>
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6'>
          {categoriesQuery.isPending
            ? Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className='h-24' />
              ))
            : (categoriesQuery.data ?? []).map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
        </div>
      </section>

      <section className='flex flex-col gap-4'>
        <h2 className='font-heading text-2xl'>Featured</h2>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {productsQuery.isPending
            ? Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className='h-64' />
              ))
            : featured.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={addItem}
                />
              ))}
        </div>
      </section>

      {recommended.length > 0 && (
        <section className='flex flex-col gap-4'>
          <h2 className='font-heading text-2xl'>Recommended for you</h2>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {recommended.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addItem}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
