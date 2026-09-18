import { A, useNavigate } from '@solidjs/router';
import { toast } from 'somoto';
import { SellerProductForm } from '~/components/seller-product-form';
import { SellerProductImages } from '~/components/seller-product-images';
import { ApiError } from '~/lib/api-client';
import { useCategoriesQuery } from '~/queries/categories';
import { useCreateProductMutation } from '~/queries/products';

export default function NewSellerProduct() {
  const navigate = useNavigate();
  const categoriesQuery = useCategoriesQuery();
  const createProduct = useCreateProductMutation();

  return (
    <div class='flex flex-col gap-6'>
      <div>
        <A href='/seller/products' class='text-sm text-muted-foreground hover:underline'>
          &larr; Kembali ke Produk Saya
        </A>
        <h1 class='mt-1 text-xl font-bold text-foreground'>Tambah Produk</h1>
      </div>

      <div class='grid max-w-4xl grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]'>
        <div class='flex flex-col gap-2'>
          <h2 class='text-sm font-semibold text-foreground'>Detail Produk</h2>
          <SellerProductForm
            categories={categoriesQuery.data ?? []}
            submitting={createProduct.isPending}
            submitLabel='Simpan Produk'
            onSubmit={(input) => {
              createProduct.mutate(input, {
                onSuccess: (product) => {
                  toast.success('Produk berhasil dibuat. Sekarang tambahkan gambar.');
                  navigate(`/seller/products/${product.id}`);
                },
                onError: (err) => {
                  toast.error(err instanceof ApiError ? err.message : 'Gagal membuat produk.');
                },
              });
            }}
          />
        </div>

        <div class='flex flex-col gap-2'>
          <h2 class='text-sm font-semibold text-foreground'>Gambar Produk</h2>
          <SellerProductImages />
        </div>
      </div>
    </div>
  );
}
