import * as React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/lib/cart-context';
import { fetchProduct } from '@/lib/catalog-client';
import { formatCurrency } from '@/lib/utils';

export const Route = createFileRoute('/(main)/products/$productId')({
  component: RouteComponent,
});

function RouteComponent() {
  const { productId } = Route.useParams();
  const { addItem } = useCart();
  const [activeImage, setActiveImage] = React.useState(0);

  const productQuery = useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProduct(productId),
    retry: (failureCount, error) =>
      !error.message.includes('404') && failureCount < 2,
  });

  if (productQuery.isPending) {
    return (
      <div className='grid grid-cols-1 gap-8 md:grid-cols-2'>
        <Skeleton className='h-80' />
        <div className='flex flex-col gap-4'>
          <Skeleton className='h-8 w-2/3' />
          <Skeleton className='h-24' />
          <Skeleton className='h-10 w-40' />
        </div>
      </div>
    );
  }

  if (productQuery.isError) {
    return (
      <p className='text-foreground/70'>
        Product not found or the catalog service is unavailable.
      </p>
    );
  }

  const product = productQuery.data;
  const images = product.images;
  const shown = images[activeImage] ?? images[0];

  return (
    <div className='grid grid-cols-1 gap-8 md:grid-cols-2'>
      <div className='flex flex-col gap-3'>
        <div className='flex h-80 items-center justify-center overflow-hidden rounded-base border-2 border-border bg-secondary-background text-foreground/50'>
          {shown ? (
            <img
              src={shown.url}
              alt={product.name}
              className='h-full w-full object-cover'
            />
          ) : (
            'Image'
          )}
        </div>
        {images.length > 1 && (
          <div className='flex gap-2'>
            {images.map((img, i) => (
              <button
                key={img.id}
                type='button'
                onClick={() => setActiveImage(i)}
                className={`h-16 w-16 overflow-hidden rounded-base border-2 ${
                  i === activeImage ? 'border-foreground' : 'border-border'
                }`}
              >
                <img
                  src={img.url}
                  alt=''
                  className='h-full w-full object-cover'
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className='flex flex-col gap-4'>
        <h1 className='font-heading text-2xl'>{product.name}</h1>
        <p className='text-foreground/70'>{product.description}</p>
        <p className='text-sm text-foreground/70'>
          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
        </p>

        {product.variants.length > 0 && (
          <div className='flex flex-col gap-2'>
            <h2 className='font-heading text-sm'>Variants</h2>
            <ul className='flex flex-col gap-1 text-sm text-foreground/70'>
              {product.variants.map((v) => (
                <li key={v.id} className='flex items-center gap-2'>
                  <span className='font-mono'>{v.sku}</span>
                  {Object.entries(v.attributes).map(([k, val]) => (
                    <span
                      key={k}
                      className='rounded-base border border-border px-1.5 py-0.5 text-xs'
                    >
                      {k}: {val}
                    </span>
                  ))}
                  <span>{formatCurrency(v.price ?? product.price)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

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
