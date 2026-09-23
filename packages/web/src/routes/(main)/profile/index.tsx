import { Mail, MapPin, Plus, ShieldCheck } from 'lucide-solid';
import { createEffect, createSignal, For, Show } from 'solid-js';
import { toast } from 'somoto';
import { AddressForm } from '~/components/address-form';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { EmptyState } from '~/components/empty-state';
import { Skeleton } from '~/components/ui/skeleton';
import { TextField, TextFieldInput, TextFieldLabel } from '~/components/ui/text-field';
import { ApiError } from '~/lib/api-client';
import { useAddressesQuery, useCreateAddressMutation } from '~/queries/addresses';
import { useMeQuery, useUpdateMeMutation, type Role } from '~/queries/auth';

const ROLE_LABEL: Record<Role, string> = {
  customer: 'Pembeli',
  seller: 'Penjual',
  admin: 'Admin',
};

export default function Profile() {
  const meQuery = useMeQuery();
  const addressesQuery = useAddressesQuery();
  const updateMe = useUpdateMeMutation();
  const createAddress = useCreateAddressMutation();

  const addresses = () => addressesQuery.data ?? [];
  const [fullName, setFullName] = createSignal('');
  const [showAddressForm, setShowAddressForm] = createSignal(false);

  // Seeds the editable field from the query once it resolves — a plain
  // `value={meQuery.data?.full_name}` would fight every keystroke since
  // the query re-renders on its own schedule, not the form's.
  createEffect(() => {
    const user = meQuery.data;
    if (user) setFullName(user.full_name);
  });

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const value = fullName().trim();
    if (!value) return;

    updateMe.mutate(
      { full_name: value },
      {
        onSuccess: () => toast.success('Profil berhasil diperbarui.'),
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : 'Gagal memperbarui profil.');
        },
      },
    );
  }

  return (
    <div class='flex flex-col gap-6 px-4 py-6 sm:px-6'>
      <h1 class='text-xl font-bold text-foreground'>Profil Saya</h1>

      <Show when={!meQuery.isPending} fallback={<Skeleton class='h-64 w-full max-w-lg rounded-xl' />}>
        <Show when={meQuery.data} fallback={<EmptyState icon={ShieldCheck} title='Kamu belum masuk' />}>
          {(user) => (
            <div class='grid max-w-3xl grid-cols-1 gap-6 lg:grid-cols-2'>
              <Card class='flex flex-col gap-4 p-4'>
                <h2 class='text-sm font-semibold text-foreground'>Detail Akun</h2>

                <div class='flex items-center gap-2 text-sm text-muted-foreground'>
                  <Mail class='size-4 shrink-0' aria-hidden='true' />
                  {user().email}
                  <Badge variant='secondary' class='ml-auto'>
                    {ROLE_LABEL[user().role]}
                  </Badge>
                </div>

                <form class='flex flex-col gap-3' onSubmit={handleSubmit}>
                  <TextField class='w-full'>
                    <TextFieldLabel>Nama Lengkap</TextFieldLabel>
                    <TextFieldInput
                      value={fullName()}
                      onInput={(e) => setFullName(e.currentTarget.value)}
                    />
                  </TextField>
                  <Button
                    type='submit'
                    disabled={updateMe.isPending || fullName().trim() === user().full_name}
                    class='w-fit'
                  >
                    {updateMe.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </Button>
                </form>
              </Card>

              <Card class='flex flex-col gap-3 p-4'>
                <h2 class='text-sm font-semibold text-foreground'>Alamat Tersimpan</h2>

                <Show
                  when={!addressesQuery.isLoading}
                  fallback={<Skeleton class='h-20 w-full rounded-lg' />}
                >
                  <Show
                    when={addresses().length > 0}
                    fallback={
                      <p class='text-sm text-muted-foreground'>Belum ada alamat tersimpan.</p>
                    }
                  >
                    <div class='flex flex-col gap-2'>
                      <For each={addresses()}>
                        {(address) => (
                          <div class='flex items-start gap-2.5 rounded-lg border border-border p-3'>
                            <MapPin class='mt-0.5 size-4 shrink-0 text-muted-foreground' aria-hidden='true' />
                            <div class='flex flex-col gap-0.5 text-sm'>
                              <span class='font-medium text-foreground'>
                                {address.recipient}
                                <Show when={address.label}> · {address.label}</Show>
                                <Show when={address.is_default}>
                                  {' '}
                                  <Badge variant='default' class='align-middle text-[10px]'>
                                    Utama
                                  </Badge>
                                </Show>
                              </span>
                              <span class='text-muted-foreground'>{address.phone}</span>
                              <span class='text-muted-foreground'>
                                {address.line1}
                                <Show when={address.line2}>, {address.line2}</Show>, {address.city}
                                <Show when={address.state}>, {address.state}</Show> {address.postal_code}
                              </span>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
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
                  <AddressForm
                    submitting={createAddress.isPending}
                    submitLabel='Simpan Alamat'
                    onSubmit={(input) => {
                      createAddress.mutate(input, {
                        onSuccess: () => {
                          toast.success('Alamat tersimpan.');
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
                </Show>
              </Card>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
}
