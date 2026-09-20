import { createSignal } from 'solid-js';
import { Button } from '~/components/ui/button';
import { Checkbox, CheckboxControl, CheckboxLabel } from '~/components/ui/checkbox';
import { TextField, TextFieldInput, TextFieldLabel } from '~/components/ui/text-field';
import type { AddressRequest } from '~/queries/addresses';

export function AddressForm(props: {
  submitting: boolean;
  submitLabel: string;
  onSubmit: (input: AddressRequest) => void;
}) {
  const [label, setLabel] = createSignal('');
  const [recipient, setRecipient] = createSignal('');
  const [phone, setPhone] = createSignal('');
  const [line1, setLine1] = createSignal('');
  const [line2, setLine2] = createSignal('');
  const [city, setCity] = createSignal('');
  const [state, setState] = createSignal('');
  const [postalCode, setPostalCode] = createSignal('');
  const [country, setCountry] = createSignal('ID');
  const [isDefault, setIsDefault] = createSignal(false);

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    props.onSubmit({
      label: label(),
      recipient: recipient(),
      phone: phone(),
      line1: line1(),
      line2: line2(),
      city: city(),
      state: state(),
      postal_code: postalCode(),
      country: country(),
      is_default: isDefault(),
    });
  }

  return (
    <form class='flex flex-col gap-3' onSubmit={handleSubmit}>
      <TextField class='gap-1.5'>
        <TextFieldLabel>Label (opsional)</TextFieldLabel>
        <TextFieldInput
          placeholder='Rumah, Kantor, dll.'
          value={label()}
          onInput={(e) => setLabel(e.currentTarget.value)}
        />
      </TextField>

      <TextField class='gap-1.5'>
        <TextFieldLabel>Nama Penerima</TextFieldLabel>
        <TextFieldInput
          required
          value={recipient()}
          onInput={(e) => setRecipient(e.currentTarget.value)}
        />
      </TextField>

      <TextField class='gap-1.5'>
        <TextFieldLabel>Nomor HP</TextFieldLabel>
        <TextFieldInput
          required
          type='tel'
          placeholder='08123456789'
          value={phone()}
          onInput={(e) => setPhone(e.currentTarget.value)}
        />
      </TextField>

      <TextField class='gap-1.5'>
        <TextFieldLabel>Alamat</TextFieldLabel>
        <TextFieldInput
          required
          placeholder='Jl. Contoh No. 1'
          value={line1()}
          onInput={(e) => setLine1(e.currentTarget.value)}
        />
      </TextField>

      <TextField class='gap-1.5'>
        <TextFieldLabel>Detail Tambahan (opsional)</TextFieldLabel>
        <TextFieldInput
          placeholder='RT/RW, blok, patokan'
          value={line2()}
          onInput={(e) => setLine2(e.currentTarget.value)}
        />
      </TextField>

      <div class='grid grid-cols-2 gap-3'>
        <TextField class='gap-1.5'>
          <TextFieldLabel>Kota</TextFieldLabel>
          <TextFieldInput required value={city()} onInput={(e) => setCity(e.currentTarget.value)} />
        </TextField>
        <TextField class='gap-1.5'>
          <TextFieldLabel>Provinsi</TextFieldLabel>
          <TextFieldInput value={state()} onInput={(e) => setState(e.currentTarget.value)} />
        </TextField>
      </div>

      <div class='grid grid-cols-2 gap-3'>
        <TextField class='gap-1.5'>
          <TextFieldLabel>Kode Pos</TextFieldLabel>
          <TextFieldInput
            required
            value={postalCode()}
            onInput={(e) => setPostalCode(e.currentTarget.value)}
          />
        </TextField>
        <TextField class='gap-1.5'>
          <TextFieldLabel>Negara</TextFieldLabel>
          <TextFieldInput
            required
            value={country()}
            onInput={(e) => setCountry(e.currentTarget.value)}
          />
        </TextField>
      </div>

      <Checkbox checked={isDefault()} onChange={setIsDefault}>
        <CheckboxControl />
        <CheckboxLabel>Jadikan alamat utama</CheckboxLabel>
      </Checkbox>

      <Button type='submit' disabled={props.submitting} class='w-full'>
        {props.submitting ? 'Menyimpan...' : props.submitLabel}
      </Button>
    </form>
  );
}
