import { Show } from 'solid-js';
import { TextField, TextFieldInput, TextFieldLabel } from '~/components/ui/text-field';

export type DiscountType = 'percent' | 'fixed';

// Shared by the campaign and voucher forms: percent-vs-rupiah toggle plus
// the value input. `value` is the raw field text — percent as 1-100, fixed
// as rupiah (callers convert to cents).
export function DiscountFields(props: {
  type: DiscountType;
  onTypeChange: (type: DiscountType) => void;
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <div class='grid grid-cols-2 gap-4'>
      <div class='flex flex-col gap-1.5'>
        <span class='text-sm font-medium'>Jenis Diskon</span>
        <div class='grid grid-cols-2 gap-1 rounded-lg bg-muted p-1' role='radiogroup' aria-label='Jenis diskon'>
          {(['percent', 'fixed'] as const).map((type) => (
            <button
              type='button'
              role='radio'
              aria-checked={props.type === type}
              onClick={() => props.onTypeChange(type)}
              class='rounded-md px-2 py-1.5 text-sm font-medium transition-colors'
              classList={{
                'bg-background text-foreground shadow-sm': props.type === type,
                'text-muted-foreground hover:text-foreground': props.type !== type,
              }}
            >
              {type === 'percent' ? 'Persen' : 'Rupiah'}
            </button>
          ))}
        </div>
      </div>

      <TextField class='gap-1.5'>
        <TextFieldLabel>
          <Show when={props.type === 'percent'} fallback='Potongan (Rp)'>
            Potongan (%)
          </Show>
        </TextFieldLabel>
        <TextFieldInput
          required
          type='number'
          min='1'
          max={props.type === 'percent' ? '100' : undefined}
          placeholder={props.type === 'percent' ? '20' : '20000'}
          value={props.value}
          onInput={(e) => props.onValueChange(e.currentTarget.value)}
        />
      </TextField>
    </div>
  );
}
