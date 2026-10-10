import { A } from '@solidjs/router';
import { Check, Copy, Ticket } from 'lucide-solid';
import { createSignal, For, Show } from 'solid-js';
import { toast } from 'somoto';
import { EmptyState } from '~/components/empty-state';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { formatPriceCents } from '~/lib/currency';
import { formatDateTime } from '~/lib/datetime';
import { useAvailableVouchersQuery, voucherLabel, type Voucher } from '~/queries/vouchers';

function VoucherCard(props: { voucher: Voucher }) {
  const [copied, setCopied] = createSignal(false);
  const v = () => props.voucher;

  async function copy() {
    try {
      await navigator.clipboard.writeText(v().code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Gagal menyalin kode.');
    }
  }

  return (
    <Card
      class='flex flex-col gap-3 border-dashed p-4'
      classList={{ 'opacity-60': v().used_by_me }}
    >
      <div class='flex items-start justify-between gap-2'>
        <div class='flex flex-col gap-0.5'>
          <span class='text-2xl font-extrabold text-primary'>{voucherLabel(v())}</span>
          <span class='text-sm font-medium text-foreground'>{v().name}</span>
        </div>
        <Badge variant={v().scope === 'platform' ? 'default' : 'secondary'}>
          {v().scope === 'platform' ? 'Semua produk' : `Toko ${v().seller_name}`}
        </Badge>
      </div>

      <ul class='flex flex-col gap-0.5 text-xs text-muted-foreground'>
        <Show when={v().min_spend_cents > 0}>
          <li>Min. belanja {formatPriceCents(v().min_spend_cents)}</li>
        </Show>
        <Show when={v().max_discount_cents}>
          {(cap) => <li>Maks. potongan {formatPriceCents(cap())}</li>}
        </Show>
        <li>Berlaku sampai {formatDateTime(v().ends_at)}</li>
      </ul>

      <div class='flex items-center justify-between gap-2'>
        <code class='rounded-md bg-muted px-2 py-1 font-mono text-sm font-semibold'>{v().code}</code>
        <Show
          when={!v().used_by_me}
          fallback={<span class='text-xs font-medium text-muted-foreground'>Sudah dipakai</span>}
        >
          <Button type='button' variant='outline' size='sm' class='gap-1.5' onClick={copy}>
            <Show when={copied()} fallback={<Copy class='size-3.5' aria-hidden='true' />}>
              <Check class='size-3.5' aria-hidden='true' />
            </Show>
            {copied() ? 'Tersalin' : 'Salin'}
          </Button>
        </Show>
      </div>
    </Card>
  );
}

export default function Vouchers() {
  const vouchersQuery = useAvailableVouchersQuery();
  const vouchers = () => vouchersQuery.data ?? [];

  return (
    <div class='flex flex-col gap-6 px-4 py-6 sm:px-6'>
      <h1 class='text-xl font-bold text-foreground'>Voucher Saya</h1>

      <Show
        when={!vouchersQuery.isLoading}
        fallback={
          <div class='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            <For each={Array(3).fill(0)}>{() => <Skeleton class='h-40 w-full rounded-xl' />}</For>
          </div>
        }
      >
        <Show
          when={vouchers().length > 0}
          fallback={
            <EmptyState
              icon={Ticket}
              title='Belum ada voucher'
              description='Voucher yang tersedia akan muncul di sini.'
              action={
                <Button as={A} href='/products'>
                  Belanja Sekarang
                </Button>
              }
            />
          }
        >
          <div class='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            <For each={vouchers()}>{(voucher) => <VoucherCard voucher={voucher} />}</For>
          </div>
          <p class='text-xs text-muted-foreground'>
            Masukkan kode saat checkout, atau pilih langsung dari daftar voucher di halaman pembayaran.
          </p>
        </Show>
      </Show>
    </div>
  );
}
