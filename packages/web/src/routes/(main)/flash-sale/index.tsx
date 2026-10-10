import { A } from '@solidjs/router';
import { Zap } from 'lucide-solid';
import { For, Show } from 'solid-js';
import { EmptyState } from '~/components/empty-state';
import { FlashSaleSection } from '~/components/flash-sale';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { useFlashSalesQuery } from '~/queries/flash-sales';

export default function FlashSales() {
  const flashSalesQuery = useFlashSalesQuery();
  const sales = () => flashSalesQuery.data ?? [];

  return (
    <div class='flex flex-col gap-10 px-4 py-6 sm:px-6'>
      <h1 class='text-xl font-bold text-foreground'>Flash Sale</h1>

      <Show
        when={!flashSalesQuery.isLoading}
        fallback={
          <div class='grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5'>
            <For each={Array(5).fill(0)}>{() => <Skeleton class='aspect-[3/4] w-full rounded-xl' />}</For>
          </div>
        }
      >
        <Show
          when={sales().length > 0}
          fallback={
            <EmptyState
              icon={Zap}
              title='Belum ada flash sale'
              description='Flash sale berikutnya akan muncul di sini. Cek lagi sebentar lagi!'
              action={
                <Button as={A} href='/products'>
                  Jelajahi Produk
                </Button>
              }
            />
          }
        >
          <For each={sales()}>{(sale) => <FlashSaleSection sale={sale} showAllLink={false} />}</For>
        </Show>
      </Show>
    </div>
  );
}
