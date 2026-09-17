import { useSearchParams } from '@solidjs/router';
import { ListFilter, PackageSearch, Star } from 'lucide-solid';
import { For, Show, createMemo, createSignal } from 'solid-js';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '~/components/ui/drawer';
import { Button } from '~/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { TextField, TextFieldInput, TextFieldLabel } from '~/components/ui/text-field';
import { EmptyState } from '~/components/empty-state';
import { ProductCard } from '~/components/product-card';
import { dummyCategories, dummyProducts, type DummyProduct } from '~/lib/dummy-data';

type SortOption = { value: string; label: string };

const SORT_OPTIONS: SortOption[] = [
  { value: 'relevant', label: 'Paling Sesuai' },
  { value: 'newest', label: 'Terbaru' },
  { value: 'price_asc', label: 'Harga Terendah' },
  { value: 'price_desc', label: 'Harga Tertinggi' },
  { value: 'rating', label: 'Rating Tertinggi' },
];

const RATING_OPTIONS = [4.5, 4, 3];

function sortProducts(products: DummyProduct[], sort: string): DummyProduct[] {
  const sorted = [...products];
  switch (sort) {
    case 'newest':
      return sorted.reverse();
    case 'price_asc':
      return sorted.sort((a, b) => a.priceCents - b.priceCents);
    case 'price_desc':
      return sorted.sort((a, b) => b.priceCents - a.priceCents);
    case 'rating':
      return sorted.sort((a, b) => b.rating - a.rating);
    default:
      return sorted;
  }
}

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();

  const toSingle = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const [categoryId, setCategoryId] = createSignal(
    searchParams.category_id ? Number(toSingle(searchParams.category_id)) : undefined,
  );
  const [minPrice, setMinPrice] = createSignal('');
  const [maxPrice, setMaxPrice] = createSignal('');
  const [minRating, setMinRating] = createSignal<number | undefined>(undefined);
  const [sort, setSort] = createSignal<SortOption>(SORT_OPTIONS[0]!);
  const [filterOpen, setFilterOpen] = createSignal(false);

  const query = createMemo(() => (toSingle(searchParams.q) ?? '').trim().toLowerCase());

  const activeCategory = createMemo(() =>
    dummyCategories.find((c) => c.id === categoryId()),
  );

  const filtered = createMemo(() => {
    const minCents = minPrice() ? Number(minPrice()) * 100 : undefined;
    const maxCents = maxPrice() ? Number(maxPrice()) * 100 : undefined;

    const result = dummyProducts.filter((product) => {
      if (categoryId() !== undefined && product.categoryId !== categoryId()) return false;
      if (query() && !product.name.toLowerCase().includes(query())) return false;
      if (minCents !== undefined && product.priceCents < minCents) return false;
      if (maxCents !== undefined && product.priceCents > maxCents) return false;
      if (minRating() !== undefined && product.rating < minRating()!) return false;
      return true;
    });

    return sortProducts(result, sort().value);
  });

  function selectCategory(id: number | undefined) {
    setCategoryId(id);
    setSearchParams({ category_id: id ? String(id) : undefined });
  }

  function clearFilters() {
    setMinPrice('');
    setMaxPrice('');
    setMinRating(undefined);
    selectCategory(undefined);
  }

  const FilterPanel = () => (
    <div class='flex flex-col gap-6'>
      <div>
        <p class='mb-3 text-sm font-semibold text-foreground'>Kategori</p>
        <div class='flex flex-col gap-1'>
          <button
            type='button'
            onClick={() => selectCategory(undefined)}
            class='rounded-md px-2 py-1.5 text-left text-sm transition-colors'
            classList={{
              'bg-accent text-accent-foreground font-medium': categoryId() === undefined,
              'text-muted-foreground hover:bg-accent/50': categoryId() !== undefined,
            }}
          >
            Semua Kategori
          </button>
          <For each={dummyCategories}>
            {(category) => (
              <button
                type='button'
                onClick={() => selectCategory(category.id)}
                class='flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors'
                classList={{
                  'bg-accent text-accent-foreground font-medium': categoryId() === category.id,
                  'text-muted-foreground hover:bg-accent/50': categoryId() !== category.id,
                }}
              >
                <category.icon class='size-4' aria-hidden='true' />
                {category.name}
              </button>
            )}
          </For>
        </div>
      </div>

      <div>
        <p class='mb-3 text-sm font-semibold text-foreground'>Rentang Harga</p>
        <div class='flex items-center gap-2'>
          <TextField class='w-full'>
            <TextFieldLabel class='sr-only'>Harga minimum</TextFieldLabel>
            <TextFieldInput
              type='number'
              placeholder='Min'
              value={minPrice()}
              onInput={(e) => setMinPrice(e.currentTarget.value)}
            />
          </TextField>
          <span class='text-muted-foreground'>–</span>
          <TextField class='w-full'>
            <TextFieldLabel class='sr-only'>Harga maksimum</TextFieldLabel>
            <TextFieldInput
              type='number'
              placeholder='Max'
              value={maxPrice()}
              onInput={(e) => setMaxPrice(e.currentTarget.value)}
            />
          </TextField>
        </div>
      </div>

      <div>
        <p class='mb-3 text-sm font-semibold text-foreground'>Rating Minimum</p>
        <div class='flex flex-col gap-1'>
          <For each={RATING_OPTIONS}>
            {(rating) => (
              <button
                type='button'
                onClick={() => setMinRating(minRating() === rating ? undefined : rating)}
                class='flex items-center gap-1 rounded-md px-2 py-1.5 text-left text-sm transition-colors'
                classList={{
                  'bg-accent text-accent-foreground font-medium': minRating() === rating,
                  'text-muted-foreground hover:bg-accent/50': minRating() !== rating,
                }}
              >
                <Star class='size-3.5 fill-amber-400 text-amber-400' aria-hidden='true' />
                {rating.toFixed(1)}+
              </button>
            )}
          </For>
        </div>
      </div>

      <Button variant='outline' onClick={clearFilters}>
        Reset Filter
      </Button>
    </div>
  );

  return (
    <div class='mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6'>
      <div>
        <h1 class='text-xl font-bold text-foreground'>
          <Show when={query()} fallback={activeCategory()?.name ?? 'Semua Produk'}>
            Hasil untuk &ldquo;{toSingle(searchParams.q)}&rdquo;
          </Show>
        </h1>
        <p class='text-sm text-muted-foreground'>{filtered().length} produk ditemukan</p>
      </div>

      <div class='flex gap-6'>
        <aside class='hidden w-56 shrink-0 sm:block'>
          <FilterPanel />
        </aside>

        <div class='flex-1'>
          <div class='mb-4 flex items-center justify-between gap-2'>
            <Drawer open={filterOpen()} onOpenChange={setFilterOpen}>
              <DrawerTrigger
                as={Button}
                variant='outline'
                size='sm'
                class='gap-1.5 sm:hidden'
              >
                <ListFilter class='size-4' aria-hidden='true' />
                Filter
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Filter Produk</DrawerTitle>
                </DrawerHeader>
                <div class='max-h-[70vh] overflow-y-auto px-4 pb-4'>
                  <FilterPanel />
                </div>
                <DrawerClose as={Button} class='m-4 mt-0'>
                  Terapkan
                </DrawerClose>
              </DrawerContent>
            </Drawer>

            <Select<SortOption>
              class='ml-auto w-48'
              options={SORT_OPTIONS}
              optionValue='value'
              optionTextValue='label'
              value={sort()}
              onChange={(value) => value && setSort(value)}
              itemComponent={(itemProps) => (
                <SelectItem item={itemProps.item}>{itemProps.item.rawValue.label}</SelectItem>
              )}
            >
              <SelectTrigger>
                <SelectValue<SortOption>>{(state) => state.selectedOption().label}</SelectValue>
              </SelectTrigger>
              <SelectPortal>
                <SelectContent />
              </SelectPortal>
            </Select>
          </div>

          <Show
            when={filtered().length > 0}
            fallback={
              <EmptyState
                icon={PackageSearch}
                title='Produk tidak ditemukan'
                description='Coba ubah kata kunci pencarian atau reset filter yang sedang aktif.'
                action={
                  <Button variant='outline' onClick={clearFilters}>
                    Reset Filter
                  </Button>
                }
              />
            }
          >
            <div class='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
              <For each={filtered()}>{(product) => <ProductCard product={product} />}</For>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}
