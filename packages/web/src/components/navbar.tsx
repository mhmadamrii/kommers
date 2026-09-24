import { A, useNavigate } from '@solidjs/router';
import { Flame, Heart, LogOut, MapPin, Package, Search, Store, Ticket, TrendingUp, User } from 'lucide-solid';
import { For, Show, createSignal } from 'solid-js';
import { toast } from 'somoto';
import { Button } from '~/components/ui/button';
import { CartDrawer } from '~/components/cart-drawer';
import { LoginDialog } from '~/components/login-dialog';
import { SellerApplyDialog } from '~/components/seller-apply-dialog';
import { TextField, TextFieldInput } from '~/components/ui/text-field';
import { useLogoutMutation, useMeQuery } from '~/queries/auth';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown';

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
