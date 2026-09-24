import { A, useLocation } from '@solidjs/router';
import { LayoutDashboard, LogOut, Package, Truck, TrendingUp } from 'lucide-solid';
import { For, type JSX } from 'solid-js';
import { toast } from 'somoto';
import { Button } from '~/components/ui/button';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown';

import { useLogoutMutation, useMeQuery } from '~/queries/auth';

const NAV_ITEMS = [
  { href: '/seller', label: 'Dashboard', icon: LayoutDashboard, exact: true, comingSoon: false },
  { href: '/seller/products', label: 'Produk', icon: Package, exact: false, comingSoon: false },
  { href: '/seller/orders', label: 'Pesanan', icon: Truck, exact: false, comingSoon: false },
  { href: '/seller/analytics', label: 'Analitik', icon: TrendingUp, exact: false, comingSoon: true },
] as const;

function isActive(pathname: string, item: (typeof NAV_ITEMS)[number]) {
  if (item.comingSoon) return false;
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function SellerShell(props: { children: JSX.Element }) {
  const location = useLocation();
  const meQuery = useMeQuery();
  const logout = useLogoutMutation();

  function handleLogout() {
    logout.mutate(undefined, { onSuccess: () => toast.success('Berhasil keluar.') });
  }

  return (
    <div class='flex h-screen flex-col overflow-hidden bg-background'>
      <header class='shrink-0 border-b border-border bg-background'>
        <div class='flex h-14 items-center gap-3 px-4 sm:px-6'>
          <A href='/' class='flex shrink-0 items-center gap-1.5 text-lg font-extrabold tracking-tight text-primary'>
            <Package class='size-5' aria-hidden='true' />
            kommers
            <span class='ml-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground'>
              Seller
            </span>
          </A>

          <div class='ml-auto flex items-center gap-3'>
            <A href='/' class='text-sm text-muted-foreground hover:text-foreground hover:underline'>
              Kembali ke Toko
            </A>
            <div class='h-5 w-px bg-border' aria-hidden='true' />
            <DropdownMenu>
              <DropdownMenuTrigger as={Button} variant='ghost' size='sm' class='gap-1.5'>
                <span class='max-w-32 truncate'>{meQuery.data?.full_name ?? 'Akun'}</span>
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent class='w-44'>
                  <DropdownMenuItem onSelect={handleLogout} class='gap-2 text-destructive'>
                    <LogOut class='size-4' aria-hidden='true' />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenu>
          </div>
        </div>

        <nav class='scrollbar-none flex gap-1 overflow-x-auto px-4 sm:hidden'>
          <For each={NAV_ITEMS}>
            {(item) => {
              const active = () => isActive(location.pathname, item);
              const disabled = item.comingSoon;
              return (
                <A
                  href={disabled ? location.pathname : item.href}
                  aria-disabled={disabled}
                  class='relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted-foreground'
                  classList={{
                    'text-foreground': active(),
                    'pointer-events-none opacity-40': disabled,
                  }}
                >
                  <item.icon class='size-4' aria-hidden='true' />
                  {item.label}
                  <span
                    class='absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary transition-opacity'
                    classList={{ 'opacity-0': !active() }}
                  />
                </A>
              );
            }}
          </For>
        </nav>
      </header>

      <div class='flex min-h-0 flex-1 overflow-hidden'>
        <aside class='hidden w-56 shrink-0 overflow-y-auto border-r border-border px-3 py-6 sm:block'>
          <div class='flex flex-col gap-0.5'>
            <For each={NAV_ITEMS}>
              {(item) => {
                const active = () => isActive(location.pathname, item);
                const disabled = item.comingSoon;
                return (
                  <A
                    href={disabled ? location.pathname : item.href}
                    aria-disabled={disabled}
                    class='flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
                    classList={{
                      'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary': active(),
                      'pointer-events-none opacity-40 hover:bg-transparent': disabled,
                    }}
                  >
                    <item.icon class='size-4' aria-hidden='true' />
                    {item.label}
                    {disabled && (
                      <span class='ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground'>
                        Segera
                      </span>
                    )}
                  </A>
                );
              }}
            </For>
          </div>
        </aside>

        <main class='min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8'>{props.children}</main>
      </div>
    </div>
  );
}
