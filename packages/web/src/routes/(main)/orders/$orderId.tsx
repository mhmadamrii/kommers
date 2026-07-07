import { createFileRoute, notFound } from '@tanstack/react-router';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { orders } from '@/lib/mock/orders';
import { formatCurrency } from '@/lib/utils';

export const Route = createFileRoute('/(main)/orders/$orderId')({
  loader: ({ params }) => {
    const order = orders.find((o) => o.id === params.orderId);
    if (!order) throw notFound();
    return order;
  },
  component: RouteComponent,
});

function RouteComponent() {
  const order = Route.useLoaderData();

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-heading text-2xl'>{order.id}</h1>
          <p className='text-sm text-foreground/70'>
            Placed on {order.placedAt}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col gap-2'>
          {order.items.map((item) => (
            <div key={item.productId} className='flex justify-between text-sm'>
              <span>
                {item.name} x{item.quantity}
              </span>
              <span>{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className='mt-2 flex justify-between border-t-2 border-border pt-2 font-heading'>
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
