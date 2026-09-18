import { createSignal } from 'solid-js';
import { Button } from '~/components/ui/button';
import { Checkbox, CheckboxControl, CheckboxLabel } from '~/components/ui/checkbox';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';

import {
  TextField,
  TextFieldInput,
  TextFieldLabel,
  TextFieldTextArea,
} from '~/components/ui/text-field';

import type { Category } from '~/queries/categories';
import type { Product, ProductRequest } from '~/queries/products';

export function SellerProductForm(props: {
  categories: Category[];
  product?: Product;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (input: ProductRequest) => void;
}) {
  const [category, setCategory] = createSignal<Category | undefined>(
    props.categories.find((c) => c.id === props.product?.category_id),
  );
  const [name, setName] = createSignal(props.product?.name ?? '');
  const [description, setDescription] = createSignal(props.product?.description ?? '');
  const [priceRupiah, setPriceRupiah] = createSignal(
    props.product ? String(props.product.price_cents / 100) : '',
  );
  const [stock, setStock] = createSignal(props.product ? String(props.product.stock) : '0');
  const [location, setLocation] = createSignal(props.product?.location ?? '');
  const [freeShipping, setFreeShipping] = createSignal(props.product?.free_shipping ?? false);
  const [isActive, setIsActive] = createSignal(props.product?.is_active ?? true);

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const selectedCategory = category();
    if (!selectedCategory) return;

    props.onSubmit({
      category_id: selectedCategory.id,
      name: name(),
      description: description(),
      price_cents: Math.round(Number(priceRupiah()) * 100),
      stock: Number(stock()),
      location: location(),
      free_shipping: freeShipping(),
      is_active: isActive(),
    });
  }

  return (
    <form class='flex flex-col gap-4' onSubmit={handleSubmit}>
      <TextField class='gap-1.5'>
        <TextFieldLabel>Nama Produk</TextFieldLabel>
        <TextFieldInput
          required
          placeholder='Kemeja Flanel Lengan Panjang'
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
        />
      </TextField>

      <div class='flex flex-col gap-1.5'>
        <label class='text-sm font-medium'>Kategori</label>
        <Select<Category>
          options={props.categories}
          optionValue='id'
          optionTextValue='name'
          value={category()}
          onChange={(value) => value && setCategory(value)}
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
      </div>

      <TextField class='gap-1.5'>
        <TextFieldLabel>Deskripsi</TextFieldLabel>
        <TextFieldTextArea
          placeholder='Deskripsikan produkmu'
          value={description()}
          onInput={(e) => setDescription(e.currentTarget.value)}
        />
      </TextField>

      <div class='grid grid-cols-2 gap-4'>
        <TextField class='gap-1.5'>
          <TextFieldLabel>Harga (Rp)</TextFieldLabel>
          <TextFieldInput
            required
            type='number'
            min='1'
            placeholder='150000'
            value={priceRupiah()}
            onInput={(e) => setPriceRupiah(e.currentTarget.value)}
          />
        </TextField>

        <TextField class='gap-1.5'>
          <TextFieldLabel>Stok</TextFieldLabel>
          <TextFieldInput
            required
            type='number'
            min='0'
            value={stock()}
            onInput={(e) => setStock(e.currentTarget.value)}
          />
        </TextField>
      </div>

      <TextField class='gap-1.5'>
        <TextFieldLabel>Lokasi</TextFieldLabel>
        <TextFieldInput
          placeholder='Jakarta Selatan'
          value={location()}
          onInput={(e) => setLocation(e.currentTarget.value)}
        />
      </TextField>

      <Checkbox checked={freeShipping()} onChange={setFreeShipping}>
        <CheckboxControl />
        <CheckboxLabel>Gratis ongkir</CheckboxLabel>
      </Checkbox>

      <Checkbox checked={isActive()} onChange={setIsActive}>
        <CheckboxControl />
        <CheckboxLabel>Aktif (tampil di toko)</CheckboxLabel>
      </Checkbox>

      <Button type='submit' disabled={props.submitting || !category()} class='w-full'>
        {props.submitting ? 'Menyimpan...' : props.submitLabel}
      </Button>
    </form>
  );
}
