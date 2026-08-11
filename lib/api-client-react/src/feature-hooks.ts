import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

const BASE = "";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface KycDocument {
  id: number;
  userId: number;
  documentType: "passport" | "national_id" | "drivers_license";
  frontUrl: string;
  backUrl?: string | null;
  selfieUrl?: string | null;
  status: "pending" | "approved" | "rejected";
  adminNotes?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
}

export interface TradingSignal {
  id: number;
  title: string;
  asset: string;
  action: "buy" | "sell" | "hold";
  entryPrice?: string | null;
  targetPrice?: string | null;
  stopLoss?: string | null;
  timeframe: "short_term" | "mid_term" | "long_term";
  status: "active" | "completed" | "expired";
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: number;
  sessionId: number;
  senderId: number;
  senderRole: "user" | "admin";
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ChatSession {
  id: number;
  userId: number;
  status: "open" | "closed";
  lastMessageAt: string;
  createdAt: string;
  user?: { id: number; fullName: string; email: string };
  lastMessage?: ChatMessage | null;
  unreadCount?: number;
}

export interface CopyTradingStrategy {
  id: number;
  name: string;
  managerName: string;
  description: string;
  monthlyRoi: number;
  riskLevel: "low" | "medium" | "high";
  minAmount: number;
  followersCount: number;
  winRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserCopyTrade {
  id: number;
  userId: number;
  strategyId: number;
  allocatedAmount: number;
  status: "active" | "paused" | "stopped";
  joinedAt: string;
  updatedAt: string;
}

// ─── Notifications ─────────────────────────────────────────────────────────

export function useGetNotifications() {
  return useQuery<{ notifications: AppNotification[]; unreadCount: number }>({
    queryKey: ["notifications"],
    queryFn: () => customFetch(`${BASE}/api/notifications`),
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, number>({
    mutationFn: (id) => customFetch(`${BASE}/api/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, void>({
    mutationFn: () => customFetch(`${BASE}/api/notifications/read-all`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

// ─── KYC ──────────────────────────────────────────────────────────────────────

export function useGetMyKyc() {
  return useQuery<{ kyc: KycDocument | null }>({
    queryKey: ["kyc", "me"],
    queryFn: () => customFetch(`${BASE}/api/kyc/me`),
  });
}

export function useSubmitKyc() {
  const qc = useQueryClient();
  return useMutation<{ kyc: KycDocument }, Error, { documentType: string; frontUrl: string; backUrl?: string; selfieUrl?: string }>({
    mutationFn: (data) =>
      customFetch(`${BASE}/api/kyc`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kyc"] }),
  });
}

export function useGetAdminKyc() {
  return useQuery<{ kycs: (KycDocument & { userEmail?: string; userFullName?: string })[] }>({
    queryKey: ["admin", "kyc"],
    queryFn: () => customFetch(`${BASE}/api/admin/kyc`),
  });
}

export function useUpdateKycStatus() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, { id: number; status: "approved" | "rejected"; adminNotes?: string }>({
    mutationFn: ({ id, ...data }) =>
      customFetch(`${BASE}/api/admin/kyc/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "kyc"] }),
  });
}

// ─── Trading Signals ──────────────────────────────────────────────────────────

export function useGetSignals() {
  return useQuery<{ signals: TradingSignal[] }>({
    queryKey: ["signals"],
    queryFn: () => customFetch(`${BASE}/api/signals`),
    refetchInterval: 60000,
  });
}

export function useCreateAdminSignal() {
  const qc = useQueryClient();
  return useMutation<TradingSignal, Error, Partial<TradingSignal>>({
    mutationFn: (data) =>
      customFetch(`${BASE}/api/admin/signals`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["signals"] }),
  });
}

export function useUpdateAdminSignal() {
  const qc = useQueryClient();
  return useMutation<TradingSignal, Error, { id: number } & Partial<TradingSignal>>({
    mutationFn: ({ id, ...data }) =>
      customFetch(`${BASE}/api/admin/signals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["signals"] }),
  });
}

export function useDeleteAdminSignal() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, number>({
    mutationFn: (id) => customFetch(`${BASE}/api/admin/signals/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["signals"] }),
  });
}

// ─── Copy Trading ─────────────────────────────────────────────────────────────

export function useGetStrategies() {
  return useQuery<{ strategies: CopyTradingStrategy[] }>({
    queryKey: ["copy-trading", "strategies"],
    queryFn: () => customFetch(`${BASE}/api/copy-trading/strategies`),
  });
}

export function useGetMyCopyTrade() {
  return useQuery<{ copyTrade: UserCopyTrade | null; strategy: CopyTradingStrategy | null }>({
    queryKey: ["copy-trading", "my"],
    queryFn: () => customFetch(`${BASE}/api/copy-trading/my`),
  });
}

export function useJoinStrategy() {
  const qc = useQueryClient();
  return useMutation<{ copyTrade: UserCopyTrade; strategy: CopyTradingStrategy }, Error, { strategyId: number; allocatedAmount: number }>({
    mutationFn: (data) =>
      customFetch(`${BASE}/api/copy-trading/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["copy-trading"] }); qc.invalidateQueries({ queryKey: ["getMe"] }); },
  });
}

export function useLeaveStrategy() {
  const qc = useQueryClient();
  return useMutation<{ message: string }, Error, void>({
    mutationFn: () => customFetch(`${BASE}/api/copy-trading/leave`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["copy-trading"] }); qc.invalidateQueries({ queryKey: ["getMe"] }); },
  });
}

export function useGetAdminStrategies() {
  return useQuery<{ strategies: CopyTradingStrategy[] }>({
    queryKey: ["admin", "copy-trading"],
    queryFn: () => customFetch(`${BASE}/api/admin/copy-trading/strategies`),
  });
}

export function useCreateAdminStrategy() {
  const qc = useQueryClient();
  return useMutation<CopyTradingStrategy, Error, Partial<CopyTradingStrategy>>({
    mutationFn: (data) =>
      customFetch(`${BASE}/api/admin/copy-trading/strategies`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "copy-trading"] }),
  });
}

export function useUpdateAdminStrategy() {
  const qc = useQueryClient();
  return useMutation<CopyTradingStrategy, Error, { id: number } & Partial<CopyTradingStrategy>>({
    mutationFn: ({ id, ...data }) =>
      customFetch(`${BASE}/api/admin/copy-trading/strategies/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "copy-trading"] }),
  });
}

export function useDeleteAdminStrategy() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, number>({
    mutationFn: (id) => customFetch(`${BASE}/api/admin/copy-trading/strategies/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "copy-trading"] }),
  });
}
