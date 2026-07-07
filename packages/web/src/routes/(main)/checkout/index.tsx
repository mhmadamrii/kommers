import { createFileRoute } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/form-field';
import { useCart } from '@/lib/cart-context';
import { formatCurrency } from '@/lib/utils';

export const Route = createFileRoute('/(main)/checkout/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { lines, subtotal } = useCart();

  return (
    <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
      <div className='flex flex-col gap-6 lg:col-span-2'>
        <Card>
          <CardHeader>
            <CardTitle>Shipping address</CardTitle>
          </CardHeader>
          <CardContent className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <FormField label='Full name' name='fullName' required />
            <FormField label='Phone' name='phone' type='tel' required />
            <div className='sm:col-span-2'>
              <FormField label='Address' name='address' required />
            </div>
            <FormField label='City' name='city' required />
            <FormField label='Postal code' name='postalCode' required />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payment method</CardTitle>
          </CardHeader>
          <CardContent className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <FormField label='Card number' name='cardNumber' required />
            <FormField label='Name on card' name='cardName' required />
            <FormField
              label='Expiry'
              name='expiry'
              placeholder='MM/YY'
              required
            />
            <FormField label='CVC' name='cvc' required />
          </CardContent>
        </Card>
      </div>
      <Card className='h-fit p-4'>
        <h2 className='mb-4 font-heading text-lg'>Order summary</h2>
        <div className='flex flex-col gap-2'>
          {lines.map((line) => (
            <div key={line.product.id} className='flex justify-between text-sm'>
              <span>
                {line.product.name} x{line.quantity}
              </span>
              <span>{formatCurrency(line.product.price * line.quantity)}</span>
            </div>
          ))}
        </div>
        <div className='mt-4 flex items-center justify-between border-t-2 border-border pt-4 font-heading text-lg'>
          <span>Total</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <Button className='mt-4 w-full' disabled={lines.length === 0}>
          Place order
        </Button>
      </Card>
    </div>
  );
}
