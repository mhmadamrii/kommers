import { Plus, Trash2, Zap } from 'lucide-solid';
import { createSignal, For, Show } from 'solid-js';
import { toast } from 'somoto';
import { CampaignFormDialog } from '~/components/campaign-form-dialog';
import { ConfirmDialog } from '~/components/confirm-dialog';
import { EmptyState } from '~/components/empty-state';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { ApiError } from '~/lib/api-client';
import { formatPriceCents } from '~/lib/currency';
import { formatDateTime } from '~/lib/datetime';
import { useCategoriesQuery } from '~/queries/categories';

import {
  campaignStatus,
  useCampaignsQuery,
  useDeleteCampaignMutation,
  type Campaign,
  type CampaignStatus,
} from '~/queries/campaigns';

const STATUS: Record<CampaignStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  live: { label: 'Berjalan', variant: 'default' },
  upcoming: { label: 'Dijadwalkan', variant: 'secondary' },
  sold_out: { label: 'Stok habis', variant: 'destructive' },
  ended: { label: 'Berakhir', variant: 'outline' },
};

export default function SellerCampaigns() {
  const campaignsQuery = useCampaignsQuery();
  const categoriesQuery = useCategoriesQuery();
  const deleteCampaign = useDeleteCampaignMutation();

  const campaigns = () => campaignsQuery.data ?? [];
  const [creating, setCreating] = createSignal(false);
  const [pendingDelete, setPendingDelete] = createSignal<Campaign | null>(null);

  const discount = (c: Campaign) =>
    c.discount_type === 'percent' ? `${c.discount_value}%` : formatPriceCents(c.discount_value);

  const target = (c: Campaign) => {
    if (c.category_id) {
      const name = categoriesQuery.data?.find((cat) => cat.id === c.category_id)?.name;
      return `Kategori ${name ?? `#${c.category_id}`}`;
    }
    return `${c.product_ids?.length ?? 0} produk`;
  };

  function confirmDelete() {
    const campaign = pendingDelete();
    if (!campaign) return;
    deleteCampaign.mutate(campaign.id, {
      onSuccess: () => toast.success('Flash sale dihentikan.'),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Gagal menghentikan flash sale.'),
      onSettled: () => setPendingDelete(null),
    });
  }

  return (
    <div class='flex h-full min-h-0 flex-col gap-6'>
      <div class='flex items-center justify-between'>
        <h1 class='text-xl font-bold text-foreground'>Flash Sale</h1>
        <Button size='sm' class='gap-1.5' onClick={() => setCreating(true)}>
          <Plus class='size-4' aria-hidden='true' />
          Buat Flash Sale
        </Button>
      </div>

      <Show
        when={!campaignsQuery.isLoading}
        fallback={
          <div class='flex flex-col gap-2'>
            <For each={Array(4).fill(0)}>{() => <Skeleton class='h-14 w-full rounded-lg' />}</For>
          </div>
        }
      >
        <Show
          when={campaigns().length > 0}
          fallback={
            <EmptyState
              icon={Zap}
              title='Belum ada flash sale'
              description='Buat diskon berbatas waktu untuk mendorong penjualan.'
              action={<Button onClick={() => setCreating(true)}>Buat Flash Sale</Button>}
            />
          }
        >
          <Card class='min-h-0 flex-1 overflow-hidden p-0'>
            <div class='h-full overflow-y-auto'>
              <Table>
                <TableHeader class='sticky top-0 z-10 bg-card'>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Diskon</TableHead>
                    <TableHead>Berlaku untuk</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Terjual</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <For each={campaigns()}>
                    {(campaign) => {
                      const status = () => STATUS[campaignStatus(campaign)];
                      return (
                        <TableRow>
                          <TableCell class='max-w-48 truncate font-medium'>
                            {campaign.name}
                            <Show when={campaign.free_shipping}>
                              <span class='ml-1.5 text-xs font-normal text-muted-foreground'>· gratis ongkir</span>
                            </Show>
                          </TableCell>
                          <TableCell>{discount(campaign)}</TableCell>
                          <TableCell>{target(campaign)}</TableCell>
                          <TableCell class='text-xs text-muted-foreground'>
                            {formatDateTime(campaign.starts_at)}
                            <br />
                            s/d {formatDateTime(campaign.ends_at)}
                          </TableCell>
                          <TableCell>
                            {campaign.stock_used}
                            {campaign.stock_limit !== null ? ` / ${campaign.stock_limit}` : ''}
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
                                aria-label='Hentikan flash sale'
                                onClick={() => setPendingDelete(campaign)}
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

      <CampaignFormDialog open={creating()} onOpenChange={setCreating} />

      <ConfirmDialog
        open={pendingDelete() !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title='Hentikan flash sale ini?'
        description='Harga produk langsung kembali normal. Pesanan yang sudah dibuat tidak berubah.'
        confirmLabel='Hentikan'
        variant='destructive'
        confirming={deleteCampaign.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
