import { A, useNavigate } from '@solidjs/router';
import { keepPreviousData, useQuery } from '@tanstack/solid-query';
import { Flame, Heart, LogOut, MapPin, Package, PackageSearch, Search, Store, Ticket, TrendingUp, User } from 'lucide-solid';
import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js';
import { toast } from 'somoto';
import { Button } from '~/components/ui/button';
import { CartDrawer } from '~/components/cart-drawer';
import { LoginDialog } from '~/components/login-dialog';
import { SellerApplyDialog } from '~/components/seller-apply-dialog';
import { Skeleton } from '~/components/ui/skeleton';
import { TextField, TextFieldInput } from '~/components/ui/text-field';
import { apiFetch } from '~/lib/api-client';
import { formatPriceCents } from '~/lib/currency';
import { useLogoutMutation, useMeQuery } from '~/queries/auth';
import type { Product } from '~/queries/products';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown';

import { Popover, PopoverAnchor, PopoverContent, PopoverPortal } from '~/components/ui/popover';

// Static marketing shortcuts, not category data — some of these routes
// don't exist yet (/flash-sale, /vouchers). They're placeholders for pages
// to be built later, deliberately not wired to any query.
const QUICK_LINKS = [
  { label: 'Flash Sale', href: '/flash-sale', icon: Flame },
  { label: 'Produk Terbaru', href: '/products?sort=newest', icon: TrendingUp },
  { label: 'Voucher Saya', href: '/vouchers', icon: Ticket },
];

export function Navbar() {
  const navigate = useNavigate();
  const meQuery = useMeQuery();
  const logout = useLogoutMutation();
  const [searchValue, setSearchValue] = createSignal('');
  const [debouncedSearch, setDebouncedSearch] = createSignal('');
  const [searchOpen, setSearchOpen] = createSignal(false);
  const [sellerDialogOpen, setSellerDialogOpen] = createSignal(false);

  // Debounce the suggestions fetch, not the input itself — searchValue stays
  // in sync with every keystroke so the field never feels laggy.
  createEffect(() => {
    const value = searchValue();
    const timer = setTimeout(() => setDebouncedSearch(value), 250);
    onCleanup(() => clearTimeout(timer));
  });

  const suggestionsQuery = useQuery(() => ({
    queryKey: ['products', 'search-suggestions', debouncedSearch().trim().toLowerCase()],
    queryFn: () =>
      apiFetch<Product[]>(`/api/v1/products?q=${encodeURIComponent(debouncedSearch().trim())}&limit=6`),
    enabled: debouncedSearch().trim().length > 0,
    placeholderData: keepPreviousData,
  }));

  function goToSearchResults() {
    const value = searchValue().trim();
    setSearchOpen(false);
    navigate(value ? `/products?q=${encodeURIComponent(value)}` : '/products');
  }

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        toast.success('Berhasil keluar.');
        navigate('/');
      },
    });
  }

  return (
    <header class='sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
      <div class='flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6'>
        <A
          href='/'
          class='flex shrink-0 items-center gap-1.5 text-xl font-extrabold tracking-tight text-primary'
        >
          <Store class='size-6' aria-hidden='true' />
          kommers
        </A>

        <Popover open={searchOpen()} onOpenChange={setSearchOpen} placement='bottom-start'>
          <PopoverAnchor as='div' class='w-full max-w-3xl flex-1'>
            <form
              class='w-full'
              onSubmit={(e) => {
                e.preventDefault();
                goToSearchResults();
              }}
            >
              <TextField class='w-full'>
                <div class='relative'>
                  <Search
                    class='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
                    aria-hidden='true'
                  />
                  <TextFieldInput
                    type='search'
                    placeholder='Cari produk, brand, dan lainnya'
                    class='h-10 rounded-full pl-9'
                    value={searchValue()}
                    onInput={(e) => {
                      const value = e.currentTarget.value;
                      setSearchValue(value);
                      setSearchOpen(value.trim().length > 0);
                    }}
                    onFocus={() => {
                      if (searchValue().trim().length > 0) setSearchOpen(true);
                    }}
                  />
                </div>
              </TextField>
            </form>
          </PopoverAnchor>

          <PopoverPortal>
            <PopoverContent
              class='w-[min(36rem,90vw)] p-2'
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <Show
                when={!suggestionsQuery.isLoading}
                fallback={
                  <div class='flex flex-col gap-2 p-2'>
                    <For each={Array(3).fill(0)}>{() => <Skeleton class='h-12 w-full rounded-lg' />}</For>
                  </div>
                }
              >
                <Show
                  when={(suggestionsQuery.data ?? []).length > 0}
                  fallback={
                    <div class='flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground'>
                      <PackageSearch class='size-6' aria-hidden='true' />
                      Produk tidak ditemukan
                    </div>
                  }
                >
                  <div class='flex flex-col'>
                    <For each={suggestionsQuery.data}>
                      {(product) => (
                        <A
                          href={`/products/${product.slug}`}
                          onClick={() => setSearchOpen(false)}
                          class='flex items-center gap-3 rounded-md p-2 text-sm hover:bg-accent'
                        >
                          <div class='size-10 shrink-0 overflow-hidden rounded-md bg-accent'>
                            <Show when={product.images[0]}>
                              {(image) => <img src={image().url} alt='' class='size-full object-cover' />}
                            </Show>
                          </div>
                          <div class='flex min-w-0 flex-1 flex-col'>
                            <span class='line-clamp-1 font-medium text-foreground'>{product.name}</span>
                            <span class='text-xs text-muted-foreground'>
                              {formatPriceCents(product.effective_price_cents)}
                            </span>
                          </div>
                        </A>
                      )}
                    </For>
                  </div>

                  <button
                    type='button'
                    onClick={goToSearchResults}
                    class='mt-1 w-full rounded-md p-2 text-center text-sm font-medium text-primary hover:bg-accent'
                  >
                    Lihat semua hasil untuk &ldquo;{searchValue().trim()}&rdquo;
                  </button>
                </Show>
              </Show>
            </PopoverContent>
          </PopoverPortal>
        </Popover>

        <div class='ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3'>
          <div class='hidden items-center gap-1 text-xs text-muted-foreground lg:flex'>
            <MapPin class='size-3.5' aria-hidden='true' />
            Dikirim ke{' '}
            <span class='font-medium text-foreground'>Jakarta Selatan</span>
          </div>

          <div class='hidden h-6 w-px bg-border lg:block' aria-hidden='true' />

          <Show when={meQuery.data}>
            <CartDrawer />
          </Show>

          <Show
            when={meQuery.data}
            fallback={
              <>
                <LoginDialog />
                <Button as={A} href='/register' size='sm'>
                  Daftar
                </Button>
              </>
            }
          >
            {(user) => (
              <DropdownMenu>
                <DropdownMenuTrigger
                  as={Button}
                  variant='ghost'
                  size='sm'
                  class='gap-1.5'
                >
                  <User class='size-4' aria-hidden='true' />
                  <span class='hidden max-w-24 truncate sm:inline'>{user().full_name}</span>
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent class='w-48'>
                    <DropdownMenuItem as={A} href='/profile' class='gap-2'>
                      <User class='size-4' aria-hidden='true' />
                      Profil Saya
                    </DropdownMenuItem>
                    <DropdownMenuItem as={A} href='/orders' class='gap-2'>
                      <Package class='size-4' aria-hidden='true' />
                      Pesanan Saya
                    </DropdownMenuItem>
                    <DropdownMenuItem as={A} href='/wishlist' class='gap-2'>
                      <Heart class='size-4' aria-hidden='true' />
                      Wishlist Saya
                    </DropdownMenuItem>
                    <Show when={user().role !== 'admin'}>
                      <DropdownMenuItem
                        class='gap-2'
                        onSelect={() => {
                          if (user().role === 'customer') {
                            setSellerDialogOpen(true);
                          } else {
                            navigate('/seller');
                          }
                        }}
                      >
                        <Store class='size-4' aria-hidden='true' />
                        {user().role === 'customer' ? 'Jadi Penjual' : 'Dashboard Seller'}
                      </DropdownMenuItem>
                    </Show>
                    <DropdownMenuItem onSelect={handleLogout} class='gap-2 text-destructive'>
                      <LogOut class='size-4' aria-hidden='true' />
                      Keluar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>
            )}
          </Show>
        </div>
      </div>

      <SellerApplyDialog open={sellerDialogOpen()} onOpenChange={setSellerDialogOpen} />

      <nav class='scrollbar-none flex gap-2 overflow-x-auto border-t border-border/60 px-4 py-2 sm:px-6'>
        <For each={QUICK_LINKS}>
          {(link) => (
            <A
              href={link.href}
              class='inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground'
            >
              <link.icon class='size-3.5' aria-hidden='true' />
              {link.label}
            </A>
          )}
        </For>
      </nav>
    </header>
  );
}
