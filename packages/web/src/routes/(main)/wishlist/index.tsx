import { A } from '@solidjs/router';
import { Heart } from 'lucide-solid';
import { For, Show } from 'solid-js';
import { Button } from '~/components/ui/button';
import { EmptyState } from '~/components/empty-state';
import { ProductCard } from '~/components/product-card';
import { Skeleton } from '~/components/ui/skeleton';
import { useWishlistQuery } from '~/queries/wishlist';

export default function Wishlist() {
  const wishlistQuery = useWishlistQuery();
  const products = () => wishlistQuery.data ?? [];

  return (
    <div class='flex flex-col gap-6 px-4 py-6 sm:px-6'>
      <h1 class='text-xl font-bold text-foreground'>Wishlist Saya</h1>

      <Show
        when={!wishlistQuery.isLoading}
        fallback={
          <div class='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
            <For each={Array(8).fill(0)}>
              {() => <Skeleton class='aspect-[3/4] w-full rounded-xl' />}
            </For>
          </div>
        }
      >
        <Show
          when={products().length > 0}
          fallback={
            <EmptyState
              icon={Heart}
              title='Wishlist masih kosong'
              description='Ketuk ikon hati pada produk untuk menyimpannya di sini.'
              action={
                <Button as={A} href='/products'>
                  Jelajahi Produk
                </Button>
              }
            />
          }
        >
          <div class='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
            <For each={products()}>{(product) => <ProductCard product={product} />}</For>
          </div>
        </Show>
      </Show>
    </div>
  );
}
