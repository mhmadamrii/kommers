import { useLocation, type RouteSectionProps } from '@solidjs/router';
import { Show } from 'solid-js';
import { AppShell } from '~/components/app-shell';
import { RequireLogin } from '~/components/require-login';

// Pages that only make sense with a session. Gating here (rather than per
// page) keeps their queries from ever firing logged-out.
const LOGIN_ONLY = ['/checkout', '/orders', '/wishlist', '/profile', '/vouchers', '/dashboard', '/settings'];

export default function MainLayout(props: RouteSectionProps) {
  const location = useLocation();
  const needsLogin = () =>
    LOGIN_ONLY.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`));

  return (
    <AppShell>
      <Show when={needsLogin()} fallback={props.children}>
        <RequireLogin>{props.children}</RequireLogin>
      </Show>
    </AppShell>
  );
}
