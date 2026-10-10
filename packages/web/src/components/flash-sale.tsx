import { A } from '@solidjs/router';
import { ChevronRight, Zap } from 'lucide-solid';
import { createMemo, createSignal, For, onCleanup, Show } from 'solid-js';
import { Badge } from '~/components/ui/badge';
import { ProductCard } from '~/components/product-card';
import { formatPriceCents } from '~/lib/currency';
import type { FlashSale } from '~/queries/flash-sales';

// Ticks against a real Campaign timestamp — no fabricated deadline.
function useCountdown(targetMs: () => number) {
  const [now, setNow] = createSignal(Date.now());
  const interval = setInterval(() => setNow(Date.now()), 1000);
  onCleanup(() => clearInterval(interval));

  return createMemo(() => {
    const total = Math.max(0, targetMs() - now());
    const hours = Math.floor(total / 3_600_000);
    const minutes = Math.floor((total % 3_600_000) / 60_000);
    const seconds = Math.floor((total % 60_000) / 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  });
}

function discountLabel(sale: FlashSale): string {
  return sale.discount_type === 'percent'
    ? `Diskon ${sale.discount_value}%`
    : `Hemat ${formatPriceCents(sale.discount_value)}`;
}

export function FlashSaleSection(props: { sale: FlashSale; showAllLink?: boolean }) {
  const upcoming = () => props.sale.status === 'upcoming';
  const countdown = useCountdown(() =>
    new Date(upcoming() ? props.sale.starts_at : props.sale.ends_at).getTime(),
  );

  const left = () =>
    props.sale.stock_limit === null ? null : Math.max(0, props.sale.stock_limit - props.sale.stock_used);
  const soldPct = () =>
    props.sale.stock_limit ? Math.min(100, (props.sale.stock_used / props.sale.stock_limit) * 100) : 0;

  return (
    <section>
      <div class='mb-4 flex flex-wrap items-center justify-between gap-2'>
        <div class='flex flex-wrap items-center gap-2'>
          <span class='flex size-7 items-center justify-center rounded-full bg-destructive text-white'>
            <Zap class='size-4 fill-white' aria-hidden='true' />
          </span>
          <h2 class='text-lg font-bold text-foreground'>{props.sale.name}</h2>
          <Badge variant={upcoming() ? 'secondary' : 'destructive'} class='font-mono tabular-nums'>
            {upcoming() ? 'Mulai dalam ' : ''}
            {countdown()}
          </Badge>
          <Badge variant='accent'>{discountLabel(props.sale)}</Badge>
          <Show when={props.sale.free_shipping}>
            <Badge variant='outline'>Gratis Ongkir</Badge>
          </Show>
        </div>
        <Show when={props.showAllLink ?? true}>
          <A href='/flash-sale' class='flex items-center gap-0.5 text-sm font-medium text-primary hover:underline'>
            Lihat Semua
            <ChevronRight class='size-4' aria-hidden='true' />
          </A>
        </Show>
      </div>

      <Show when={left() !== null}>
        <div class='mb-4 flex max-w-sm flex-col gap-1'>
          <div
            class='h-2 overflow-hidden rounded-full bg-muted'
            role='progressbar'
            aria-label='Stok flash sale terjual'
            aria-valuenow={Math.round(soldPct())}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div class='h-full rounded-full bg-destructive transition-all' style={{ width: `${soldPct()}%` }} />
          </div>
          <span class='text-xs text-muted-foreground'>
            {left() === 0 ? 'Stok promo habis' : `Tersisa ${left()} unit dengan harga promo`}
          </span>
        </div>
      </Show>

      <div class='scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 lg:grid-cols-5'>
        <For each={props.showAllLink === false ? props.sale.products : props.sale.products.slice(0, 5)}>
          {(product) => (
            <div class='w-40 shrink-0 sm:w-auto'>
              <ProductCard product={product} />
              <Show when={upcoming()}>
                <p class='mt-1 text-xs font-semibold text-destructive'>
                  Harga promo {formatPriceCents(product.sale_price_cents)}
                </p>
              </Show>
            </div>
          )}
        </For>
      </div>
    </section>
  );
}
