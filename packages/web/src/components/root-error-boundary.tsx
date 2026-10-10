import { A, useLocation } from '@solidjs/router';
import { TriangleAlert } from 'lucide-solid';
import { createEffect, ErrorBoundary, on, type JSX } from 'solid-js';
import { Button } from '~/components/ui/button';
import { ApiError } from '~/lib/api-client';

// solid-query rethrows a failed query's error when `.data` is read, and with
// no boundary above it Solid unmounts the whole tree — a blank white page.
// This catches it, says what happened, and clears itself on navigation so
// one bad page never strands the visitor.
function ErrorFallback(props: { error: unknown; reset: () => void }) {
  const location = useLocation();
  createEffect(
    on(
      () => location.pathname,
      () => props.reset(),
      { defer: true },
    ),
  );

  const sessionExpired = () => props.error instanceof ApiError && props.error.status === 401;
  const message = () =>
    sessionExpired()
      ? 'Sesi kamu berakhir atau kamu belum masuk. Masuk lagi untuk melanjutkan.'
      : props.error instanceof ApiError
        ? props.error.message
        : 'Terjadi kesalahan yang tidak terduga.';

  return (
    <div class='mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-24 text-center'>
      <span class='flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive'>
        <TriangleAlert class='size-6' aria-hidden='true' />
      </span>
      <h1 class='text-lg font-bold text-foreground'>Ups, ada yang salah</h1>
      <p class='text-sm text-muted-foreground'>{message()}</p>
      <div class='flex gap-2'>
        <Button variant='outline' onClick={() => props.reset()}>
          Coba lagi
        </Button>
        <Button as={A} href='/'>
          Ke beranda
        </Button>
      </div>
    </div>
  );
}

export function RootErrorBoundary(props: { children: JSX.Element }) {
  return (
    <ErrorBoundary fallback={(error, reset) => <ErrorFallback error={error} reset={reset} />}>
      {props.children}
    </ErrorBoundary>
  );
}
