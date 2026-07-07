import { createFileRoute, notFound } from '@tanstack/react-router';
import { Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cart-context';
import { products } from '@/lib/mock/products';
import { formatCurrency } from '@/lib/utils';

export const Route = createFileRoute('/(main)/products/$productId')({
  loader: ({ params }) => {
    const product = products.find((p) => p.slug === params.productId);
    if (!product) throw notFound();
    return product;
  },
  component: RouteComponent,
});

function RouteComponent() {
  const product = Route.useLoaderData();
  const { addItem } = useCart();

  return (
    <div className='grid grid-cols-1 gap-8 md:grid-cols-2'>
      <div className='flex h-80 items-center justify-center rounded-base border-2 border-border bg-secondary-background text-foreground/50'>
        Image
      </div>
      <div className='flex flex-col gap-4'>
        <h1 className='font-heading text-2xl'>{product.name}</h1>
        <div className='flex items-center gap-1 text-sm'>
          <Star className='size-4 fill-current' />
          {product.rating}
        </div>
        <p className='text-foreground/70'>{product.description}</p>
        <p className='text-sm text-foreground/70'>
          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
        </p>
        <div className='flex items-center gap-4'>
          <span className='font-heading text-2xl'>
            {formatCurrency(product.price)}
          </span>
          <Button
            disabled={product.stock === 0}
            onClick={() => addItem(product)}
          >
            Add to cart
          </Button>
        </div>
      </div>
    </div>
  );
}
