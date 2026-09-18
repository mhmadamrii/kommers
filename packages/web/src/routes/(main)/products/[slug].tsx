import { A, useParams } from '@solidjs/router';
import { MapPin, Minus, PackageX, Plus, ShoppingCart, Truck } from 'lucide-solid';
import { createMemo, createSignal, For, Show } from 'solid-js';
import { toast } from 'somoto';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { EmptyState } from '~/components/empty-state';
import { useAddCartItemMutation } from '~/queries/cart';
import { ApiError } from '~/lib/api-client';
import { formatPriceCents } from '~/lib/currency';
import { discountPercent, useProductQuery } from '~/queries/products';

export default function ProductDetail() {
  const params = useParams();
  const productQuery = useProductQuery(() => params.slug);
  const product = () => productQuery.data;

  const [activeImage, setActiveImage] = createSignal(0);
  const [quantity, setQuantity] = createSignal(1);

  const discount = createMemo(() => {
    const p = product();
    return p ? discountPercent(p) : null;
  });

  const addToCart = useAddCartItemMutation();

  function handleAddToCart() {
    const p = product();
    if (!p) return;
    addToCart.mutate(
      { product_id: p.id, quantity: quantity() },
      {
        onSuccess: () => toast.success('Ditambahkan ke keranjang.'),
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : 'Gagal menambahkan ke keranjang.');
        },
      },
    );
  }

  return (
    <div class='flex flex-col gap-6 px-4 py-6 sm:px-6'>
      <A href='/products' class='text-sm text-muted-foreground hover:underline'>
        &larr; Kembali ke Produk
      </A>

      <Show
        when={!productQuery.isLoading}
        fallback={
          <div class='grid grid-cols-1 gap-8 lg:grid-cols-[480px_1fr]'>
            <Skeleton class='aspect-square w-full rounded-xl' />
            <div class='flex flex-col gap-3'>
              <Skeleton class='h-8 w-2/3 rounded-md' />
              <Skeleton class='h-5 w-1/3 rounded-md' />
              <Skeleton class='h-10 w-1/2 rounded-md' />
            </div>
          </div>
        }
      >
        <Show
          when={product()}
          fallback={<EmptyState icon={PackageX} title='Produk tidak ditemukan' />}
        >
          {(p) => (
            <div class='grid grid-cols-1 gap-8 lg:grid-cols-[480px_1fr]'>
              <div class='flex flex-col gap-3'>
                <div class='aspect-square w-full overflow-hidden rounded-xl bg-accent'>
                  <Show
                    when={p().images[activeImage()] ?? p().images[0]}
                    fallback={<div class='size-full bg-gradient-to-br from-primary/15 to-primary/5' />}
                  >
                    {(image) => (
                      <img src={image().url} alt={p().name} class='size-full object-cover' />
                    )}
                  </Show>
                </div>

                <Show when={p().images.length > 1}>
                  <div class='flex gap-2'>
                    <For each={p().images}>
                      {(image, i) => (
                        <button
                          type='button'
                          onClick={() => setActiveImage(i())}
                          class='size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors'
                          classList={{
                            'border-primary': activeImage() === i(),
                            'border-transparent': activeImage() !== i(),
                          }}
                        >
                          <img src={image.url} alt='' class='size-full object-cover' />
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </div>

              <div class='flex flex-col gap-4'>
                <div>
                  <h1 class='text-2xl font-bold text-foreground'>{p().name}</h1>
                  <p class='mt-1 text-sm text-muted-foreground'>
                    Dijual oleh <span class='font-medium text-foreground'>{p().owner.full_name}</span>
                  </p>
                </div>

                <div class='flex items-baseline gap-2'>
                  <span class='text-3xl font-bold text-foreground'>
                    {formatPriceCents(p().effective_price_cents)}
                  </span>
                  <Show when={discount()}>
                    <span class='text-base text-muted-foreground line-through'>
                      {formatPriceCents(p().price_cents)}
                    </span>
                    <Badge variant='destructive'>-{discount()}%</Badge>
                  </Show>
                </div>

                <div class='flex flex-wrap items-center gap-3 text-sm text-muted-foreground'>
                  <Show when={p().location}>
                    <span class='flex items-center gap-1'>
                      <MapPin class='size-4' aria-hidden='true' />
                      {p().location}
                    </span>
                  </Show>
                  <Show when={p().free_shipping}>
                    <span class='flex items-center gap-1 font-medium text-primary'>
                      <Truck class='size-4' aria-hidden='true' />
                      Gratis Ongkir
                    </span>
                  </Show>
                  <span>Stok: {p().stock}</span>
                </div>

                <Show when={p().description}>
                  <p class='whitespace-pre-line text-sm leading-relaxed text-foreground'>
                    {p().description}
                  </p>
                </Show>

                <div class='mt-auto flex items-center gap-3 pt-2'>
                  <div class='flex items-center gap-1'>
                    <Button
                      variant='outline'
                      size='icon-sm'
                      disabled={quantity() <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      <Minus class='size-3.5' aria-hidden='true' />
                    </Button>
                    <span class='w-8 text-center text-sm'>{quantity()}</span>
                    <Button
                      variant='outline'
                      size='icon-sm'
                      disabled={quantity() >= p().stock}
                      onClick={() => setQuantity((q) => Math.min(p().stock, q + 1))}
                    >
                      <Plus class='size-3.5' aria-hidden='true' />
                    </Button>
                  </div>

                  <Button
                    class='flex-1 gap-2'
                    disabled={p().stock === 0 || addToCart.isPending}
                    onClick={handleAddToCart}
                  >
                    <ShoppingCart class='size-4' aria-hidden='true' />
                    {p().stock === 0
                      ? 'Stok Habis'
                      : addToCart.isPending
                        ? 'Menambahkan...'
                        : 'Tambah ke Keranjang'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
}
