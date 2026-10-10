import { createSignal, For, Show } from 'solid-js';
import { toast } from 'somoto';
import { DiscountFields, type DiscountType } from '~/components/discount-fields';
import { Button } from '~/components/ui/button';
import { Checkbox, CheckboxControl, CheckboxLabel } from '~/components/ui/checkbox';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from '~/components/ui/dialog';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';

import { TextField, TextFieldInput, TextFieldLabel } from '~/components/ui/text-field';
import { ApiError } from '~/lib/api-client';
import { formatPriceCents } from '~/lib/currency';
import { fromLocalInput, toLocalInput } from '~/lib/datetime';
import { useCreateCampaignMutation } from '~/queries/campaigns';
import { useCategoriesQuery, type Category } from '~/queries/categories';
import { useMyProductsQuery } from '~/queries/products';
import { useMeQuery } from '~/queries/auth';

function CampaignForm(props: { onDone: () => void }) {
  const meQuery = useMeQuery();
  const productsQuery = useMyProductsQuery();
  const categoriesQuery = useCategoriesQuery();
  const create = useCreateCampaignMutation();

  const isAdmin = () => meQuery.data?.role === 'admin';
  const products = () => (productsQuery.data ?? []).filter((p) => p.is_active);

  const [name, setName] = createSignal('');
  const [type, setType] = createSignal<DiscountType>('percent');
  const [value, setValue] = createSignal('');
  const [startsAt, setStartsAt] = createSignal(toLocalInput(new Date()));
  const [endsAt, setEndsAt] = createSignal(toLocalInput(new Date(Date.now() + 24 * 3_600_000)));
  const [stockLimit, setStockLimit] = createSignal('');
  const [freeShipping, setFreeShipping] = createSignal(false);
  const [target, setTarget] = createSignal<'products' | 'category'>('products');
  const [selected, setSelected] = createSignal<number[]>([]);
  const [category, setCategory] = createSignal<Category | undefined>();

  function toggleProduct(id: number, on: boolean) {
    setSelected((ids) => (on ? [...ids, id] : ids.filter((x) => x !== id)));
  }

  const canSubmit = () =>
    !create.isPending && (target() === 'products' ? selected().length > 0 : category() !== undefined);

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (new Date(endsAt()) <= new Date(startsAt())) {
      toast.error('Waktu selesai harus setelah waktu mulai.');
      return;
    }
    const raw = Number(value());
    if (type() === 'percent' && raw > 100) {
      toast.error('Diskon persen maksimal 100.');
      return;
    }

    create.mutate(
      {
        name: name(),
        discount_type: type(),
        discount_value: type() === 'percent' ? raw : Math.round(raw * 100),
        starts_at: fromLocalInput(startsAt()),
        ends_at: fromLocalInput(endsAt()),
        stock_limit: stockLimit() ? Number(stockLimit()) : undefined,
        free_shipping: freeShipping(),
        ...(target() === 'products'
          ? { product_ids: selected() }
          : { category_id: category()!.id }),
      },
      {
        onSuccess: () => {
          toast.success('Flash sale dibuat.');
          props.onDone();
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : 'Gagal membuat flash sale.');
        },
      },
    );
  }

  return (
    <form class='flex flex-col gap-4' onSubmit={handleSubmit}>
      <TextField class='gap-1.5'>
        <TextFieldLabel>Nama Flash Sale</TextFieldLabel>
        <TextFieldInput
          required
          placeholder='Flash Sale Akhir Pekan'
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
        />
      </TextField>

      <DiscountFields type={type()} onTypeChange={setType} value={value()} onValueChange={setValue} />

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
          <TextFieldLabel>Selesai</TextFieldLabel>
          <TextFieldInput
            required
            type='datetime-local'
            value={endsAt()}
            onInput={(e) => setEndsAt(e.currentTarget.value)}
          />
        </TextField>
      </div>

      <TextField class='gap-1.5'>
        <TextFieldLabel>Batas stok promo (opsional)</TextFieldLabel>
        <TextFieldInput
          type='number'
          min='1'
          placeholder='Kosongkan jika tanpa batas'
          value={stockLimit()}
          onInput={(e) => setStockLimit(e.currentTarget.value)}
        />
      </TextField>

      <Checkbox checked={freeShipping()} onChange={setFreeShipping}>
        <CheckboxControl />
        <CheckboxLabel>Gratis ongkir selama promo</CheckboxLabel>
      </Checkbox>

      <div class='flex flex-col gap-2'>
        <div class='flex items-center justify-between'>
          <span class='text-sm font-medium'>Berlaku untuk</span>
          <Show when={isAdmin()}>
            <div class='grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-xs'>
              {(['products', 'category'] as const).map((t) => (
                <button
                  type='button'
                  onClick={() => setTarget(t)}
                  class='rounded-md px-2.5 py-1 font-medium'
                  classList={{
                    'bg-background shadow-sm': target() === t,
                    'text-muted-foreground': target() !== t,
                  }}
                >
                  {t === 'products' ? 'Produk' : 'Kategori'}
                </button>
              ))}
            </div>
          </Show>
        </div>

        <Show
          when={target() === 'products'}
          fallback={
            <Select<Category>
              options={categoriesQuery.data ?? []}
              optionValue='id'
              optionTextValue='name'
              value={category()}
              onChange={(v) => v && setCategory(v)}
              placeholder='Pilih kategori'
              itemComponent={(itemProps) => (
                <SelectItem item={itemProps.item}>{itemProps.item.rawValue.name}</SelectItem>
              )}
            >
              <SelectTrigger class='w-full'>
                <SelectValue<Category>>{(state) => state.selectedOption()?.name}</SelectValue>
              </SelectTrigger>
              <SelectPortal>
                <SelectContent />
              </SelectPortal>
            </Select>
          }
        >
          <Show
            when={products().length > 0}
            fallback={<p class='text-sm text-muted-foreground'>Kamu belum punya produk aktif.</p>}
          >
            <div class='max-h-44 overflow-y-auto rounded-lg border border-border'>
              <For each={products()}>
                {(product) => (
                  <div class='flex items-center justify-between gap-2 border-b border-border px-3 py-2 last:border-b-0'>
                    <Checkbox
                      checked={selected().includes(product.id)}
                      onChange={(on) => toggleProduct(product.id, on)}
                    >
                      <CheckboxControl />
                      <CheckboxLabel class='line-clamp-1'>{product.name}</CheckboxLabel>
                    </Checkbox>
                    <span class='shrink-0 text-xs text-muted-foreground'>
                      {formatPriceCents(product.price_cents)}
                    </span>
                  </div>
                )}
              </For>
            </div>
            <span class='text-xs text-muted-foreground'>{selected().length} produk dipilih</span>
          </Show>
        </Show>
      </div>

      <Button type='submit' disabled={!canSubmit()} class='w-full'>
        {create.isPending ? 'Menyimpan...' : 'Buat Flash Sale'}
      </Button>
    </form>
  );
}

export function CampaignFormDialog(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogPortal>
        <DialogContent class='max-h-[90vh] overflow-y-auto sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle>Buat Flash Sale</DialogTitle>
            <DialogDescription>
              Diskon berbatas waktu untuk produkmu. Pembeli melihatnya di beranda dengan hitung mundur.
            </DialogDescription>
          </DialogHeader>
          {/* Re-mounted on every open so the fields start fresh. */}
          <Show when={props.open}>
            <CampaignForm onDone={() => props.onOpenChange(false)} />
          </Show>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
