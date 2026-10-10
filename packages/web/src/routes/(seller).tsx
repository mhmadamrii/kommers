import type { RouteSectionProps } from '@solidjs/router';
import { Show } from 'solid-js';
import { SellerShell } from '~/components/seller-shell';
import { Skeleton } from '~/components/ui/skeleton';
import { useMeQuery, useRequireRole } from '~/queries/auth';

export default function SellerLayout(props: RouteSectionProps) {
  useRequireRole('seller', 'admin');
  const meQuery = useMeQuery();

  // useRequireRole redirects non-sellers home, but the page below would
  // still mount (and fire seller-only queries -> 401) before that lands.
  const allowed = () => meQuery.data?.role === 'seller' || meQuery.data?.role === 'admin';

  return (
    <SellerShell>
      <Show when={allowed()} fallback={<Skeleton class='h-64 w-full rounded-xl' />}>
        {props.children}
      </Show>
    </SellerShell>
  );
}
