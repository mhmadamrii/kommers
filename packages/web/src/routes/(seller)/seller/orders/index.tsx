import { PackageSearch } from 'lucide-solid';
import { createSignal, For, Show } from 'solid-js';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { EmptyState } from '~/components/empty-state';
import { OrderShippingDialog } from '~/components/order-shipping-dialog';
import { formatPriceCents } from '~/lib/currency';
import type { Order } from '~/queries/orders';
import { useSellerOrdersQuery } from '~/queries/seller-orders';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu Pembayaran',
  paid: 'Sudah Dibayar',
  processing: 'Diproses',
  shipped: 'Dikirim',
  delivered: 'Selesai',
  cancelled: 'Dibatalkan',
};

// Orders a seller can still act on — pending isn't paid yet, cancelled/delivered are terminal.
function canManage(status: Order['status']) {
  return status === 'paid' || status === 'processing' || status === 'shipped';
}

export default function SellerOrders() {
  const ordersQuery = useSellerOrdersQuery();
  const orders = () => ordersQuery.data ?? [];
  const [managingOrder, setManagingOrder] = createSignal<Order | null>(null);

  return (
    <div class='flex h-full min-h-0 flex-col gap-6'>
      <h1 class='text-xl font-bold text-foreground'>Pesanan Masuk</h1>

      <Show
        when={!ordersQuery.isLoading}
        fallback={
          <div class='flex flex-col gap-2'>
            <For each={Array(5).fill(0)}>{() => <Skeleton class='h-14 w-full rounded-lg' />}</For>
          </div>
        }
      >
        <Show
          when={orders().length > 0}
          fallback={
            <EmptyState
              icon={PackageSearch}
              title='Belum ada pesanan'
              description='Pesanan yang berisi produkmu akan muncul di sini.'
            />
          }
        >
          <Card class='min-h-0 flex-1 overflow-hidden p-0'>
            <div class='h-full overflow-y-auto'>
              <Table>
                <TableHeader class='sticky top-0 z-10 bg-card'>
                  <TableRow>
                    <TableHead>Pesanan</TableHead>
                    <TableHead>Penerima</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <For each={orders()}>
                    {(order) => (
                      <TableRow>
                        <TableCell class='flex flex-col'>
                          <span class='font-medium text-foreground'>#{order.id}</span>
                          <span class='text-xs text-muted-foreground'>
                            {new Date(order.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                        </TableCell>
                        <TableCell>{order.address?.recipient ?? '-'}</TableCell>
                        <TableCell>{formatPriceCents(order.total_cents)}</TableCell>
                        <TableCell>
                          <Badge variant={order.status === 'pending' || order.status === 'cancelled' ? 'secondary' : 'default'}>
                            {STATUS_LABEL[order.status] ?? order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div class='flex justify-end'>
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              disabled={!canManage(order.status)}
                              onClick={() => setManagingOrder(order)}
                            >
                              Kelola Pengiriman
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </For>
                </TableBody>
              </Table>
            </div>
          </Card>
        </Show>
      </Show>

      <Show when={managingOrder()}>
        {(order) => (
          <OrderShippingDialog
            order={order()}
            open={true}
            onOpenChange={(open) => !open && setManagingOrder(null)}
          />
        )}
      </Show>
    </div>
  );
}
