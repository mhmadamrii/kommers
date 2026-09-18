import { A, useNavigate } from '@solidjs/router';
import { toast } from 'somoto';
import { SellerProductForm } from '~/components/seller-product-form';
import { ApiError } from '~/lib/api-client';
import { useRequireRole } from '~/queries/auth';
import { useCategoriesQuery } from '~/queries/categories';
import { useCreateProductMutation } from '~/queries/products';

export default function NewSellerProduct() {
  useRequireRole('seller', 'admin');
  const navigate = useNavigate();
  const categoriesQuery = useCategoriesQuery();
  const createProduct = useCreateProductMutation();

  return (
    <div class='mx-auto flex max-w-lg flex-col gap-6 px-4 py-6 sm:px-6'>
      <div>
        <A href='/seller/products' class='text-sm text-muted-foreground hover:underline'>
          &larr; Kembali ke Produk Saya
        </A>
        <h1 class='mt-1 text-xl font-bold text-foreground'>Tambah Produk</h1>
      </div>

      <SellerProductForm
        categories={categoriesQuery.data ?? []}
        submitting={createProduct.isPending}
        submitLabel='Simpan & Lanjut Unggah Gambar'
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
  );
}
