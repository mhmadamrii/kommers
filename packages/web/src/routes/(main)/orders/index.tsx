import { A } from '@solidjs/router';
import { PackageSearch } from 'lucide-solid';
import { For, Show } from 'solid-js';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { EmptyState } from '~/components/empty-state';
import { Skeleton } from '~/components/ui/skeleton';
import { formatPriceCents } from '~/lib/currency';
import { useOrdersQuery } from '~/queries/orders';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu Pembayaran',
  paid: 'Sudah Dibayar',
  cancelled: 'Dibatalkan',
};

export default function Orders() {
  const ordersQuery = useOrdersQuery();
  const orders = () => ordersQuery.data ?? [];

  return (
    <div class='flex flex-col gap-6 px-4 py-6 sm:px-6'>
      <h1 class='text-xl font-bold text-foreground'>Pesanan Saya</h1>

      <Show
        when={!ordersQuery.isLoading}
        fallback={
          <div class='flex flex-col gap-2'>
            <For each={Array(3).fill(0)}>{() => <Skeleton class='h-20 w-full max-w-lg rounded-xl' />}</For>
          </div>
        }
      >
        <Show
          when={orders().length > 0}
          fallback={
            <EmptyState
              icon={PackageSearch}
              title='Belum ada pesanan'
              description='Pesananmu akan muncul di sini setelah checkout.'
              action={
                <Button as={A} href='/products'>
                  Belanja Sekarang
                </Button>
              }
            />
          }
        >
          <div class='flex max-w-lg flex-col gap-3'>
            <For each={orders()}>
              {(order) => (
                <A
                  href={`/orders/${order.id}`}
                  class='flex flex-row items-center justify-between rounded-xl border bg-card p-4 text-card-foreground shadow-sm transition-shadow hover:shadow-md'
                >
                  <div class='flex flex-col gap-1'>
                    <span class='text-sm font-medium text-foreground'>Pesanan #{order.id}</span>
                    <span class='text-xs text-muted-foreground'>
                      {new Date(order.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div class='flex flex-col items-end gap-1'>
                    <span class='text-sm font-semibold text-foreground'>
                      {formatPriceCents(order.total_cents)}
                    </span>
                    <Badge variant={order.status === 'paid' ? 'default' : 'secondary'}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </Badge>
                  </div>
                </A>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
}
