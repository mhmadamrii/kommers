import { A } from '@solidjs/router';
import { PackagePlus, PackageSearch } from 'lucide-solid';
import { For, Show } from 'solid-js';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { EmptyState } from '~/components/empty-state';
import { formatPriceCents } from '~/lib/currency';
import { useMyProductsQuery } from '~/queries/products';

export default function SellerProducts() {
  const productsQuery = useMyProductsQuery();
  const products = () => productsQuery.data ?? [];

  return (
    <div class='flex h-full min-h-0 flex-col gap-6'>
      <div class='flex items-center justify-between'>
        <h1 class='text-xl font-bold text-foreground'>Produk Saya</h1>
        <Button as={A} href='/seller/products/new' size='sm' class='gap-1.5'>
          <PackagePlus class='size-4' aria-hidden='true' />
          Tambah Produk
        </Button>
      </div>

      <Show
        when={!productsQuery.isLoading}
        fallback={
          <div class='flex flex-col gap-2'>
            <For each={Array(5).fill(0)}>{() => <Skeleton class='h-14 w-full rounded-lg' />}</For>
          </div>
        }
      >
        <Show
          when={products().length > 0}
          fallback={
            <EmptyState
              icon={PackageSearch}
              title='Belum ada produk'
              description='Tambahkan produk pertamamu untuk mulai berjualan.'
              action={
                <Button as={A} href='/seller/products/new'>
                  Tambah Produk
                </Button>
              }
            />
          }
        >
          <Card class='min-h-0 flex-1 overflow-hidden p-0'>
            <div class='h-full overflow-y-auto'>
              <Table>
                <TableHeader class='sticky top-0 z-10 bg-card'>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <For each={products()}>
                    {(product) => (
                      <TableRow>
                        <TableCell class='flex items-center gap-2.5'>
                          <div class='size-10 shrink-0 overflow-hidden rounded-md bg-accent'>
                            <Show when={product.images[0]}>
                              {(image) => (
                                <img src={image().url} alt='' class='size-full object-cover' />
                              )}
                            </Show>
                          </div>
                          <span class='max-w-56 truncate'>{product.name}</span>
                        </TableCell>
                        <TableCell>{formatPriceCents(product.price_cents)}</TableCell>
                        <TableCell>{product.stock}</TableCell>
                        <TableCell>
                          <Badge variant={product.is_active ? 'default' : 'secondary'}>
                            {product.is_active ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button as={A} href={`/seller/products/${product.id}`} variant='outline' size='sm'>
                            Kelola
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                  </For>
                </TableBody>
              </Table>
            </div>
          </Card>
        </Show>
      </Show>
    </div>
  );
}
