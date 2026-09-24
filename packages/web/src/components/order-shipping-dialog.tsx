import { createMemo, createSignal, For, Show } from 'solid-js';
import { toast } from 'somoto';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from '~/components/ui/dialog';
import { TextField, TextFieldInput, TextFieldLabel } from '~/components/ui/text-field';
import { ApiError } from '~/lib/api-client';
import type { Order, OrderStatus } from '~/queries/orders';
import { useUpdateShippingMutation } from '~/queries/seller-orders';

// Mirrors CanAdvanceShippingTo's forward-only rank on the server
// (packages/server/internal/model/order.go) — used here only to decide
// which statuses to offer, the server re-checks the transition anyway.
const SHIPPING_RANK: Partial<Record<OrderStatus, number>> = {
  paid: 0,
  processing: 1,
  shipped: 2,
  delivered: 3,
};

const NEXT_STATUS_LABEL: Record<string, string> = {
  processing: 'Diproses',
  shipped: 'Dikirim',
  delivered: 'Selesai',
};

export function OrderShippingDialog(props: { order: Order; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [trackingNumber, setTrackingNumber] = createSignal(props.order.tracking_number ?? '');
  const [courier, setCourier] = createSignal(props.order.courier ?? '');
  const updateShipping = useUpdateShippingMutation();

  const nextOptions = createMemo(() => {
    const currentRank = SHIPPING_RANK[props.order.status] ?? -1;
    return (Object.keys(SHIPPING_RANK) as OrderStatus[]).filter((s) => SHIPPING_RANK[s]! > currentRank);
  });

  function handleOpenChange(next: boolean) {
    props.onOpenChange(next);
    if (next) {
      setTrackingNumber(props.order.tracking_number ?? '');
      setCourier(props.order.courier ?? '');
    }
  }

  function handleAdvance(status: OrderStatus) {
    updateShipping.mutate(
      { orderId: props.order.id, status, trackingNumber: trackingNumber(), courier: courier() },
      {
        onSuccess: () => {
          toast.success(`Pesanan #${props.order.id} ditandai ${NEXT_STATUS_LABEL[status] ?? status}.`);
          handleOpenChange(false);
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : 'Gagal memperbarui status pengiriman.');
        },
      },
    );
  }

  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kelola Pengiriman · Pesanan #{props.order.id}</DialogTitle>
            <DialogDescription>
              Isi nomor resi (opsional) lalu perbarui status pesanan ini.
            </DialogDescription>
          </DialogHeader>

          <div class='flex flex-col gap-3'>
            <TextField class='gap-1.5'>
              <TextFieldLabel>Kurir</TextFieldLabel>
              <TextFieldInput
                placeholder='JNE, SiCepat, dll.'
                value={courier()}
                onInput={(e) => setCourier(e.currentTarget.value)}
              />
            </TextField>

            <TextField class='gap-1.5'>
              <TextFieldLabel>No. Resi</TextFieldLabel>
              <TextFieldInput
                placeholder='Nomor resi pengiriman'
                value={trackingNumber()}
                onInput={(e) => setTrackingNumber(e.currentTarget.value)}
              />
            </TextField>
          </div>

          <DialogFooter class='flex-col gap-2 sm:flex-col'>
            <Show
              when={nextOptions().length > 0}
              fallback={<p class='text-sm text-muted-foreground'>Pesanan ini sudah tidak bisa diperbarui lagi.</p>}
            >
              <For each={nextOptions()}>
                {(status) => (
                  <Button
                    type='button'
                    class='w-full'
                    variant={status === 'delivered' ? 'default' : 'outline'}
                    disabled={updateShipping.isPending}
                    onClick={() => handleAdvance(status)}
                  >
                    Tandai {NEXT_STATUS_LABEL[status] ?? status}
                  </Button>
                )}
              </For>
            </Show>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
