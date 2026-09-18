import type { RouteSectionProps } from '@solidjs/router';
import { SellerShell } from '~/components/seller-shell';
import { useRequireRole } from '~/queries/auth';

export default function SellerLayout(props: RouteSectionProps) {
  useRequireRole('seller', 'admin');
  return <SellerShell>{props.children}</SellerShell>;
}
