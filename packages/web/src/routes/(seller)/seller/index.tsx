import { A } from '@solidjs/router';
import { BarChart3, PackagePlus } from 'lucide-solid';
import { createMemo } from 'solid-js';
import { Button } from '~/components/ui/button';
import { EmptyState } from '~/components/empty-state';
import { useMyProductsQuery } from '~/queries/products';

export default function SellerDashboard() {
  const productsQuery = useMyProductsQuery();
  const products = () => productsQuery.data ?? [];

  const stats = createMemo(() => {
    const list = products();
    return {
      total: list.length,
      active: list.filter((p) => p.is_active).length,
      outOfStock: list.filter((p) => p.stock === 0).length,
    };
  });

  return (
    <div class='flex flex-col gap-8'>
      <div class='flex items-center justify-between'>
        <h1 class='text-xl font-bold text-foreground'>Dashboard</h1>
        <Button as={A} href='/seller/products/new' size='sm' class='gap-1.5'>
          <PackagePlus class='size-4' aria-hidden='true' />
          Tambah Produk
        </Button>
      </div>

      <dl class='flex flex-wrap items-baseline gap-x-8 gap-y-4 rounded-xl border border-border px-5 py-4'>
        <div class='flex flex-col gap-0.5'>
          <dt class='text-xs text-muted-foreground'>Total Produk</dt>
          <dd class='text-2xl font-bold text-foreground'>{stats().total}</dd>
        </div>
        <div class='h-8 w-px bg-border' aria-hidden='true' />
        <div class='flex flex-col gap-0.5'>
          <dt class='text-xs text-muted-foreground'>Produk Aktif</dt>
          <dd class='text-2xl font-bold text-foreground'>{stats().active}</dd>
        </div>
        <div class='h-8 w-px bg-border' aria-hidden='true' />
        <div class='flex flex-col gap-0.5'>
          <dt class='text-xs text-muted-foreground'>Stok Habis</dt>
          <dd class='text-2xl font-bold text-foreground'>{stats().outOfStock}</dd>
        </div>
      </dl>

      <div class='flex flex-col gap-2'>
        <h2 class='text-sm font-semibold text-foreground'>Performa Produk</h2>
        <EmptyState
          icon={BarChart3}
          title='Belum ada data performa'
          description='Grafik penjualan dan performa produk akan muncul di sini setelah transaksi pertama masuk.'
        />
      </div>
    </div>
  );
}
