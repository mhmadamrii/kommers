import { Star } from 'lucide-solid';
import { For } from 'solid-js';

// Display-only star row for a real average_rating value. Never render this
// against fabricated/placeholder data — see CLAUDE.md's rating gotcha.
export function StarRating(props: { rating: number; size?: 'sm' | 'md' }) {
  const starSize = props.size === 'md' ? 'size-4' : 'size-3';

  return (
    <div class='flex items-center gap-0.5'>
      <For each={[1, 2, 3, 4, 5]}>
        {(i) => (
          <Star
            class={starSize}
            classList={{
              'fill-amber-400 text-amber-400': i <= Math.round(props.rating),
              'text-muted-foreground/40': i > Math.round(props.rating),
            }}
            aria-hidden='true'
          />
        )}
      </For>
    </div>
  );
}

// Interactive 1-5 star picker for submitting a review.
export function StarRatingInput(props: { value: number; onChange: (rating: number) => void }) {
  return (
    <div class='flex items-center gap-1'>
      <For each={[1, 2, 3, 4, 5]}>
        {(i) => (
          <button
            type='button'
            aria-label={`${i} bintang`}
            onClick={() => props.onChange(i)}
            class='transition-transform hover:scale-110'
          >
            <Star
              class='size-6'
              classList={{
                'fill-amber-400 text-amber-400': i <= props.value,
                'text-muted-foreground/40': i > props.value,
              }}
              aria-hidden='true'
            />
          </button>
        )}
      </For>
    </div>
  );
}
