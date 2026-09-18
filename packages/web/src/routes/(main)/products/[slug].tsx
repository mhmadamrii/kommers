import { A, useParams } from '@solidjs/router';
import { MapPin, Minus, PackageX, Plus, ShoppingCart, Truck } from 'lucide-solid';
import { createMemo, createSignal, For, Show } from 'solid-js';
import { toast } from 'somoto';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { EmptyState } from '~/components/empty-state';
import { ProductReviews } from '~/components/product-reviews';
import { StarRating } from '~/components/star-rating';
import { useAddCartItemMutation } from '~/queries/cart';
import { ApiError } from '~/lib/api-client';
import { formatPriceCents } from '~/lib/currency';
import { useCategoriesQuery } from '~/queries/categories';
import { discountPercent, useProductQuery } from '~/queries/products';

export default function ProductDetail() {
  const params = useParams();
  const productQuery = useProductQuery(() => params.slug ?? '');
  const categoriesQuery = useCategoriesQuery();
  const product = () => productQuery.data;

  const category = createMemo(() =>
    categoriesQuery.data?.find((c) => c.id === product()?.category_id),
  );

  const [activeImage, setActiveImage] = createSignal(0);
  const [quantity, setQuantity] = createSignal(1);

  const discount = createMemo(() => {
    const p = product();
    return p ? discountPercent(p) : null;
  });

  const subtotalCents = createMemo(() => {
    const p = product();
    return p ? p.effective_price_cents * quantity() : 0;
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
      <Show
        when={!productQuery.isLoading}
        fallback={
          <div class='grid grid-cols-1 gap-6 md:grid-cols-[340px_1fr_280px]'>
            <Skeleton class='mx-auto aspect-square w-full max-w-sm rounded-xl md:mx-0 md:max-w-none' />
            <div class='flex flex-col gap-3'>
              <Skeleton class='h-8 w-2/3 rounded-md' />
              <Skeleton class='h-5 w-1/3 rounded-md' />
              <Skeleton class='h-10 w-1/2 rounded-md' />
            </div>
            <Skeleton class='h-64 w-full rounded-xl' />
          </div>
        }
      >
        <Show
          when={product()}
          fallback={<EmptyState icon={PackageX} title='Produk tidak ditemukan' />}
        >
          {(p) => (
            <>
              <nav class='flex items-center gap-1.5 text-sm text-muted-foreground'>
                <A href='/' class='hover:text-foreground hover:underline'>
                  Beranda
                </A>
                <span aria-hidden='true'>/</span>
                <Show when={category()}>
                  {(c) => (
                    <>
                      <A
                        href={`/products?category_id=${c().id}`}
                        class='hover:text-foreground hover:underline'
                      >
                        {c().name}
                      </A>
                      <span aria-hidden='true'>/</span>
                    </>
                  )}
                </Show>
                <span class='max-w-xs truncate text-foreground'>{p().name}</span>
              </nav>

              <div class='grid grid-cols-1 gap-6 md:grid-cols-[340px_1fr_280px]'>
                <div class='mx-auto flex w-full max-w-sm flex-col gap-3 md:mx-0 md:max-w-none'>
                  <div class='aspect-square w-full overflow-hidden rounded-xl bg-accent'>
                    <Show
                      when={p().images[activeImage()] ?? p().images[0]}
                      fallback={
                        <div class='size-full bg-gradient-to-br from-primary/15 to-primary/5' />
                      }
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
                    <h1 class='text-xl font-bold leading-snug text-foreground sm:text-2xl'>
                      {p().name}
                    </h1>
                    <p class='mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground'>
                      Dijual oleh <span class='font-medium text-foreground'>{p().owner.full_name}</span>
                      <Show when={p().location}>
                        <span class='flex items-center gap-0.5'>
                          <MapPin class='size-3.5' aria-hidden='true' />
                          {p().location}
                        </span>
                      </Show>
                    </p>
                    <Show when={p().review_count > 0}>
                      <div class='mt-1.5 flex items-center gap-1.5'>
                        <StarRating rating={p().average_rating} />
                        <span class='text-sm text-muted-foreground'>
                          {p().average_rating.toFixed(1)} ({p().review_count} ulasan)
                        </span>
                      </div>
                    </Show>
                  </div>

                  <div class='flex items-baseline gap-2 border-y border-border py-4'>
                    <Show when={discount()}>
                      <Badge variant='destructive'>-{discount()}%</Badge>
                    </Show>
                    <span class='text-2xl font-bold text-foreground sm:text-3xl'>
                      {formatPriceCents(p().effective_price_cents)}
                    </span>
                    <Show when={discount()}>
                      <span class='text-sm text-muted-foreground line-through'>
                        {formatPriceCents(p().price_cents)}
                      </span>
                    </Show>
                  </div>

                  <div>
                    <h2 class='w-fit border-b-2 border-primary pb-2 text-sm font-bold text-foreground'>
                      Detail Produk
                    </h2>
                    <dl class='mt-3 flex flex-col gap-2 text-sm'>
                      <div class='flex gap-3'>
                        <dt class='w-28 shrink-0 text-muted-foreground'>Kategori</dt>
                        <dd class='font-medium text-foreground'>{category()?.name ?? '—'}</dd>
                      </div>
                      <div class='flex gap-3'>
                        <dt class='w-28 shrink-0 text-muted-foreground'>Stok</dt>
                        <dd class='font-medium text-foreground'>{p().stock}</dd>
                      </div>
                      <div class='flex gap-3'>
                        <dt class='w-28 shrink-0 text-muted-foreground'>Pengiriman</dt>
                        <dd class='flex items-center gap-1 font-medium text-foreground'>
                          <Show when={p().free_shipping} fallback='Reguler'>
                            <Truck class='size-3.5 text-primary' aria-hidden='true' />
                            <span class='text-primary'>Gratis Ongkir</span>
                          </Show>
                        </dd>
                      </div>
                    </dl>

                    <Show when={p().description}>
                      <p class='mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground'>
                        {p().description}
                      </p>
                    </Show>
                  </div>
                </div>

                <div class='md:sticky md:top-6 md:self-start'>
                  <Card class='gap-3 p-4'>
                    <div class='flex items-center gap-2.5'>
                      <div class='size-11 shrink-0 overflow-hidden rounded-md bg-accent'>
                        <Show when={p().images[0]}>
                          {(image) => (
                            <img src={image().url} alt='' class='size-full object-cover' />
                          )}
                        </Show>
                      </div>
                      <span class='line-clamp-2 text-sm font-medium text-foreground'>{p().name}</span>
                    </div>

                    <div class='h-px bg-border' />

                    <div class='flex items-center justify-between'>
                      <span class='text-sm text-muted-foreground'>Jumlah</span>
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
                    </div>
                    <p class='-mt-2 text-right text-xs text-muted-foreground'>Stok: {p().stock}</p>

                    <div class='flex items-center justify-between text-sm'>
                      <span class='text-muted-foreground'>Subtotal</span>
                      <span class='font-bold text-foreground'>{formatPriceCents(subtotalCents())}</span>
                    </div>

                    <Button
                      class='w-full gap-2'
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
                  </Card>
                </div>
              </div>

              <ProductReviews
                slug={p().slug}
                averageRating={p().average_rating}
                reviewCount={p().review_count}
              />
            </>
          )}
        </Show>
      </Show>
    </div>
  );
}
