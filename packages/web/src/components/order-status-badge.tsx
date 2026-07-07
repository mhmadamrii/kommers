import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/lib/mock/orders';

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-yellow-200 text-yellow-900',
  processing: 'bg-blue-200 text-blue-900',
  shipped: 'bg-purple-200 text-purple-900',
  delivered: 'bg-green-200 text-green-900',
  cancelled: 'bg-red-200 text-red-900',
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-base border-2 border-border px-2 py-0.5 text-xs font-heading',
        STATUS_STYLES[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
