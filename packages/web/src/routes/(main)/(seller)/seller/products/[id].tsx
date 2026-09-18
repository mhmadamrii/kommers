import { A, useParams } from '@solidjs/router';
import { createMemo, Show } from 'solid-js';
import { toast } from 'somoto';
import { Skeleton } from '~/components/ui/skeleton';
import { EmptyState } from '~/components/empty-state';
import { SellerProductForm } from '~/components/seller-product-form';
import { SellerProductImages } from '~/components/seller-product-images';
import { ApiError } from '~/lib/api-client';
import { useRequireRole } from '~/queries/auth';
import { useCategoriesQuery } from '~/queries/categories';
import { useMyProductsQuery, useUpdateProductMutation } from '~/queries/products';
import { PackageX } from 'lucide-solid';

export default function EditSellerProduct() {
  useRequireRole('seller', 'admin');
  const params = useParams();
  const categoriesQuery = useCategoriesQuery();
  const productsQuery = useMyProductsQuery();
  const updateProduct = useUpdateProductMutation();

  const product = createMemo(() =>
    productsQuery.data?.find((p) => p.id === Number(params.id)),
  );

  return (
    <div class='mx-auto flex max-w-lg flex-col gap-6 px-4 py-6 sm:px-6'>
      <div>
        <A href='/seller/products' class='text-sm text-muted-foreground hover:underline'>
          &larr; Kembali ke Produk Saya
        </A>
        <h1 class='mt-1 text-xl font-bold text-foreground'>Kelola Produk</h1>
      </div>

      <Show
        when={!productsQuery.isLoading}
        fallback={<Skeleton class='h-96 w-full rounded-xl' />}
      >
        <Show
          when={product()}
          fallback={
            <EmptyState icon={PackageX} title='Produk tidak ditemukan' />
          }
        >
          {(product) => (
            <>
              <div class='flex flex-col gap-2'>
                <h2 class='text-sm font-semibold text-foreground'>Gambar Produk</h2>
                <SellerProductImages product={product()} />
              </div>

              <div class='flex flex-col gap-2'>
                <h2 class='text-sm font-semibold text-foreground'>Detail Produk</h2>
                <SellerProductForm
                  categories={categoriesQuery.data ?? []}
                  product={product()}
                  submitting={updateProduct.isPending}
                  submitLabel='Simpan Perubahan'
                  onSubmit={(input) => {
                    updateProduct.mutate(
                      { id: product().id, ...input },
                      {
                        onSuccess: () => toast.success('Produk berhasil diperbarui.'),
                        onError: (err) => {
                          toast.error(
                            err instanceof ApiError ? err.message : 'Gagal memperbarui produk.',
                          );
                        },
                      },
                    );
                  }}
                />
              </div>
            </>
          )}
        </Show>
      </Show>
    </div>
  );
}
