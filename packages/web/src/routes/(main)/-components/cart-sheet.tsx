import { Link } from '@tanstack/react-router';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useCart } from '@/lib/cart-context';
import { formatCurrency } from '@/lib/utils';

export function CartSheet() {
  const { lines, itemCount, subtotal, setQuantity, removeItem } = useCart();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant='neutral' size='icon' className='relative'>
          <ShoppingCart />
          {itemCount > 0 && (
            <span className='absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border-2 border-border bg-main text-xs text-main-foreground'>
              {itemCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Cart</SheetTitle>
        </SheetHeader>
        <div className='flex flex-1 flex-col gap-3 overflow-y-auto px-4'>
          {lines.length === 0 && (
            <p className='text-sm text-foreground/70'>Your cart is empty.</p>
          )}
          {lines.map((line) => (
            <div
              key={line.product.id}
              className='flex items-center justify-between gap-2 rounded-base border-2 border-border p-2'
            >
              <div className='flex-1'>
                <p className='font-heading text-sm'>{line.product.name}</p>
                <p className='text-sm text-foreground/70'>
                  {formatCurrency(line.product.price)}
                </p>
              </div>
              <div className='flex items-center gap-1'>
                <Button
                  variant='neutral'
                  size='icon'
                  className='size-7'
                  onClick={() =>
                    setQuantity(line.product.id, line.quantity - 1)
                  }
                >
                  <Minus className='size-3' />
                </Button>
                <span className='w-4 text-center text-sm'>{line.quantity}</span>
                <Button
                  variant='neutral'
                  size='icon'
                  className='size-7'
                  onClick={() =>
                    setQuantity(line.product.id, line.quantity + 1)
                  }
                >
                  <Plus className='size-3' />
                </Button>
                <Button
                  variant='neutral'
                  size='icon'
                  className='size-7'
                  onClick={() => removeItem(line.product.id)}
                >
                  <Trash2 className='size-3' />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <SheetFooter>
          <div className='flex items-center justify-between font-heading'>
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {lines.length === 0 ? (
            <Button disabled>Checkout</Button>
          ) : (
            <SheetClose asChild>
              <Button asChild>
                <Link to='/checkout'>Checkout</Link>
              </Button>
            </SheetClose>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
