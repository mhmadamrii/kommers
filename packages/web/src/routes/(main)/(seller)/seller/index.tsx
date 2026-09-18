import { A } from '@solidjs/router';
import { PackagePlus } from 'lucide-solid';
import { Button } from '~/components/ui/button';
import { useRequireRole } from '~/queries/auth';

export default function SellerDashboard() {
  useRequireRole('seller', 'admin');

  return (
    <div class='mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6'>
      <h1 class='text-xl font-bold text-foreground'>Seller performance dashboard</h1>
      <Button as={A} href='/seller/products' class='w-fit gap-1.5'>
        <PackagePlus class='size-4' aria-hidden='true' />
        Kelola Produk
      </Button>
    </div>
  );
}
