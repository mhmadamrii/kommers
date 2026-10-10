const pad = (n: number) => String(n).padStart(2, '0');

/** Formats a Date for <input type="datetime-local"> in the browser's local zone. */
export function toLocalInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** datetime-local value (local zone, no offset) -> ISO string the API expects. */
export function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

const formatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

export function formatDateTime(iso: string): string {
  return formatter.format(new Date(iso));
}
