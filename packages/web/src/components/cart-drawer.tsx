import { A } from '@solidjs/router';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-solid';
import { createMemo, createSignal, For, Show } from 'solid-js';
import { toast } from 'somoto';
import { Button, buttonVariants } from '~/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '~/components/ui/drawer';
import { EmptyState } from '~/components/empty-state';
import { ApiError } from '~/lib/api-client';
import { formatPriceCents } from '~/lib/currency';
import {
  useCartQuery,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
  type CartItem,
} from '~/queries/cart';

function CartRow(props: { item: CartItem }) {
  const updateItem = useUpdateCartItemMutation();
  const removeItem = useRemoveCartItemMutation();

  function changeQuantity(delta: number) {
    const next = props.item.quantity + delta;
    if (next < 1) return;
    updateItem.mutate(
      { id: props.item.id, quantity: next },
      {
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : 'Gagal mengubah jumlah.');
        },
      },
    );
  }

  function remove() {
    removeItem.mutate(props.item.id, {
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus item.');
      },
    });
  }

  return (
    <div class='flex gap-3 py-3'>
      <div class='size-16 shrink-0 rounded-lg bg-accent' />
      <div class='flex flex-1 flex-col gap-1'>
        <p class='line-clamp-2 text-sm font-medium text-foreground'>{props.item.product_name}</p>
        <p class='text-sm font-semibold text-foreground'>{formatPriceCents(props.item.price_cents)}</p>
        <div class='mt-auto flex items-center justify-between'>
          <div class='flex items-center gap-1'>
            <Button
              variant='outline'
              size='icon-sm'
              disabled={props.item.quantity <= 1 || updateItem.isPending}
              onClick={() => changeQuantity(-1)}
            >
              <Minus class='size-3.5' aria-hidden='true' />
            </Button>
            <span class='w-6 text-center text-sm'>{props.item.quantity}</span>
            <Button variant='outline' size='icon-sm' disabled={updateItem.isPending} onClick={() => changeQuantity(1)}>
              <Plus class='size-3.5' aria-hidden='true' />
            </Button>
          </div>
          <Button
            variant='ghost'
            size='icon-sm'
            class='text-destructive hover:text-destructive'
            disabled={removeItem.isPending}
            onClick={remove}
            aria-label='Hapus item'
          >
            <Trash2 class='size-3.5' aria-hidden='true' />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CartDrawer() {
  const [open, setOpen] = createSignal(false);
  const cartQuery = useCartQuery();
  const items = () => cartQuery.data?.items ?? [];
  const itemCount = createMemo(() => items().reduce((sum, item) => sum + item.quantity, 0));

  return (
    <Drawer side='right' open={open()} onOpenChange={setOpen}>
      <DrawerTrigger
        as='button'
        class='relative inline-flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
        aria-label={`Keranjang, ${itemCount()} item`}
      >
        <ShoppingBag class='size-5' aria-hidden='true' />
        <Show when={itemCount() > 0}>
          <span class='absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white'>
            {itemCount()}
          </span>
        </Show>
      </DrawerTrigger>
      <DrawerContent class='inset-y-0 right-0 left-auto mt-0 h-dvh w-full max-w-sm rounded-l-[10px] rounded-t-none after:hidden'>
        <DrawerHeader class='border-b border-border text-left'>
          <DrawerTitle>Keranjang</DrawerTitle>
        </DrawerHeader>

        <div class='flex-1 overflow-y-auto px-4'>
          <Show
            when={!cartQuery.isLoading}
            fallback={<p class='py-8 text-center text-sm text-muted-foreground'>Memuat...</p>}
          >
            <Show
              when={items().length > 0}
              fallback={
                <EmptyState
                  icon={ShoppingBag}
                  title='Keranjang kosong'
                  description='Belum ada produk di keranjang kamu.'
                />
              }
            >
              <div class='divide-y divide-border'>
                <For each={items()}>{(item) => <CartRow item={item} />}</For>
              </div>
            </Show>
          </Show>
        </div>

        <Show when={items().length > 0}>
          <div class='border-t border-border p-4'>
            <div class='mb-3 flex items-center justify-between text-sm font-semibold text-foreground'>
              <span>Total</span>
              <span>{formatPriceCents(cartQuery.data?.total_cents ?? 0)}</span>
            </div>
            <A
              href='/checkout'
              onClick={() => setOpen(false)}
              class={buttonVariants({ class: 'w-full' })}
            >
              Checkout
            </A>
          </div>
        </Show>
      </DrawerContent>
    </Drawer>
  );
}
