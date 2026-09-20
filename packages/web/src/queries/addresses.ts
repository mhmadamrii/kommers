import { useMutation, useQuery, useQueryClient } from '@tanstack/solid-query';
import { apiFetch } from '~/lib/api-client';

// Matches GET /api/v1/me/addresses' addressResponse exactly
// (packages/server internal/handler/address.go).
export type Address = {
  id: number;
  label: string;
  recipient: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
};

export type AddressRequest = {
  label?: string;
  recipient: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  is_default?: boolean;
};

export const ADDRESSES_QUERY_KEY = ['addresses'] as const;

export function useAddressesQuery() {
  return useQuery(() => ({
    queryKey: ADDRESSES_QUERY_KEY,
    queryFn: () => apiFetch<Address[]>('/api/v1/me/addresses'),
  }));
}

export function useCreateAddressMutation() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: (input: AddressRequest) =>
      apiFetch<Address>('/api/v1/me/addresses', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY }),
  }));
}
