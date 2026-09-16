import type { ComponentProps } from 'solid-js';

import { splitProps } from 'solid-js';
import { cva } from '~/lib/cva';
import type { VariantProps } from 'cva';

export const badgeVariants = cva({
  base: 'inline-flex items-center justify-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0',
  variants: {
    variant: {
      default: 'border-transparent bg-primary text-primary-foreground',
      secondary: 'border-transparent bg-secondary text-secondary-foreground',
      accent: 'border-transparent bg-accent text-accent-foreground',
      outline: 'border-border text-foreground',
      destructive: 'border-transparent bg-destructive text-white',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>;

export const Badge = (props: BadgeProps) => {
  const [, rest] = splitProps(props, ['class', 'variant']);

  return (
    <span
      data-slot='badge'
      class={badgeVariants({ variant: props.variant, class: props.class })}
      {...rest}
    />
  );
};
