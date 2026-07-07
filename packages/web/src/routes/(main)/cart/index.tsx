import { createFileRoute, Link } from '@tanstack/react-router';
import { Minus, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCart } from '@/lib/cart-context';
import { formatCurrency } from '@/lib/utils';

export const Route = createFileRoute('/(main)/cart/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { lines, subtotal, setQuantity, removeItem } = useCart();

  if (lines.length === 0) {
    return (
      <div className='flex flex-col items-center gap-4 py-16 text-center'>
        <h1 className='font-heading text-2xl'>Your cart is empty</h1>
        <Button asChild>
          <Link to='/products'>Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
      <div className='flex flex-col gap-4 lg:col-span-2'>
        <h1 className='font-heading text-2xl'>Cart</h1>
        {lines.map((line) => (
          <Card
            key={line.product.id}
            className='flex-row items-center gap-4 p-4'
          >
            <div className='flex size-16 shrink-0 items-center justify-center rounded-base border-2 border-border bg-secondary-background text-xs text-foreground/50'>
              Image
            </div>
            <CardContent className='flex flex-1 items-center justify-between p-0'>
              <div>
                <p className='font-heading'>{line.product.name}</p>
                <p className='text-sm text-foreground/70'>
                  {formatCurrency(line.product.price)}
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  variant='neutral'
                  size='icon'
                  className='size-8'
                  onClick={() =>
                    setQuantity(line.product.id, line.quantity - 1)
                  }
                >
                  <Minus className='size-3' />
                </Button>
                <span className='w-6 text-center'>{line.quantity}</span>
                <Button
                  variant='neutral'
                  size='icon'
                  className='size-8'
                  onClick={() =>
                    setQuantity(line.product.id, line.quantity + 1)
                  }
                >
                  <Plus className='size-3' />
                </Button>
                <Button
                  variant='neutral'
                  size='icon'
                  className='size-8'
                  onClick={() => removeItem(line.product.id)}
                >
                  <Trash2 className='size-3' />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className='h-fit p-4'>
        <div className='flex items-center justify-between font-heading text-lg'>
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <Button asChild className='mt-4'>
          <Link to='/checkout'>Checkout</Link>
        </Button>
      </Card>
    </div>
  );
}
