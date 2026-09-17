/**
 * DIRECTION CONTRACT
 * THESIS: A multi-vendor bazaar for an intentional shopper — the page proves
 *   "search, filter, buy fast" immediately, not a curated single-brand story.
 * OWN-WORLD: Restrained neutrals (existing shadcn/kobalte token system) + one
 *   committed emerald accent (--primary) carrying CTAs, prices, and active
 *   states; friendly rounded geometry (Plus Jakarta Sans, 0.625rem radius);
 *   color allowed to fill full sections only in the hero/promo band.
 * STORY: Visitor lands, sees the search bar and category rail before
 *   anything else, sees a live flash-sale clock, then a dense product grid —
 *   believes this is a real, active, buyable marketplace.
 * FIRST VIEWPORT: sticky nav (logo, category menu, search, cart, auth) above
 *   an auto-rotating promo hero (2/3) + stacked side promos (1/3), primary
 *   action = the search bar, not the hero CTA.
 * FORM: reference = Tokopedia homepage grammar (user-supplied screenshot),
 *   direction pinned by the user — concept-seed direction roll skipped per
 *   "brief-pinned direction beats the roll" (new-work.md §3/§5).
 * FINISH: unreviewed and undocumented is unfinished; this build ends with
 *   the finish review, the verdict, DESIGN.md, and every shipping raster
 *   carrying its provenance. (Reviewed here via direct screenshot + manual
 *   check, not the full subagent finish-reviewer — disclosed simplification.)
 *   Since wired to the real GET /api/v1/products and /api/v1/categories.
 */
import { A } from '@solidjs/router';
import { ChevronRight, Sparkles, Zap } from 'lucide-solid';
import { For, Show, createMemo, createSignal, onCleanup } from 'solid-js';
import { Badge } from '~/components/ui/badge';
import { ProductCard } from '~/components/product-card';
import { Skeleton } from '~/components/ui/skeleton';
import { categoryIcon } from '~/lib/category-icons';
import { useCategoriesQuery } from '~/queries/categories';
import { useProductsQuery } from '~/queries/products';

const HERO_SLIDES = [
  {
    headline: 'Gajian Sale',
    subcopy: 'Diskon sampai 70% untuk ribuan produk pilihan',
    cta: 'Belanja Sekarang',
    tone: 'from-primary via-primary to-emerald-700',
  },
  {
    headline: 'Gratis Ongkir Se-Indonesia',
    subcopy: 'Belanja tanpa mikir ongkos kirim, min. belanja Rp0',
    cta: 'Lihat Promo',
    tone: 'from-sky-600 via-sky-600 to-blue-800',
  },
  {
    headline: 'Seller Baru? Yuk Mulai Jualan',
    subcopy: 'Daftar jadi penjual gratis, tanpa komisi bulan pertama',
    cta: 'Jadi Seller',
    tone: 'from-amber-500 via-orange-500 to-orange-600',
  },
];

function useFlashSaleCountdown() {
  const target = Date.now() + 3 * 60 * 60 * 1000 + 24 * 60 * 1000;
  const [remaining, setRemaining] = createSignal(target - Date.now());

  const interval = setInterval(() => setRemaining(Math.max(0, target - Date.now())), 1000);
  onCleanup(() => clearInterval(interval));

  return createMemo(() => {
    const total = remaining();
    const hours = Math.floor(total / 3_600_000);
    const minutes = Math.floor((total % 3_600_000) / 60_000);
    const seconds = Math.floor((total % 60_000) / 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  });
}

function HeroCarousel() {
  const [active, setActive] = createSignal(0);

  const interval = setInterval(() => setActive((i) => (i + 1) % HERO_SLIDES.length), 5000);
  onCleanup(() => clearInterval(interval));

  return (
    <div class='relative h-full overflow-hidden rounded-2xl'>
      <For each={HERO_SLIDES}>
        {(slide, i) => (
          <div
            class='absolute inset-0 flex flex-col justify-center gap-4 bg-gradient-to-br px-8 py-10 transition-opacity duration-700 sm:px-12'
            classList={{
              [slide.tone]: true,
              'opacity-100': active() === i(),
              'opacity-0': active() !== i(),
            }}
            aria-hidden={active() !== i()}
          >
            <h1 class='max-w-sm text-3xl font-extrabold leading-tight text-white sm:text-4xl'>
              {slide.headline}
            </h1>
            <p class='max-w-xs text-sm text-white/90 sm:text-base'>{slide.subcopy}</p>
            <button
              type='button'
              class='inline-flex w-fit items-center gap-1 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition-transform hover:scale-105'
            >
              {slide.cta}
              <ChevronRight class='size-4' aria-hidden='true' />
            </button>
          </div>
        )}
      </For>

      <div class='absolute bottom-4 left-8 flex gap-1.5 sm:left-12'>
        <For each={HERO_SLIDES}>
          {(_, i) => (
            <button
              type='button'
              aria-label={`Slide ${i() + 1}`}
              onClick={() => setActive(i())}
              class='h-1.5 rounded-full bg-white/50 transition-all'
              classList={{ 'w-6 bg-white': active() === i(), 'w-1.5': active() !== i() }}
            />
          )}
        </For>
      </div>
    </div>
  );
}

function SidePromo(props: { title: string; subtitle: string; tone: string }) {
  return (
    <div class={`flex flex-1 flex-col justify-center gap-1 rounded-2xl bg-gradient-to-br px-5 py-4 ${props.tone}`}>
      <p class='text-sm font-bold text-white'>{props.title}</p>
      <p class='text-xs text-white/85'>{props.subtitle}</p>
    </div>
  );
}

export default function Home() {
  const countdown = useFlashSaleCountdown();

  const categoriesQuery = useCategoriesQuery();
  const categories = () => categoriesQuery.data ?? [];

  const productsQuery = useProductsQuery(() => ({ limit: 20 }));
  const products = () => productsQuery.data ?? [];
  const flashSaleProducts = createMemo(() => products().filter((p) => p.original_price_cents));

  return (
    <div class='mx-auto flex max-w-7xl flex-col gap-10 px-4 py-6 sm:px-6'>
      <section class='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <div class='sm:col-span-2'>
          <div class='aspect-[16/9] sm:aspect-[21/9]'>
            <HeroCarousel />
          </div>
        </div>
        <div class='flex flex-col gap-4 sm:col-span-1'>
          <SidePromo title='Cashback 20%' subtitle='Bayar pakai kommers Pay' tone='from-violet-600 to-purple-700' />
          <SidePromo title='Produk Lokal Pilihan' subtitle='Dukung UMKM Indonesia' tone='from-rose-500 to-pink-600' />
        </div>
      </section>

      <section>
        <h2 class='mb-4 text-lg font-bold text-foreground'>Kategori Pilihan</h2>
        <div class='grid grid-cols-4 gap-3 sm:grid-cols-8'>
          <Show
            when={!categoriesQuery.isLoading}
            fallback={
              <For each={Array(8).fill(0)}>
                {() => <Skeleton class='h-24 w-full rounded-xl' />}
              </For>
            }
          >
            <For each={categories()}>
              {(category) => {
                const Icon = categoryIcon(category.slug);
                return (
                  <A
                    href={`/products?category_id=${category.id}`}
                    class='flex flex-col items-center gap-2 rounded-xl border border-border p-3 text-center transition-colors hover:border-primary hover:bg-accent'
                  >
                    <span class='flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground'>
                      <Icon class='size-5' aria-hidden='true' />
                    </span>
                    <span class='line-clamp-2 text-[11px] font-medium leading-tight text-foreground'>
                      {category.name}
                    </span>
                  </A>
                );
              }}
            </For>
          </Show>
        </div>
      </section>

      <section>
        <div class='mb-4 flex items-center justify-between'>
          <div class='flex items-center gap-2'>
            <span class='flex size-7 items-center justify-center rounded-full bg-destructive text-white'>
              <Zap class='size-4 fill-white' aria-hidden='true' />
            </span>
            <h2 class='text-lg font-bold text-foreground'>Flash Sale</h2>
            <Badge variant='destructive' class='font-mono tabular-nums'>
              {countdown()}
            </Badge>
          </div>
          <A href='/products' class='flex items-center gap-0.5 text-sm font-medium text-primary hover:underline'>
            Lihat Semua
            <ChevronRight class='size-4' aria-hidden='true' />
          </A>
        </div>

        <Show
          when={!productsQuery.isLoading}
          fallback={
            <div class='grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6'>
              <For each={Array(6).fill(0)}>
                {() => <Skeleton class='aspect-[3/4] w-full rounded-xl' />}
              </For>
            </div>
          }
        >
          <div class='scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 lg:grid-cols-6'>
            <For each={flashSaleProducts()}>
              {(product) => (
                <div class='w-40 shrink-0 sm:w-auto'>
                  <ProductCard product={product} />
                </div>
              )}
            </For>
          </div>
        </Show>
      </section>

      <section>
        <div class='mb-4 flex items-center gap-2'>
          <Sparkles class='size-5 text-primary' aria-hidden='true' />
          <h2 class='text-lg font-bold text-foreground'>Rekomendasi Untukmu</h2>
        </div>

        <Show
          when={!productsQuery.isLoading}
          fallback={
            <div class='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
              <For each={Array(10).fill(0)}>
                {() => <Skeleton class='aspect-[3/4] w-full rounded-xl' />}
              </For>
            </div>
          }
        >
          <div class='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
            <For each={products()}>{(product) => <ProductCard product={product} />}</For>
          </div>
        </Show>
      </section>
    </div>
  );
}
