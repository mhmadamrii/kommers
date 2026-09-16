import type { RouteSectionProps } from '@solidjs/router';
import { Navbar } from '~/components/navbar';

export default function PublicLayout(props: RouteSectionProps) {
  return (
    <div class='flex min-h-screen flex-col bg-background'>
      <Navbar />
      <main class='flex-1'>{props.children}</main>
      <footer class='border-t border-border py-8 text-center text-sm text-muted-foreground'>
        © {new Date().getFullYear()} kommers. Belanja apa aja, dari siapa aja.
      </footer>
    </div>
  );
}
