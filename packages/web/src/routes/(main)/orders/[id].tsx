import { A, useParams, useSearchParams } from '@solidjs/router';
import { CheckCircle2, Clock, PackageX, XCircle } from 'lucide-solid';
import { createMemo, For, Show } from 'solid-js';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { EmptyState } from '~/components/empty-state';
import { Skeleton } from '~/components/ui/skeleton';
import { formatPriceCents } from '~/lib/currency';
import { useOrderQuery } from '~/queries/orders';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu Pembayaran',
  paid: 'Sudah Dibayar',
  cancelled: 'Dibatalkan',
};

export default function OrderDetail() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const orderId = createMemo(() => Number(params.id));
  const orderQuery = useOrderQuery(orderId);

  const cameFromCancel = () => searchParams.payment === 'cancelled';

  return (
    <div class='flex flex-col gap-6 px-4 py-6 sm:px-6'>
      <A href='/' class='text-sm text-muted-foreground hover:underline'>
        &larr; Kembali ke Beranda
      </A>

      <Show
        when={!orderQuery.isLoading}
        fallback={<Skeleton class='h-64 w-full max-w-lg rounded-xl' />}
      >
        <Show
          when={orderQuery.data}
          fallback={<EmptyState icon={PackageX} title='Pesanan tidak ditemukan' />}
        >
          {(order) => (
            <div class='flex max-w-lg flex-col gap-4'>
              <Card class='flex flex-col items-center gap-2 p-6 text-center'>
                <Show
                  when={order().status === 'paid'}
                  fallback={
                    <Show
                      when={order().status === 'cancelled'}
                      fallback={<Clock class='size-10 text-amber-500' aria-hidden='true' />}
                    >
                      <XCircle class='size-10 text-destructive' aria-hidden='true' />
                    </Show>
                  }
                >
                  <CheckCircle2 class='size-10 text-primary' aria-hidden='true' />
                </Show>

                <h1 class='text-lg font-bold text-foreground'>
                  {order().status === 'paid'
                    ? 'Pembayaran Berhasil'
                    : order().status === 'cancelled'
                      ? 'Pesanan Dibatalkan'
                      : cameFromCancel()
                        ? 'Pembayaran Dibatalkan'
                        : 'Menunggu Konfirmasi Pembayaran'}
                </h1>
                <p class='text-sm text-muted-foreground'>
                  {order().status === 'pending'
                    ? 'Kami akan memperbarui status ini otomatis setelah Stripe mengonfirmasi pembayaranmu.'
                    : `Pesanan #${order().id}`}
                </p>
                <Badge variant={order().status === 'paid' ? 'default' : 'secondary'}>
                  {STATUS_LABEL[order().status] ?? order().status}
                </Badge>
              </Card>

              <Card class='flex flex-col gap-3 p-4'>
                <h2 class='text-sm font-semibold text-foreground'>Detail Pesanan</h2>
                <div class='flex flex-col gap-2 divide-y divide-border'>
                  <For each={order().items}>
                    {(item) => (
                      <div class='flex items-center justify-between gap-2 pt-2 text-sm first:pt-0'>
                        <span class='text-foreground'>
                          {item.product_name} <span class='text-muted-foreground'>×{item.quantity}</span>
                        </span>
                        <span class='font-medium text-foreground'>
                          {formatPriceCents(item.subtotal_cents)}
                        </span>
                      </div>
                    )}
                  </For>
                </div>
                <div class='flex items-center justify-between border-t border-border pt-3 text-sm font-semibold text-foreground'>
                  <span>Total</span>
                  <span>{formatPriceCents(order().total_cents)}</span>
                </div>
              </Card>

              <Button as={A} href='/products' variant='outline' class='w-full'>
                Lanjut Belanja
              </Button>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
}
