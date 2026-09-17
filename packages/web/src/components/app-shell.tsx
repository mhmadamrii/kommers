import type { JSX } from 'solid-js';
import { Navbar } from '~/components/navbar';

export function AppShell(props: { children: JSX.Element }) {
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
