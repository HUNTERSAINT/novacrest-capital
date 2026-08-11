/**
 * Hand-written React Query hooks for wallet address management.
 * Uses the same customFetch utility as orval-generated hooks.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type {
  MutationFunction,
  QueryFunction,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query';
import { customFetch } from './custom-fetch';
import type { ErrorType } from './custom-fetch';

export interface WalletAddress {
  id: number;
  cryptoType: string;
  network: string;
  label: string;
  address: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WalletAddressInput {
  cryptoType: string;
  network: string;
  label: string;
  address: string;
  isActive?: boolean;
}

export interface WalletAddressUpdate {
  cryptoType?: string;
  network?: string;
  label?: string;
  address?: string;
  isActive?: boolean;
}

// ── Public ──────────────────────────────────────────────────────────────────

export function useGetWallets<TData = WalletAddress[], TError = ErrorType<unknown>>(
  options?: { query?: UseQueryOptions<WalletAddress[], TError, TData> }
): UseQueryResult<TData, TError> {
  const { query: queryOptions } = options ?? {};

  const queryFn: QueryFunction<WalletAddress[]> = ({ signal }) =>
    customFetch<WalletAddress[]>('/api/wallets', { signal });

  return useQuery<WalletAddress[], TError, TData>({
    queryKey: ['wallets'],
    queryFn,
    ...queryOptions,
  });
}

// ── Admin ────────────────────────────────────────────────────────────────────

export function useGetAdminWallets<TData = WalletAddress[], TError = ErrorType<unknown>>(
  options?: { query?: UseQueryOptions<WalletAddress[], TError, TData> }
): UseQueryResult<TData, TError> {
  const { query: queryOptions } = options ?? {};

  const queryFn: QueryFunction<WalletAddress[]> = ({ signal }) =>
    customFetch<WalletAddress[]>('/api/admin/wallets', { signal });

  return useQuery<WalletAddress[], TError, TData>({
    queryKey: ['admin', 'wallets'],
    queryFn,
    ...queryOptions,
  });
}

export function useCreateAdminWallet(
  options?: { mutation?: UseMutationOptions<WalletAddress, ErrorType<unknown>, WalletAddressInput, unknown> }
): UseMutationResult<WalletAddress, ErrorType<unknown>, WalletAddressInput, unknown> {
  const mutationFn: MutationFunction<WalletAddress, WalletAddressInput> = (data) =>
    customFetch<WalletAddress>('/api/admin/wallets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

  return useMutation({ mutationFn, ...options?.mutation });
}

export function useUpdateAdminWallet(
  options?: { mutation?: UseMutationOptions<WalletAddress, ErrorType<unknown>, { id: number; data: WalletAddressUpdate }, unknown> }
): UseMutationResult<WalletAddress, ErrorType<unknown>, { id: number; data: WalletAddressUpdate }, unknown> {
  const mutationFn: MutationFunction<WalletAddress, { id: number; data: WalletAddressUpdate }> = ({ id, data }) =>
    customFetch<WalletAddress>(`/api/admin/wallets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

  return useMutation({ mutationFn, ...options?.mutation });
}

export function useDeleteAdminWallet(
  options?: { mutation?: UseMutationOptions<{ message: string }, ErrorType<unknown>, { id: number }, unknown> }
): UseMutationResult<{ message: string }, ErrorType<unknown>, { id: number }, unknown> {
  const mutationFn: MutationFunction<{ message: string }, { id: number }> = ({ id }) =>
    customFetch<{ message: string }>(`/api/admin/wallets/${id}`, { method: 'DELETE' });

  return useMutation({ mutationFn, ...options?.mutation });
}
