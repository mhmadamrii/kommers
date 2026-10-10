import { A } from '@solidjs/router';
import { SearchX } from 'lucide-solid';
import { AppShell } from '~/components/app-shell';
import { Button } from '~/components/ui/button';
import { EmptyState } from '~/components/empty-state';

export default function NotFound() {
  return (
    <AppShell>
      <div class='px-4 py-16 sm:px-6'>
        <EmptyState
          icon={SearchX}
          title='Halaman tidak ditemukan'
          description='Alamat yang kamu buka tidak ada atau sudah dipindahkan.'
          action={
            <Button as={A} href='/'>
              Ke beranda
            </Button>
          }
        />
      </div>
    </AppShell>
  );
}
