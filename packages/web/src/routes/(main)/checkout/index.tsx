import { A } from '@solidjs/router';
import { MapPin, Plus, ShoppingBag, Ticket, X } from 'lucide-solid';
import { createSignal, For, Show } from 'solid-js';
import { toast } from 'somoto';
import { AddressForm } from '~/components/address-form';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { EmptyState } from '~/components/empty-state';
import { Skeleton } from '~/components/ui/skeleton';
import { TextField, TextFieldInput } from '~/components/ui/text-field';
import { ApiError } from '~/lib/api-client';
import { formatPriceCents } from '~/lib/currency';
import { useAddressesQuery, useCreateAddressMutation } from '~/queries/addresses';
import { useCartQuery } from '~/queries/cart';
import { useCheckoutMutation } from '~/queries/orders';
import {
  useAvailableVouchersQuery,
  useValidateVoucherMutation,
  voucherLabel,
  type VoucherPreview,
} from '~/queries/vouchers';

export default function Checkout() {
  const cartQuery = useCartQuery();
  const addressesQuery = useAddressesQuery();
  const createAddress = useCreateAddressMutation();
  const checkout = useCheckoutMutation();
  const vouchersQuery = useAvailableVouchersQuery();
  const validateVoucher = useValidateVoucherMutation();

  const [selectedAddressId, setSelectedAddressId] = createSignal<number | null>(null);
  const [showAddressForm, setShowAddressForm] = createSignal(false);
  const [voucherInput, setVoucherInput] = createSignal('');
  const [appliedVoucher, setAppliedVoucher] = createSignal<VoucherPreview | null>(null);

  const items = () => cartQuery.data?.items ?? [];
  const addresses = () => addressesQuery.data ?? [];
  const vouchers = () => vouchersQuery.data ?? [];
  const payable = () => appliedVoucher()?.total_cents ?? cartQuery.data?.total_cents ?? 0;

  function applyVoucher(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;
    validateVoucher.mutate(trimmed, {
      onSuccess: (preview) => {
        setAppliedVoucher(preview);
        setVoucherInput('');
        toast.success(`Voucher ${preview.code} dipakai.`);
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : 'Voucher tidak bisa dipakai.');
      },
    });
  }

  function defaultSelection() {
    if (selectedAddressId() !== null) return selectedAddressId();
    const list = addresses();
    return (list.find((a) => a.is_default) ?? list[0])?.id ?? null;
  }

  function handlePay() {
    const addressId = defaultSelection();
    if (!addressId) {
      toast.error('Pilih alamat pengiriman terlebih dahulu.');
      return;
    }
    checkout.mutate({ addressId, voucherCode: appliedVoucher()?.code }, {
      onSuccess: (result) => {
        window.location.href = result.checkout_url;
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : 'Gagal memulai pembayaran.');
      },
    });
  }

  return (
    <div class='flex flex-col gap-6 px-4 py-6 sm:px-6'>
      <h1 class='text-xl font-bold text-foreground'>Checkout</h1>

      <Show
        when={!cartQuery.isLoading}
        fallback={<Skeleton class='h-64 w-full rounded-xl' />}
      >
        <Show
          when={items().length > 0}
          fallback={
            <EmptyState
              icon={ShoppingBag}
              title='Keranjang kosong'
              description='Tambahkan produk ke keranjang sebelum checkout.'
              action={
                <Button as={A} href='/products'>
                  Belanja Sekarang
                </Button>
              }
            />
          }
        >
          <div class='grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]'>
            <div class='flex flex-col gap-6'>
              <div class='flex flex-col gap-3'>
                <h2 class='text-sm font-semibold text-foreground'>Alamat Pengiriman</h2>

                <Show when={!addressesQuery.isLoading}>
                  <div class='flex flex-col gap-2'>
                    <For each={addresses()}>
                      {(address) => (
                        <button
                          type='button'
                          onClick={() => setSelectedAddressId(address.id)}
                          class='flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors'
                          classList={{
                            'border-primary bg-primary/5': defaultSelection() === address.id,
                            'border-border hover:border-primary/50': defaultSelection() !== address.id,
                          }}
                        >
                          <MapPin class='mt-0.5 size-4 shrink-0 text-muted-foreground' aria-hidden='true' />
                          <div class='flex flex-col gap-0.5 text-sm'>
                            <span class='font-medium text-foreground'>
                              {address.recipient}
                              <Show when={address.label}> · {address.label}</Show>
                            </span>
                            <span class='text-muted-foreground'>{address.phone}</span>
                            <span class='text-muted-foreground'>
                              {address.line1}
                              <Show when={address.line2}>, {address.line2}</Show>, {address.city}
                              <Show when={address.state}>, {address.state}</Show> {address.postal_code}
                            </span>
                          </div>
                        </button>
                      )}
                    </For>
                  </div>
                </Show>

                <Show
                  when={showAddressForm()}
                  fallback={
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      class='w-fit gap-1.5'
                      onClick={() => setShowAddressForm(true)}
                    >
                      <Plus class='size-3.5' aria-hidden='true' />
                      Tambah Alamat
                    </Button>
                  }
                >
                  <Card class='p-4'>
                    <AddressForm
                      submitting={createAddress.isPending}
                      submitLabel='Simpan Alamat'
                      onSubmit={(input) => {
                        createAddress.mutate(input, {
                          onSuccess: (address) => {
                            toast.success('Alamat tersimpan.');
                            setSelectedAddressId(address.id);
                            setShowAddressForm(false);
                          },
                          onError: (err) => {
                            toast.error(
                              err instanceof ApiError ? err.message : 'Gagal menyimpan alamat.',
                            );
                          },
                        });
                      }}
                    />
                  </Card>
                </Show>
              </div>
            </div>

            <div class='lg:sticky lg:top-6 lg:self-start'>
              <Card class='flex flex-col gap-3 p-4'>
                <h2 class='text-sm font-semibold text-foreground'>Ringkasan Pesanan</h2>
                <div class='flex flex-col gap-2 border-b border-border pb-3'>
                  <For each={items()}>
                    {(item) => (
                      <div class='flex items-center justify-between gap-2 text-sm'>
                        <span class='line-clamp-1 text-foreground'>
                          {item.product_name} <span class='text-muted-foreground'>×{item.quantity}</span>
                        </span>
                        <span class='shrink-0 font-medium text-foreground'>
                          {formatPriceCents(item.subtotal_cents)}
                        </span>
                      </div>
                    )}
                  </For>
                </div>
                <div class='flex flex-col gap-2 border-b border-border pb-3'>
                  <Show
                    when={appliedVoucher()}
                    fallback={
                      <>
                        <form
                          class='flex gap-2'
                          onSubmit={(e) => {
                            e.preventDefault();
                            applyVoucher(voucherInput());
                          }}
                        >
                          <TextField class='flex-1' value={voucherInput()} onChange={setVoucherInput}>
                            <TextFieldInput
                              class='w-full uppercase'
                              placeholder='Kode voucher'
                              aria-label='Kode voucher'
                            />
                          </TextField>
                          <Button
                            type='submit'
                            variant='outline'
                            disabled={validateVoucher.isPending || !voucherInput().trim()}
                          >
                            Pakai
                          </Button>
                        </form>
                        <Show when={vouchers().filter((v) => !v.used_by_me).length > 0}>
                          <div class='flex flex-col gap-1.5'>
                            <For each={vouchers().filter((v) => !v.used_by_me)}>
                              {(voucher) => (
                                <button
                                  type='button'
                                  onClick={() => applyVoucher(voucher.code)}
                                  class='flex items-center gap-2 rounded-lg border border-dashed border-primary/50 bg-primary/5 px-3 py-2 text-left text-xs transition-colors hover:bg-primary/10'
                                >
                                  <Ticket class='size-4 shrink-0 text-primary' aria-hidden='true' />
                                  <span class='flex min-w-0 flex-col'>
                                    <span class='font-semibold text-foreground'>
                                      {voucher.code} · {voucherLabel(voucher)}
                                    </span>
                                    <span class='text-muted-foreground'>
                                      {voucher.scope === 'seller' ? `Toko ${voucher.seller_name}` : 'Semua produk'}
                                      <Show when={voucher.min_spend_cents > 0}>
                                        {' '}· min. {formatPriceCents(voucher.min_spend_cents)}
                                      </Show>
                                    </span>
                                  </span>
                                </button>
                              )}
                            </For>
                          </div>
                        </Show>
                      </>
                    }
                  >
                    {(voucher) => (
                      <div class='flex items-center justify-between gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm'>
                        <span class='flex items-center gap-2 font-medium text-foreground'>
                          <Ticket class='size-4 text-primary' aria-hidden='true' />
                          {voucher().code}
                        </span>
                        <button
                          type='button'
                          aria-label='Hapus voucher'
                          class='text-muted-foreground hover:text-foreground'
                          onClick={() => setAppliedVoucher(null)}
                        >
                          <X class='size-4' aria-hidden='true' />
                        </button>
                      </div>
                    )}
                  </Show>
                </div>
                <Show when={appliedVoucher()}>
                  {(voucher) => (
                    <div class='flex items-center justify-between text-sm text-emerald-600'>
                      <span>Diskon voucher</span>
                      <span>-{formatPriceCents(voucher().discount_cents)}</span>
                    </div>
                  )}
                </Show>
                <div class='flex items-center justify-between text-sm font-semibold text-foreground'>
                  <span>Total</span>
                  <span>{formatPriceCents(payable())}</span>
                </div>
                <Button disabled={checkout.isPending} onClick={handlePay} class='w-full'>
                  {checkout.isPending ? 'Memproses...' : 'Bayar dengan Stripe'}
                </Button>
                <p class='text-center text-xs text-muted-foreground'>
                  Kamu akan diarahkan ke halaman pembayaran Stripe (mode uji).
                </p>
              </Card>
            </div>
          </div>
        </Show>
      </Show>
    </div>
  );
}
