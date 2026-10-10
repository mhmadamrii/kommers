import { useMutation, useQuery, useQueryClient } from '@tanstack/solid-query';
import { ApiError, apiFetch, canResolveSession } from '~/lib/api-client';

// Matches voucherResponse / validateVoucherResponse in packages/server
// internal/handler/voucher.go.
export type Voucher = {
  id: number;
  code: string;
  name: string;
  scope: 'platform' | 'seller';
  seller_name?: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_discount_cents?: number;
  min_spend_cents: number;
  usage_limit: number | null;
  used_count: number;
  per_user_limit: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  used_by_me: boolean;
};

export type VoucherPreview = {
  code: string;
  name: string;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
};

export const VOUCHERS_QUERY_KEY = ['vouchers', 'available'] as const;

// Logged-out is a normal state here (same reasoning as useWishlistQuery):
// 401 resolves to an empty list instead of throwing.
export function useAvailableVouchersQuery() {
  return useQuery(() => ({
    queryKey: VOUCHERS_QUERY_KEY,
    queryFn: async () => {
      try {
        return await apiFetch<Voucher[]>('/api/v1/me/vouchers');
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return [];
        throw err;
      }
    },
    retry: false,
    enabled: canResolveSession(),
  }));
}

export function useValidateVoucherMutation() {
  return useMutation(() => ({
    mutationFn: (code: string) =>
      apiFetch<VoucherPreview>('/api/v1/vouchers/validate', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
  }));
}

export function voucherLabel(v: Voucher): string {
  return v.discount_type === 'percent'
    ? `${v.discount_value}%`
    : new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(v.discount_value / 100);
}

// Merchant side — matches voucherRequest in packages/server
// internal/handler/voucher.go. Admin vouchers are platform-wide, a seller's
// only discount that seller's own lines.
export type VoucherRequest = {
  code: string;
  name: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_discount_cents?: number;
  min_spend_cents: number;
  usage_limit?: number;
  per_user_limit: number;
  starts_at: string;
  ends_at: string;
};

export const MY_VOUCHERS_QUERY_KEY = ['vouchers', 'mine'] as const;

export function useMyVouchersQuery() {
  return useQuery(() => ({
    queryKey: MY_VOUCHERS_QUERY_KEY,
    queryFn: () => apiFetch<Voucher[]>('/api/v1/vouchers'),
    enabled: canResolveSession(),
  }));
}

export function useCreateVoucherMutation() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: (input: VoucherRequest) =>
      apiFetch<Voucher>('/api/v1/vouchers', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_VOUCHERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: VOUCHERS_QUERY_KEY });
    },
  }));
}

export function useDeleteVoucherMutation() {
  const queryClient = useQueryClient();
  return useMutation(() => ({
    mutationFn: (id: number) => apiFetch<void>(`/api/v1/vouchers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_VOUCHERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: VOUCHERS_QUERY_KEY });
    },
  }));
}

export type VoucherStatus = 'active' | 'upcoming' | 'expired' | 'exhausted' | 'inactive';

export function voucherStatus(v: Voucher, now = Date.now()): VoucherStatus {
  if (!v.is_active) return 'inactive';
  if (now > new Date(v.ends_at).getTime()) return 'expired';
  if (v.usage_limit !== null && v.used_count >= v.usage_limit) return 'exhausted';
  if (now < new Date(v.starts_at).getTime()) return 'upcoming';
  return 'active';
}
