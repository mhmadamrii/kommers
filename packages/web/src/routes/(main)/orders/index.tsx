import { createFileRoute, Link } from '@tanstack/react-router';

import { Card, CardContent } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { orders } from '@/lib/mock/orders';
import { formatCurrency } from '@/lib/utils';

export const Route = createFileRoute('/(main)/orders/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className='flex flex-col gap-6'>
      <h1 className='font-heading text-2xl'>Orders</h1>
      <div className='flex flex-col gap-3'>
        {orders.map((order) => (
          <Link
            key={order.id}
            to='/orders/$orderId'
            params={{ orderId: order.id }}
          >
            <Card className='flex-row items-center justify-between p-4'>
              <CardContent className='flex flex-1 items-center justify-between p-0'>
                <div>
                  <p className='font-heading'>{order.id}</p>
                  <p className='text-sm text-foreground/70'>{order.placedAt}</p>
                </div>
                <div className='flex items-center gap-4'>
                  <span className='font-heading'>
                    {formatCurrency(order.total)}
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
