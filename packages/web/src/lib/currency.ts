const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** priceCents follows the API's integer-cents convention (smallest unit). */
export function formatPriceCents(priceCents: number): string {
  return rupiah.format(priceCents / 100);
}
