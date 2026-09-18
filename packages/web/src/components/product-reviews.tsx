import { Upload } from 'lucide-solid';
import { createSignal, For, Show } from 'solid-js';
import { toast } from 'somoto';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { TextField, TextFieldTextArea } from '~/components/ui/text-field';
import { StarRating, StarRatingInput } from '~/components/star-rating';
import { useMeQuery } from '~/queries/auth';
import { ApiError } from '~/lib/api-client';

import {
  useCreateReviewMutation,
  useProductReviewsQuery,
  useReviewEligibilityQuery,
  useUploadReviewImagesMutation,
} from '~/queries/reviews';

function ReviewImagesUpload(props: { slug: string; reviewId: number }) {
  const [files, setFiles] = createSignal<File[]>([]);
  const upload = useUploadReviewImagesMutation(() => props.slug);
  let fileInput: HTMLInputElement | undefined;

  function handleUpload() {
    if (files().length === 0) return;
    upload.mutate(
      { reviewId: props.reviewId, files: files() },
      {
        onSuccess: () => {
          toast.success('Foto ditambahkan ke ulasanmu.');
          setFiles([]);
          if (fileInput) fileInput.value = '';
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : 'Gagal mengunggah foto.');
        },
      },
    );
  }

  return (
    <div class='flex items-center gap-2 rounded-lg border border-dashed border-border p-3'>
      <input
        ref={fileInput}
        type='file'
        accept='image/jpeg,image/png,image/webp,image/gif'
        multiple
        onChange={(e) => setFiles(Array.from(e.currentTarget.files ?? []))}
        class='block flex-1 text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-foreground'
      />
      <Button
        type='button'
        size='sm'
        class='shrink-0 gap-1.5'
        disabled={files().length === 0 || upload.isPending}
        onClick={handleUpload}
      >
        <Upload class='size-3.5' aria-hidden='true' />
        {upload.isPending ? 'Mengunggah...' : 'Tambah Foto'}
      </Button>
    </div>
  );
}

export function ProductReviews(props: { slug: string; averageRating: number; reviewCount: number }) {
  const meQuery = useMeQuery();
  const isLoggedIn = () => Boolean(meQuery.data);

  const reviewsQuery = useProductReviewsQuery(() => props.slug);
  const eligibilityQuery = useReviewEligibilityQuery(() => props.slug, isLoggedIn);
  const createReview = useCreateReviewMutation(() => props.slug);

  const [rating, setRating] = createSignal(0);
  const [comment, setComment] = createSignal('');
  // Deferred image upload: once a review is created, the upload control for
  // it appears right below the (now-hidden) form, matching the seller
  // product flow's "save first, add photos after" pattern.
  const [createdReviewId, setCreatedReviewId] = createSignal<number | null>(null);

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (rating() === 0) return;

    createReview.mutate(
      { rating: rating(), comment: comment() },
      {
        onSuccess: (review) => {
          toast.success('Ulasan terkirim, terima kasih!');
          setCreatedReviewId(review.id);
          setRating(0);
          setComment('');
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : 'Gagal mengirim ulasan.');
        },
      },
    );
  }

  return (
    <div class='flex flex-col gap-4 border-t border-border pt-6'>
      <div class='flex items-center gap-2'>
        <h2 class='text-lg font-bold text-foreground'>Ulasan Pembeli</h2>
        <Show when={props.reviewCount > 0}>
          <StarRating rating={props.averageRating} size='md' />
          <span class='text-sm text-muted-foreground'>
            {props.averageRating.toFixed(1)} ({props.reviewCount} ulasan)
          </span>
        </Show>
      </div>

      <Show when={isLoggedIn() && eligibilityQuery.data?.can_review && !createdReviewId()}>
        <Card class='p-4'>
          <form class='flex flex-col gap-3' onSubmit={handleSubmit}>
            <div>
              <p class='mb-1.5 text-sm font-medium text-foreground'>Beri rating produk ini</p>
              <StarRatingInput value={rating()} onChange={setRating} />
            </div>
            <TextField>
              <TextFieldTextArea
                placeholder='Bagaimana kualitas produknya? (opsional)'
                value={comment()}
                onInput={(e) => setComment(e.currentTarget.value)}
              />
            </TextField>
            <Button type='submit' class='w-fit' disabled={rating() === 0 || createReview.isPending}>
              {createReview.isPending ? 'Mengirim...' : 'Kirim Ulasan'}
            </Button>
          </form>
        </Card>
      </Show>

      <Show when={createdReviewId()}>
        {(id) => <ReviewImagesUpload slug={props.slug} reviewId={id()} />}
      </Show>

      <Show
        when={isLoggedIn() && eligibilityQuery.data?.already_reviewed && !createdReviewId()}
      >
        <p class='text-sm text-muted-foreground'>Kamu sudah memberi ulasan untuk produk ini.</p>
      </Show>

      <Show
        when={!reviewsQuery.isLoading}
        fallback={<Skeleton class='h-20 w-full rounded-lg' />}
      >
        <Show
          when={reviewsQuery.data && reviewsQuery.data.length > 0}
          fallback={<p class='text-sm text-muted-foreground'>Belum ada ulasan untuk produk ini.</p>}
        >
          <div class='flex flex-col divide-y divide-border'>
            <For each={reviewsQuery.data}>
              {(review) => (
                <div class='flex flex-col gap-1.5 py-4'>
                  <div class='flex items-center gap-2'>
                    <span class='text-sm font-medium text-foreground'>{review.reviewer_name}</span>
                    <StarRating rating={review.rating} />
                  </div>
                  <Show when={review.comment}>
                    <p class='text-sm text-foreground'>{review.comment}</p>
                  </Show>
                  <Show when={review.images.length > 0}>
                    <div class='flex gap-2'>
                      <For each={review.images}>
                        {(image) => (
                          <img src={image.url} alt='' class='size-16 rounded-lg object-cover' />
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
}
