import type { ComponentProps, ValidComponent } from 'solid-js';
import { splitProps } from 'solid-js';
import { Checkbox as CheckboxPrimitive } from '@kobalte/core/checkbox';
import { cx } from '~/lib/cva';

export type CheckboxProps<T extends ValidComponent = 'div'> = ComponentProps<
  typeof CheckboxPrimitive<T>
>;

export const Checkbox = <T extends ValidComponent = 'div'>(props: CheckboxProps<T>) => {
  const [, rest] = splitProps(props as CheckboxProps, ['class']);

  return (
    <CheckboxPrimitive data-slot='checkbox' class={cx('flex items-center gap-2', props.class)} {...rest} />
  );
};

export type CheckboxControlProps<T extends ValidComponent = 'div'> = ComponentProps<
  typeof CheckboxPrimitive.Control<T>
>;

export const CheckboxControl = <T extends ValidComponent = 'div'>(
  props: CheckboxControlProps<T>,
) => {
  const [, rest] = splitProps(props as CheckboxControlProps, ['class']);

  return (
    <CheckboxPrimitive.Control
      data-slot='checkbox-control'
      class={cx(
        'peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none',
        'data-[checked]:bg-primary data-[checked]:text-primary-foreground data-[checked]:border-primary',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )}
      {...rest}
    >
      <CheckboxPrimitive.Indicator class='flex items-center justify-center text-current'>
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' class='size-3.5'>
          <path
            fill='none'
            stroke='currentColor'
            stroke-linecap='round'
            stroke-linejoin='round'
            stroke-width='3'
            d='M20 6L9 17l-5-5'
          />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Control>
  );
};

export type CheckboxLabelProps<T extends ValidComponent = 'label'> = ComponentProps<
  typeof CheckboxPrimitive.Label<T>
>;

export const CheckboxLabel = <T extends ValidComponent = 'label'>(
  props: CheckboxLabelProps<T>,
) => {
  const [, rest] = splitProps(props as CheckboxLabelProps, ['class']);

  return (
    <CheckboxPrimitive.Label
      data-slot='checkbox-label'
      class={cx('text-sm leading-snug text-foreground', props.class)}
      {...rest}
    />
  );
};
