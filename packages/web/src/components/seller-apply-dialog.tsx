import { useNavigate } from '@solidjs/router';
import { createSignal } from 'solid-js';
import { toast } from 'somoto';
import { Button } from '~/components/ui/button';
import { Checkbox, CheckboxControl, CheckboxLabel } from '~/components/ui/checkbox';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from '~/components/ui/dialog';
import { ApiError } from '~/lib/api-client';
import { useApplySellerMutation } from '~/queries/auth';

export function SellerApplyDialog(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const [accepted, setAccepted] = createSignal(false);
  const applySeller = useApplySellerMutation();

  function handleOpenChange(next: boolean) {
    props.onOpenChange(next);
    if (!next) setAccepted(false);
  }

  function handleSubmit() {
    applySeller.mutate(undefined, {
      onSuccess: () => {
        toast.success('Selamat! Akun kamu sekarang jadi seller.');
        handleOpenChange(false);
        navigate('/seller');
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : 'Gagal mendaftar sebagai seller.');
      },
    });
  }

  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Syarat dan Ketentuan Seller</DialogTitle>
            <DialogDescription>
              Baca dan setujui syarat berikut sebelum mulai berjualan di kommers.
            </DialogDescription>
          </DialogHeader>

          <div class='max-h-64 overflow-y-auto rounded-md border border-border p-3 text-sm text-muted-foreground'>
            <p class='mb-2'>Dengan mendaftar sebagai seller di kommers, kamu setuju untuk:</p>
            <ul class='list-disc space-y-1 pl-4'>
              <li>Memberikan informasi produk yang akurat dan tidak menyesatkan.</li>
              <li>Mengirimkan pesanan sesuai estimasi waktu yang tertera.</li>
              <li>Mematuhi kebijakan harga, diskon, dan kampanye kommers.</li>
              <li>Bertanggung jawab atas kualitas dan legalitas produk yang dijual.</li>
              <li>Menerima potongan biaya layanan sesuai kebijakan platform.</li>
            </ul>
          </div>

          <Checkbox checked={accepted()} onChange={setAccepted} class='items-start'>
            <CheckboxControl class='mt-0.5' />
            <CheckboxLabel>
              Saya sudah membaca dan menyetujui syarat dan ketentuan di atas.
            </CheckboxLabel>
          </Checkbox>

          <DialogFooter>
            <Button type='button' disabled={!accepted() || applySeller.isPending} onClick={handleSubmit}>
              {applySeller.isPending ? 'Memproses...' : 'Setuju & Jadi Seller'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
