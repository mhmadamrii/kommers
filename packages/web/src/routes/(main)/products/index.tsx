import { useSearchParams } from '@solidjs/router';
import { ListFilter, PackageSearch } from 'lucide-solid';
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
import { Skeleton } from '~/components/ui/skeleton';
import { TextField, TextFieldInput, TextFieldLabel } from '~/components/ui/text-field';
import { EmptyState } from '~/components/empty-state';
import { ProductCard } from '~/components/product-card';
import { categoryIcon } from '~/lib/category-icons';
import { useCategoriesQuery } from '~/queries/categories';
import { useProductsQuery } from '~/queries/products';

type SortOption = { value: string; label: string };

// No 'newest' option: the backend already returns products newest-first by
// default, so a second "newest" sort would be a no-op duplicate of
// "relevant". No rating sort either — there's no review/rating system.
const SORT_OPTIONS: SortOption[] = [
  { value: 'relevant', label: 'Paling Sesuai' },
  { value: 'price_asc', label: 'Harga Terendah' },
  { value: 'price_desc', label: 'Harga Tertinggi' },
];

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();

  const toSingle = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const [categoryId, setCategoryId] = createSignal(
    searchParams.category_id ? Number(toSingle(searchParams.category_id)) : undefined,
  );
  const [minPrice, setMinPrice] = createSignal('');
  const [maxPrice, setMaxPrice] = createSignal('');
  const [sort, setSort] = createSignal<SortOption>(SORT_OPTIONS[0]!);
  const [filterOpen, setFilterOpen] = createSignal(false);

  const query = createMemo(() => (toSingle(searchParams.q) ?? '').trim().toLowerCase());

  const categoriesQuery = useCategoriesQuery();
  const categories = () => categoriesQuery.data ?? [];
  const activeCategory = createMemo(() => categories().find((c) => c.id === categoryId()));

  const filters = createMemo(() => ({
    categoryId: categoryId(),
    q: query(),
    minPriceCents: minPrice() ? Number(minPrice()) * 100 : undefined,
    maxPriceCents: maxPrice() ? Number(maxPrice()) * 100 : undefined,
    sort: sort().value,
  }));

  const productsQuery = useProductsQuery(filters);
  const products = createMemo(() => productsQuery.data ?? []);

  function selectCategory(id: number | undefined) {
    setCategoryId(id);
    setSearchParams({ category_id: id ? String(id) : undefined });
  }

  function clearFilters() {
    setMinPrice('');
    setMaxPrice('');
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
          <For each={categories()}>
            {(category) => {
              const Icon = categoryIcon(category.slug);
              return (
                <button
                  type='button'
                  onClick={() => selectCategory(category.id)}
                  class='flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors'
                  classList={{
                    'bg-accent text-accent-foreground font-medium': categoryId() === category.id,
                    'text-muted-foreground hover:bg-accent/50': categoryId() !== category.id,
                  }}
                >
                  <Icon class='size-4' aria-hidden='true' />
                  {category.name}
                </button>
              );
            }}
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

      <Button variant='outline' onClick={clearFilters}>
        Reset Filter
      </Button>
    </div>
  );

  return (
    <div class='flex flex-col gap-6 px-4 py-6 sm:px-6'>
      <div>
        <h1 class='text-xl font-bold text-foreground'>
          <Show when={query()} fallback={activeCategory()?.name ?? 'Semua Produk'}>
            Hasil untuk &ldquo;{toSingle(searchParams.q)}&rdquo;
          </Show>
        </h1>
        <p class='text-sm text-muted-foreground'>
          <Show when={!productsQuery.isLoading} fallback='Memuat...'>
            {products().length} produk ditemukan
          </Show>
        </p>
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
            when={!productsQuery.isLoading}
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
                <For each={products()}>{(product) => <ProductCard product={product} />}</For>
              </div>
            </Show>
          </Show>
        </div>
      </div>
    </div>
  );
}
