import { Link } from '@tanstack/react-router';
import { Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Product } from '@/lib/mock/products';
import { formatCurrency } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <Card className='flex h-full flex-col'>
      <CardHeader>
        <div className='mb-2 flex h-32 items-center justify-center rounded-base border-2 border-border bg-secondary-background text-sm text-foreground/50'>
          Image
        </div>
        <CardTitle className='text-base'>
          <Link
            to='/products/$productId'
            params={{ productId: product.slug }}
            className='hover:underline'
          >
            {product.name}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className='flex flex-1 flex-col gap-2'>
        <div className='flex items-center gap-1 text-sm'>
          <Star className='size-4 fill-current' />
          {product.rating}
        </div>
        <p className='text-sm text-foreground/70'>
          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
        </p>
      </CardContent>
      <CardFooter className='flex items-center justify-between gap-2'>
        <span className='font-heading text-lg'>
          {formatCurrency(product.price)}
        </span>
        <Button
          size='sm'
          disabled={product.stock === 0}
          onClick={() => onAddToCart?.(product)}
        >
          Add to cart
        </Button>
      </CardFooter>
    </Card>
  );
}
