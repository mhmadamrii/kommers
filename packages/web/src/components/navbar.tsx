import { A, useNavigate } from '@solidjs/router';
import { ChevronDown, LogOut, MapPin, Search, Store, User } from 'lucide-solid';
import { For, Show, createSignal } from 'solid-js';
import { toast } from 'somoto';
import { Button } from '~/components/ui/button';
import { CartDrawer } from '~/components/cart-drawer';
import { LoginDialog } from '~/components/login-dialog';
import { SellerApplyDialog } from '~/components/seller-apply-dialog';
import { Skeleton } from '~/components/ui/skeleton';
import { TextField, TextFieldInput } from '~/components/ui/text-field';
import { categoryIcon } from '~/lib/category-icons';
import { useCategoriesQuery } from '~/queries/categories';
import { useLogoutMutation, useMeQuery } from '~/queries/auth';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown';

export function Navbar() {
  const navigate = useNavigate();
  const meQuery = useMeQuery();
  const categoriesQuery = useCategoriesQuery();
  const logout = useLogoutMutation();
  const categories = () => categoriesQuery.data ?? [];
  const [searchValue, setSearchValue] = createSignal('');
  const [sellerDialogOpen, setSellerDialogOpen] = createSignal(false);

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

        <DropdownMenu>
          <DropdownMenuTrigger
            as={Button}
            variant='ghost'
            class='hidden shrink-0 gap-1 text-sm font-medium sm:inline-flex'
          >
            Kategori
            <ChevronDown class='size-4' aria-hidden='true' />
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent class='w-56'>
              <For each={categories()}>
                {(category) => (
                  <DropdownMenuItem
                    as={A}
                    href={`/products?category_id=${category.id}`}
                    class='gap-2'
                  >
                    {(() => {
                      const Icon = categoryIcon(category.slug);
                      return <Icon class='size-4 text-muted-foreground' aria-hidden='true' />;
                    })()}
                    {category.name}
                  </DropdownMenuItem>
                )}
              </For>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>

        <form
          class='w-full max-w-3xl flex-1'
          onSubmit={(e) => {
            e.preventDefault();
            const value = searchValue().trim();
            navigate(value ? `/products?q=${encodeURIComponent(value)}` : '/products');
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
                onInput={(e) => setSearchValue(e.currentTarget.value)}
              />
            </div>
          </TextField>
        </form>

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
        <Show
          when={!categoriesQuery.isLoading}
          fallback={
            <For each={Array(6).fill(0)}>
              {() => <Skeleton class='h-7 w-24 shrink-0 rounded-full' />}
            </For>
          }
        >
          <For each={categories()}>
            {(category) => {
              const Icon = categoryIcon(category.slug);
              return (
                <A
                  href={`/products?category_id=${category.id}`}
                  class='inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground'
                >
                  <Icon class='size-3.5' aria-hidden='true' />
                  {category.name}
                </A>
              );
            }}
          </For>
        </Show>
      </nav>
    </header>
  );
}
