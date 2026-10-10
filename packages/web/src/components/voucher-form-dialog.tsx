import { createSignal, Show } from 'solid-js';
import { toast } from 'somoto';
import { DiscountFields, type DiscountType } from '~/components/discount-fields';
import { Button } from '~/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from '~/components/ui/dialog';

import { TextField, TextFieldInput, TextFieldLabel } from '~/components/ui/text-field';
import { ApiError } from '~/lib/api-client';
import { fromLocalInput, toLocalInput } from '~/lib/datetime';
import { useMeQuery } from '~/queries/auth';
import { useCreateVoucherMutation } from '~/queries/vouchers';

const rupiahToCents = (rupiah: string) => Math.round(Number(rupiah) * 100);

function VoucherForm(props: { onDone: () => void }) {
  const meQuery = useMeQuery();
  const create = useCreateVoucherMutation();

  const [code, setCode] = createSignal('');
  const [name, setName] = createSignal('');
  const [type, setType] = createSignal<DiscountType>('percent');
  const [value, setValue] = createSignal('');
  const [maxDiscount, setMaxDiscount] = createSignal('');
  const [minSpend, setMinSpend] = createSignal('0');
  const [usageLimit, setUsageLimit] = createSignal('');
  const [perUser, setPerUser] = createSignal('1');
  const [startsAt, setStartsAt] = createSignal(toLocalInput(new Date()));
  const [endsAt, setEndsAt] = createSignal(toLocalInput(new Date(Date.now() + 30 * 24 * 3_600_000)));

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (new Date(endsAt()) <= new Date(startsAt())) {
      toast.error('Waktu berakhir harus setelah waktu mulai.');
      return;
    }
    const raw = Number(value());
    if (type() === 'percent' && raw > 100) {
      toast.error('Diskon persen maksimal 100.');
      return;
    }

    create.mutate(
      {
        code: code().trim().toUpperCase(),
        name: name(),
        discount_type: type(),
        discount_value: type() === 'percent' ? raw : rupiahToCents(value()),
        max_discount_cents: type() === 'percent' && maxDiscount() ? rupiahToCents(maxDiscount()) : undefined,
        min_spend_cents: rupiahToCents(minSpend() || '0'),
        usage_limit: usageLimit() ? Number(usageLimit()) : undefined,
        per_user_limit: Number(perUser() || '1'),
        starts_at: fromLocalInput(startsAt()),
        ends_at: fromLocalInput(endsAt()),
      },
      {
        onSuccess: () => {
          toast.success('Voucher dibuat.');
          props.onDone();
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : 'Gagal membuat voucher.');
        },
      },
    );
  }

  return (
    <form class='flex flex-col gap-4' onSubmit={handleSubmit}>
      <div class='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <TextField class='gap-1.5'>
          <TextFieldLabel>Kode Voucher</TextFieldLabel>
          <TextFieldInput
            required
            class='w-full uppercase'
            placeholder='HEMAT10'
            pattern='[A-Za-z0-9_\-]{3,40}'
            title='3-40 huruf, angka, - atau _'
            value={code()}
            onInput={(e) => setCode(e.currentTarget.value)}
          />
        </TextField>
        <TextField class='gap-1.5'>
          <TextFieldLabel>Nama</TextFieldLabel>
          <TextFieldInput
            required
            placeholder='Diskon 10% semua produk'
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
          />
        </TextField>
      </div>

      <DiscountFields type={type()} onTypeChange={setType} value={value()} onValueChange={setValue} />

      <div class='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <Show when={type() === 'percent'}>
          <TextField class='gap-1.5'>
            <TextFieldLabel>Maks. potongan (Rp, opsional)</TextFieldLabel>
            <TextFieldInput
              type='number'
              min='1'
              placeholder='50000'
              value={maxDiscount()}
              onInput={(e) => setMaxDiscount(e.currentTarget.value)}
            />
          </TextField>
        </Show>
        <TextField class='gap-1.5'>
          <TextFieldLabel>Min. belanja (Rp)</TextFieldLabel>
          <TextFieldInput
            type='number'
            min='0'
            value={minSpend()}
            onInput={(e) => setMinSpend(e.currentTarget.value)}
          />
        </TextField>
      </div>

      <div class='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <TextField class='gap-1.5'>
          <TextFieldLabel>Kuota total (opsional)</TextFieldLabel>
          <TextFieldInput
            type='number'
            min='1'
            placeholder='Tanpa batas'
            value={usageLimit()}
            onInput={(e) => setUsageLimit(e.currentTarget.value)}
          />
        </TextField>
        <TextField class='gap-1.5'>
          <TextFieldLabel>Batas per pembeli</TextFieldLabel>
          <TextFieldInput
            required
            type='number'
            min='1'
            value={perUser()}
            onInput={(e) => setPerUser(e.currentTarget.value)}
          />
        </TextField>
      </div>

      <div class='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <TextField class='gap-1.5'>
          <TextFieldLabel>Mulai</TextFieldLabel>
          <TextFieldInput
            required
            type='datetime-local'
            value={startsAt()}
            onInput={(e) => setStartsAt(e.currentTarget.value)}
          />
        </TextField>
        <TextField class='gap-1.5'>
          <TextFieldLabel>Berakhir</TextFieldLabel>
          <TextFieldInput
            required
            type='datetime-local'
            value={endsAt()}
            onInput={(e) => setEndsAt(e.currentTarget.value)}
          />
        </TextField>
      </div>

      <p class='text-xs text-muted-foreground'>
        {meQuery.data?.role === 'admin'
          ? 'Voucher admin berlaku untuk seluruh isi keranjang.'
          : 'Voucher ini hanya memotong harga produk dari tokomu.'}
      </p>

      <Button type='submit' disabled={create.isPending} class='w-full'>
        {create.isPending ? 'Menyimpan...' : 'Buat Voucher'}
      </Button>
    </form>
  );
}

export function VoucherFormDialog(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogPortal>
        <DialogContent class='max-h-[90vh] overflow-y-auto sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle>Buat Voucher</DialogTitle>
            <DialogDescription>
              Pembeli memasukkan kode ini saat checkout, atau memilihnya dari daftar voucher.
            </DialogDescription>
          </DialogHeader>
          <Show when={props.open}>
            <VoucherForm onDone={() => props.onOpenChange(false)} />
          </Show>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
