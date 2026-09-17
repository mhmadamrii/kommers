import type { JSX } from 'solid-js';
import { Show } from 'solid-js';
import type { LucideIcon } from 'lucide-solid';

export function EmptyState(props: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: JSX.Element;
}) {
  return (
    <div class='flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center'>
      <span class='flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground'>
        <props.icon class='size-6' aria-hidden='true' />
      </span>
      <p class='text-base font-semibold text-foreground'>{props.title}</p>
      <Show when={props.description}>
        <p class='max-w-sm text-sm text-muted-foreground'>{props.description}</p>
      </Show>
      <Show when={props.action}>{props.action}</Show>
    </div>
  );
}
