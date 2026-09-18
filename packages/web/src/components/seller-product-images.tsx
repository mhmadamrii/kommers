import { Star, Trash2, Upload } from 'lucide-solid';
import { createSignal, For, Show } from 'solid-js';
import { toast } from 'somoto';
import { Button } from '~/components/ui/button';
import { ApiError } from '~/lib/api-client';

import {
  useDeleteProductImageMutation,
  useUploadProductImagesMutation,
  type Product,
} from '~/queries/products';

export function SellerProductImages(props: { product: Product }) {
  const [selectedFiles, setSelectedFiles] = createSignal<File[]>([]);
  let fileInput: HTMLInputElement | undefined;

  const upload = useUploadProductImagesMutation();
  const deleteImage = useDeleteProductImageMutation();

  function handleUpload() {
    const files = selectedFiles();
    if (files.length === 0) return;

    upload.mutate(
      { productId: props.product.id, files },
      {
        onSuccess: () => {
          toast.success('Gambar berhasil diunggah.');
          setSelectedFiles([]);
          if (fileInput) fileInput.value = '';
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : 'Gagal mengunggah gambar.');
        },
      },
    );
  }

  function handleDelete(imageId: number) {
    deleteImage.mutate(
      { productId: props.product.id, imageId },
      {
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus gambar.');
        },
      },
    );
  }

  return (
    <div class='flex flex-col gap-4'>
      <div class='grid grid-cols-3 gap-3 sm:grid-cols-4'>
        <For each={props.product.images}>
          {(image) => (
            <div class='group relative aspect-square overflow-hidden rounded-lg border border-border'>
              <img src={image.url} alt='' class='size-full object-cover' />
              <Show when={image.is_primary}>
                <span class='absolute left-1 top-1 flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground'>
                  <Star class='size-2.5' aria-hidden='true' />
                  Utama
                </span>
              </Show>
              <button
                type='button'
                aria-label='Hapus gambar'
                onClick={() => handleDelete(image.id)}
                disabled={deleteImage.isPending}
                class='absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50'
              >
                <Trash2 class='size-3.5' aria-hidden='true' />
              </button>
            </div>
          )}
        </For>
      </div>

      <div class='flex items-center gap-2'>
        <input
          ref={fileInput}
          type='file'
          accept='image/jpeg,image/png,image/webp,image/gif'
          multiple
          onChange={(e) => setSelectedFiles(Array.from(e.currentTarget.files ?? []))}
          class='block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-foreground'
        />
        <Button
          type='button'
          size='sm'
          disabled={selectedFiles().length === 0 || upload.isPending}
          onClick={handleUpload}
          class='gap-1.5'
        >
          <Upload class='size-3.5' aria-hidden='true' />
          {upload.isPending ? 'Mengunggah...' : 'Unggah'}
        </Button>
      </div>
    </div>
  );
}
