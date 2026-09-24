import { A, useParams, useSearchParams } from '@solidjs/router';
import { CheckCircle2, Clock, MapPin, PackageCheck, PackageX, Truck, XCircle } from 'lucide-solid';
import { createMemo, For, Show } from 'solid-js';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { EmptyState } from '~/components/empty-state';
import { Skeleton } from '~/components/ui/skeleton';
import { formatPriceCents } from '~/lib/currency';
import { useOrderQuery } from '~/queries/orders';
import type { OrderStatus } from '~/queries/orders';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu Pembayaran',
  paid: 'Sudah Dibayar',
  processing: 'Diproses',
  shipped: 'Dikirim',
  delivered: 'Selesai',
  cancelled: 'Dibatalkan',
};

const STATUS_TITLE: Record<OrderStatus, string> = {
  pending: 'Menunggu Konfirmasi Pembayaran',
  paid: 'Pembayaran Berhasil',
  processing: 'Pesanan Sedang Diproses',
  shipped: 'Pesanan Dalam Pengiriman',
  delivered: 'Pesanan Selesai',
  cancelled: 'Pesanan Dibatalkan',
};

const STATUS_ICON: Record<OrderStatus, typeof CheckCircle2> = {
  pending: Clock,
  paid: CheckCircle2,
  processing: Clock,
  shipped: Truck,
  delivered: PackageCheck,
  cancelled: XCircle,
};

export default function OrderDetail() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const orderId = createMemo(() => Number(params.id));
  const orderQuery = useOrderQuery(orderId);

  const cameFromCancel = () => searchParams.payment === 'cancelled';

  return (
    <div class='mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6 sm:px-6'>
      <A href='/' class='text-sm text-muted-foreground hover:underline'>
        &larr; Kembali ke Beranda
      </A>

      <Show
        when={!orderQuery.isLoading}
        fallback={<Skeleton class='h-64 w-full rounded-xl' />}
      >
        <Show
          when={orderQuery.data}
          fallback={<EmptyState icon={PackageX} title='Pesanan tidak ditemukan' />}
        >
          {(order) => (
            <div class='flex flex-col gap-4'>
              <Card class='flex flex-col items-center gap-2 p-6 text-center'>
                {(() => {
                  const Icon = STATUS_ICON[order().status];
                  return (
                    <Icon
                      class={`size-10 ${
                        order().status === 'cancelled'
                          ? 'text-destructive'
                          : order().status === 'pending'
                            ? 'text-amber-500'
                            : 'text-primary'
                      }`}
                      aria-hidden='true'
                    />
                  );
                })()}

                <h1 class='text-lg font-bold text-foreground'>
                  {order().status === 'pending' && cameFromCancel()
                    ? 'Pembayaran Dibatalkan'
                    : STATUS_TITLE[order().status]}
                </h1>
                <p class='text-sm text-muted-foreground'>
                  {order().status === 'pending'
                    ? 'Kami akan memperbarui status ini otomatis setelah Stripe mengonfirmasi pembayaranmu.'
                    : `Pesanan #${order().id}`}
                </p>
                <Badge variant={order().status === 'pending' || order().status === 'cancelled' ? 'secondary' : 'default'}>
                  {STATUS_LABEL[order().status] ?? order().status}
                </Badge>
              </Card>

              <Show when={order().tracking_number || order().courier}>
                <Card class='flex flex-col gap-2 p-4'>
                  <h2 class='flex items-center gap-1.5 text-sm font-semibold text-foreground'>
                    <Truck class='size-4 text-muted-foreground' aria-hidden='true' />
                    Info Pengiriman
                  </h2>
                  <div class='text-sm'>
                    <Show when={order().courier}>
                      <p class='text-muted-foreground'>
                        Kurir: <span class='font-medium text-foreground'>{order().courier}</span>
                      </p>
                    </Show>
                    <Show when={order().tracking_number}>
                      <p class='text-muted-foreground'>
                        No. Resi: <span class='font-medium text-foreground'>{order().tracking_number}</span>
                      </p>
                    </Show>
                  </div>
                </Card>
              </Show>

              <Card class='flex flex-col gap-3 p-4'>
                <div class='flex items-center justify-between'>
                  <h2 class='text-sm font-semibold text-foreground'>Detail Pesanan</h2>
                  <span class='text-xs text-muted-foreground'>
                    #{order().id} ·{' '}
                    {new Date(order().created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div class='flex flex-col divide-y divide-border'>
                  <For each={order().items}>
                    {(item) => (
                      <div class='flex items-center gap-3 py-3 first:pt-0'>
                        <div class='size-12 shrink-0 overflow-hidden rounded-lg bg-accent'>
                          <Show when={item.image_url}>
                            <img src={item.image_url} alt='' class='size-full object-cover' />
                          </Show>
                        </div>
                        <div class='flex flex-1 flex-col gap-0.5'>
                          <A
                            href={`/products/${item.product_slug}`}
                            class='line-clamp-1 text-sm font-medium text-foreground hover:underline'
                          >
                            {item.product_name}
                          </A>
                          <span class='text-xs text-muted-foreground'>
                            Dijual oleh {item.seller_name} · ×{item.quantity}
                          </span>
                        </div>
                        <span class='shrink-0 text-sm font-medium text-foreground'>
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

              <Show when={order().address}>
                {(address) => (
                  <Card class='flex flex-col gap-2 p-4'>
                    <h2 class='flex items-center gap-1.5 text-sm font-semibold text-foreground'>
                      <MapPin class='size-4 text-muted-foreground' aria-hidden='true' />
                      Alamat Pengiriman
                    </h2>
                    <div class='text-sm'>
                      <p class='font-medium text-foreground'>
                        {address().recipient}
                        <Show when={address().label}> · {address().label}</Show>
                      </p>
                      <p class='text-muted-foreground'>{address().phone}</p>
                      <p class='text-muted-foreground'>
                        {address().line1}
                        <Show when={address().line2}>, {address().line2}</Show>, {address().city}
                        <Show when={address().state}>, {address().state}</Show> {address().postal_code}
                      </p>
                    </div>
                  </Card>
                )}
              </Show>

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
