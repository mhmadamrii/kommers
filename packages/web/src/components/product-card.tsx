import { A } from '@solidjs/router';
import { Heart, MapPin, Truck } from 'lucide-solid';
import { Show } from 'solid-js';
import { toast } from 'somoto';
import { Badge } from '~/components/ui/badge';
import { Card } from '~/components/ui/card';
import { StarRating } from '~/components/star-rating';
import { ApiError } from '~/lib/api-client';
import { formatPriceCents } from '~/lib/currency';
import { useMeQuery } from '~/queries/auth';
import { discountPercent, type Product } from '~/queries/products';

import {
  useAddToWishlistMutation,
  useIsWishlisted,
  useRemoveFromWishlistMutation,
} from '~/queries/wishlist';

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

  const meQuery = useMeQuery();
  const productId = () => props.product.id;
  const isWishlisted = useIsWishlisted(productId);
  const addToWishlist = useAddToWishlistMutation();
  const removeFromWishlist = useRemoveFromWishlistMutation();
  const wishlistPending = () => addToWishlist.isPending || removeFromWishlist.isPending;

  function toggleWishlist(e: MouseEvent) {
    // Card body is a link to the product page — the heart sits on top of
    // it, so without this the click both toggles the wishlist and
    // navigates away.
    e.preventDefault();
    e.stopPropagation();

    if (!meQuery.data) {
      toast.error('Masuk untuk menyimpan produk ke wishlist.');
      return;
    }
    if (wishlistPending()) return;

    const id = productId();
    const mutation = isWishlisted() ? removeFromWishlist : addToWishlist;
    mutation.mutate(id, {
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : 'Gagal memperbarui wishlist.');
      },
    });
  }

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
        <button
          type='button'
          aria-label={isWishlisted() ? 'Hapus dari wishlist' : 'Simpan ke wishlist'}
          aria-pressed={isWishlisted()}
          onClick={toggleWishlist}
          disabled={wishlistPending()}
          class='absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur transition-colors hover:text-destructive disabled:opacity-50'
        >
          <Heart
            class='size-4'
            classList={{ 'fill-destructive text-destructive': isWishlisted() }}
            aria-hidden='true'
          />
        </button>
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

        <Show when={props.product.review_count > 0}>
          <div class='-mt-0.5 flex items-center gap-1'>
            <StarRating rating={props.product.average_rating} />
            <span class='text-xs text-muted-foreground'>({props.product.review_count})</span>
          </div>
        </Show>

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
