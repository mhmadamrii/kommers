import { Lock } from 'lucide-solid';
import { Show, type JSX } from 'solid-js';
import { EmptyState } from '~/components/empty-state';
import { LoginDialog } from '~/components/login-dialog';
import { Skeleton } from '~/components/ui/skeleton';
import { useMeQuery } from '~/queries/auth';

// Holds a login-only page's content back until we know there's a session, so
// its queries never fire as a logged-out visitor (401 -> retries -> error).
// Children are only evaluated once the visitor is confirmed logged in.
export function RequireLogin(props: { children: JSX.Element }) {
  const meQuery = useMeQuery();

  return (
    <Show
      when={!meQuery.isPending}
      fallback={
        <div class='px-4 py-6 sm:px-6'>
          <Skeleton class='h-64 w-full rounded-xl' />
        </div>
      }
    >
      <Show
        when={meQuery.data}
        fallback={
          <div class='px-4 py-6 sm:px-6'>
            <EmptyState
              icon={Lock}
              title='Masuk untuk melanjutkan'
              description='Halaman ini hanya bisa dibuka setelah kamu masuk ke akunmu.'
              action={<LoginDialog />}
            />
          </div>
        }
      >
        {props.children}
      </Show>
    </Show>
  );
}
