import { Plus, Ticket, Trash2 } from 'lucide-solid';
import { createSignal, For, Show } from 'solid-js';
import { toast } from 'somoto';
import { ConfirmDialog } from '~/components/confirm-dialog';
import { EmptyState } from '~/components/empty-state';
import { VoucherFormDialog } from '~/components/voucher-form-dialog';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { ApiError } from '~/lib/api-client';
import { formatPriceCents } from '~/lib/currency';
import { formatDateTime } from '~/lib/datetime';

import {
  useDeleteVoucherMutation,
  useMyVouchersQuery,
  voucherLabel,
  voucherStatus,
  type Voucher,
  type VoucherStatus,
} from '~/queries/vouchers';

const STATUS: Record<VoucherStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Aktif', variant: 'default' },
  upcoming: { label: 'Dijadwalkan', variant: 'secondary' },
  exhausted: { label: 'Kuota habis', variant: 'destructive' },
  expired: { label: 'Kedaluwarsa', variant: 'outline' },
  inactive: { label: 'Nonaktif', variant: 'outline' },
};

export default function SellerVouchers() {
  const vouchersQuery = useMyVouchersQuery();
  const deleteVoucher = useDeleteVoucherMutation();

  const vouchers = () => vouchersQuery.data ?? [];
  const [creating, setCreating] = createSignal(false);
  const [pendingDelete, setPendingDelete] = createSignal<Voucher | null>(null);

  function confirmDelete() {
    const voucher = pendingDelete();
    if (!voucher) return;
    deleteVoucher.mutate(voucher.id, {
      onSuccess: () => toast.success('Voucher dihapus.'),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus voucher.'),
      onSettled: () => setPendingDelete(null),
    });
  }

  return (
    <div class='flex h-full min-h-0 flex-col gap-6'>
      <div class='flex items-center justify-between'>
        <h1 class='text-xl font-bold text-foreground'>Voucher</h1>
        <Button size='sm' class='gap-1.5' onClick={() => setCreating(true)}>
          <Plus class='size-4' aria-hidden='true' />
          Buat Voucher
        </Button>
      </div>

      <Show
        when={!vouchersQuery.isLoading}
        fallback={
          <div class='flex flex-col gap-2'>
            <For each={Array(4).fill(0)}>{() => <Skeleton class='h-14 w-full rounded-lg' />}</For>
          </div>
        }
      >
        <Show
          when={vouchers().length > 0}
          fallback={
            <EmptyState
              icon={Ticket}
              title='Belum ada voucher'
              description='Buat kode voucher agar pembeli lebih tertarik checkout.'
              action={<Button onClick={() => setCreating(true)}>Buat Voucher</Button>}
            />
          }
        >
          <Card class='min-h-0 flex-1 overflow-hidden p-0'>
            <div class='h-full overflow-y-auto'>
              <Table>
                <TableHeader class='sticky top-0 z-10 bg-card'>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Diskon</TableHead>
                    <TableHead>Min. belanja</TableHead>
                    <TableHead>Dipakai</TableHead>
                    <TableHead>Berlaku sampai</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <For each={vouchers()}>
                    {(voucher) => {
                      const status = () => STATUS[voucherStatus(voucher)];
                      return (
                        <TableRow>
                          <TableCell>
                            <span class='font-mono font-semibold'>{voucher.code}</span>
                            <br />
                            <span class='text-xs text-muted-foreground'>
                              {voucher.name} · {voucher.scope === 'platform' ? 'Semua produk' : 'Tokomu'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {voucherLabel(voucher)}
                            <Show when={voucher.max_discount_cents}>
                              {(cap) => (
                                <span class='block text-xs text-muted-foreground'>
                                  maks. {formatPriceCents(cap())}
                                </span>
                              )}
                            </Show>
                          </TableCell>
                          <TableCell>
                            {voucher.min_spend_cents > 0 ? formatPriceCents(voucher.min_spend_cents) : '-'}
                          </TableCell>
                          <TableCell>
                            {voucher.used_count}
                            {voucher.usage_limit !== null ? ` / ${voucher.usage_limit}` : ''}
                          </TableCell>
                          <TableCell class='text-xs text-muted-foreground'>
                            {formatDateTime(voucher.ends_at)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status().variant}>{status().label}</Badge>
                          </TableCell>
                          <TableCell>
                            <div class='flex justify-end'>
                              <Button
                                type='button'
                                variant='destructive'
                                size='icon-sm'
                                aria-label='Hapus voucher'
                                onClick={() => setPendingDelete(voucher)}
                              >
                                <Trash2 class='size-3.5' aria-hidden='true' />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }}
                  </For>
                </TableBody>
              </Table>
            </div>
          </Card>
        </Show>
      </Show>

      <VoucherFormDialog open={creating()} onOpenChange={setCreating} />

      <ConfirmDialog
        open={pendingDelete() !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title='Hapus voucher ini?'
        description='Kode tidak bisa dipakai lagi. Pesanan yang sudah memakainya tidak berubah.'
        confirmLabel='Hapus'
        variant='destructive'
        confirming={deleteVoucher.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
