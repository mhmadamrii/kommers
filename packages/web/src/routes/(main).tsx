import type { RouteSectionProps } from '@solidjs/router';
import { AppShell } from '~/components/app-shell';

export default function MainLayout(props: RouteSectionProps) {
  return <AppShell>{props.children}</AppShell>;
}
