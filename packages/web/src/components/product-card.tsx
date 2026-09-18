import { A } from '@solidjs/router';
import { MapPin, Truck } from 'lucide-solid';
import { Show } from 'solid-js';
import { Badge } from '~/components/ui/badge';
import { Card } from '~/components/ui/card';
import { formatPriceCents } from '~/lib/currency';
import { discountPercent, type Product } from '~/queries/products';

const PLACEHOLDER_TONES = [
  'from-primary/15 to-primary/5',
  'from-amber-500/15 to-amber-500/5',
  'from-sky-500/15 to-sky-500/5',
  'from-rose-500/15 to-rose-500/5',
  'from-violet-500/15 to-violet-500/5',
];

export function ProductCard(props: { product: Product }) {
  const discount = () => discountPercent(props.product);
  const tone = () => PLACEHOLDER_TONES[props.product.id % PLACEHOLDER_TONES.length];

  return (
    <Card class='group gap-0 overflow-hidden p-0 transition-shadow hover:shadow-md'>
      <div class={`relative aspect-square w-full bg-gradient-to-br ${tone()}`}>
        <Show when={props.product.images[0]}>
          {(image) => (
            <img
              src={image().url}
              alt={props.product.name}
              loading='lazy'
              class='absolute inset-0 size-full object-cover'
            />
          )}
        </Show>
        <Show when={discount()}>
          <Badge variant='destructive' class='absolute left-2 top-2'>
            -{discount()}%
          </Badge>
        </Show>
      </div>

      <div class='flex flex-col gap-1.5 p-3'>
        <A
          href={`/products/${props.product.slug}`}
          class='line-clamp-2 min-h-10 text-sm font-bold leading-tight text-foreground hover:underline'
        >
          {props.product.name}
        </A>

        <p class='-mt-1 truncate text-xs text-muted-foreground'>
          oleh {props.product.owner.full_name}
        </p>

        <div class='flex items-baseline gap-1.5'>
          <span class='text-base font-semibold text-foreground'>
            {formatPriceCents(props.product.effective_price_cents)}
          </span>
        </div>
        <Show when={discount()}>
          <span class='-mt-1 text-xs text-muted-foreground line-through'>
            {formatPriceCents(props.product.price_cents)}
          </span>
        </Show>

        <div class='flex items-center justify-between'>
          <Show when={props.product.location} fallback={<span />}>
            <span class='flex items-center gap-0.5 text-xs text-muted-foreground'>
              <MapPin class='size-3 shrink-0' aria-hidden='true' />
              {props.product.location}
            </span>
          </Show>
          <Show when={props.product.free_shipping}>
            <span class='flex items-center gap-0.5 text-xs font-medium text-primary'>
              <Truck class='size-3.5' aria-hidden='true' />
              Gratis Ongkir
            </span>
          </Show>
        </div>
      </div>
    </Card>
  );
}
