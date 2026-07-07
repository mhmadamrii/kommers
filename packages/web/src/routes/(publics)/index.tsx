import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product-card';
import { CategoryCard } from '@/components/category-card';
import { useCart } from '@/lib/cart-context';
import { categories } from '@/lib/mock/categories';
import { products } from '@/lib/mock/products';

export const Route = createFileRoute('/(publics)/')({
  component: Home,
});

function Home() {
  const { addItem } = useCart();
  const featured = products.slice(0, 4);
  const recommended = products.slice(4, 8);

  return (
    <div className='mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10'>
      <header className='flex items-center justify-between'>
        <span className='font-heading text-xl'>kommers</span>
        <div className='flex items-center gap-2'>
          <Button variant='neutral' asChild>
            <Link to='/auth'>Login</Link>
          </Button>
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
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>

      <section className='flex flex-col gap-4'>
        <h2 className='font-heading text-2xl'>Featured</h2>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {featured.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={addItem}
            />
          ))}
        </div>
      </section>

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
    </div>
  );
}
