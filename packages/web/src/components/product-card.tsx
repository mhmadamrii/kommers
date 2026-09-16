import { Star, Truck } from 'lucide-solid';
import { Show } from 'solid-js';
import { Badge } from '~/components/ui/badge';
import { Card } from '~/components/ui/card';
import { formatPriceCents } from '~/lib/currency';
import { discountPercent, type DummyProduct } from '~/lib/dummy-data';

const PLACEHOLDER_TONES = [
  'from-primary/15 to-primary/5',
  'from-amber-500/15 to-amber-500/5',
  'from-sky-500/15 to-sky-500/5',
  'from-rose-500/15 to-rose-500/5',
  'from-violet-500/15 to-violet-500/5',
];

export function ProductCard(props: { product: DummyProduct }) {
  const discount = () => discountPercent(props.product);
  const tone = () => PLACEHOLDER_TONES[props.product.id % PLACEHOLDER_TONES.length];

  return (
    <Card class='group gap-0 overflow-hidden p-0 transition-shadow hover:shadow-md'>
      <div class={`relative aspect-square w-full bg-gradient-to-br ${tone()}`}>
        <Show when={discount()}>
          <Badge variant='destructive' class='absolute left-2 top-2'>
            -{discount()}%
          </Badge>
        </Show>
      </div>

      <div class='flex flex-col gap-1.5 p-3'>
        <p class='line-clamp-2 min-h-10 text-sm leading-tight text-foreground'>
          {props.product.name}
        </p>

        <div class='flex items-baseline gap-1.5'>
          <span class='text-base font-semibold text-foreground'>
            {formatPriceCents(props.product.priceCents)}
          </span>
        </div>
        <Show when={props.product.originalPriceCents}>
          <span class='-mt-1 text-xs text-muted-foreground line-through'>
            {formatPriceCents(props.product.originalPriceCents!)}
          </span>
        </Show>

        <div class='flex items-center gap-1 text-xs text-muted-foreground'>
          <Star class='size-3.5 fill-amber-400 text-amber-400' />
          <span>{props.product.rating.toFixed(1)}</span>
          <span aria-hidden='true'>·</span>
          <span>{props.product.soldLabel}</span>
        </div>

        <div class='flex items-center justify-between'>
          <span class='text-xs text-muted-foreground'>{props.product.location}</span>
          <Show when={props.product.freeShipping}>
            <span class='flex items-center gap-0.5 text-xs font-medium text-primary'>
              <Truck class='size-3.5' />
              Gratis Ongkir
            </span>
          </Show>
        </div>
      </div>
    </Card>
  );
}
