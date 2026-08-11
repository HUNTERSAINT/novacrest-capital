import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useGetNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@workspace/api-client-react";
import { useAuth } from "@/components/auth-provider";
import { Bell, CheckCheck, MessageCircle, ShieldCheck, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// ── Type → icon + admin route mapping ────────────────────────────────────────
const typeConfig: Record<string, { emoji: string; adminLink?: string }> = {
  // Member-facing
  deposit_approved:    { emoji: "✅" },
  deposit_rejected:    { emoji: "❌" },
  withdrawal_approved: { emoji: "✅" },
  withdrawal_rejected: { emoji: "❌" },
  kyc_approved:        { emoji: "🛡️" },
  kyc_rejected:        { emoji: "⚠️" },
  kyc:                 { emoji: "🛡️" },
  referral_bonus:      { emoji: "🎁" },
  investment_started:  { emoji: "📈" },
  profit_credited:     { emoji: "💰" },
  // Admin-facing
  admin_chat_message:       { emoji: "💬", adminLink: "/admin/chat" },
  admin_kyc_submitted:      { emoji: "🪪", adminLink: "/admin/kyc" },
  admin_deposit_request:    { emoji: "📥", adminLink: "/admin/transactions" },
  admin_withdrawal_request: { emoji: "📤", adminLink: "/admin/transactions" },
};

function fmtTime(d: string) {
  const date = new Date(d);
  if (isToday(date)) return format(date, "h:mm a");
  return format(date, "MMM d, h:mm a");
}

// ── Component ─────────────────────────────────────────────────────────────────
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { toast } = useToast();

  const { data, refetch } = useGetNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllMutation = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;

  // Track previous unread count to detect new notifications
  const prevUnreadRef = useRef(unread);
  const prevIdsRef = useRef<Set<number>>(new Set(notifications.map(n => n.id)));

  // Poll more aggressively for admins so notifications feel live
  useEffect(() => {
    const interval = setInterval(() => refetch(), isAdmin ? 4000 : 30000);
    return () => clearInterval(interval);
  }, [isAdmin, refetch]);

  // Toast when a NEW admin notification arrives (not just unread count change)
  useEffect(() => {
    if (!isAdmin || notifications.length === 0) return;
    const currentIds = new Set(notifications.map(n => n.id));
    const newNotifs = notifications.filter(
      n => !prevIdsRef.current.has(n.id) && !n.isRead
    );
    if (newNotifs.length > 0 && prevIdsRef.current.size > 0) {
      const latest = newNotifs[0];
      const cfg = typeConfig[latest.type];
      toast({
        title: `${cfg?.emoji ?? "🔔"} ${latest.title}`,
        description: latest.message,
        duration: 6000,
      });
    }
    prevIdsRef.current = currentIds;
    prevUnreadRef.current = unread;
  }, [notifications, isAdmin, unread, toast]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNotifClick = useCallback((n: { id: number; isRead: boolean; type: string }) => {
    if (!n.isRead) markReadMutation.mutate(n.id);
    const cfg = typeConfig[n.type];
    if (isAdmin && cfg?.adminLink) {
      setOpen(false);
      navigate(cfg.adminLink);
    }
  }, [isAdmin, markReadMutation, navigate]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-sm bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <motion.span
            key={unread}
            initial={{ scale: 0.6 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full text-[10px] font-bold text-background flex items-center justify-center"
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[340px] max-w-[calc(100vw-1rem)] bg-card border border-white/10 rounded-sm shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-white">Notifications</span>
                {unread > 0 && (
                  <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full">
                    {unread} new
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  onClick={() => markAllMutation.mutate()}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
            </div>

            {/* Admin quick-nav chips */}
            {isAdmin && (
              <div className="flex gap-1.5 px-3 py-2.5 border-b border-white/5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {[
                  { label: "Chat", icon: MessageCircle, href: "/admin/chat",
                    count: notifications.filter(n => n.type === "admin_chat_message" && !n.isRead).length },
                  { label: "KYC", icon: ShieldCheck, href: "/admin/kyc",
                    count: notifications.filter(n => n.type === "admin_kyc_submitted" && !n.isRead).length },
                  { label: "Deposits", icon: ArrowDownCircle, href: "/admin/transactions",
                    count: notifications.filter(n => n.type === "admin_deposit_request" && !n.isRead).length },
                  { label: "Withdrawals", icon: ArrowUpCircle, href: "/admin/transactions",
                    count: notifications.filter(n => n.type === "admin_withdrawal_request" && !n.isRead).length },
                ].map(({ label, icon: Icon, href, count }) => (
                  <button
                    key={label}
                    onClick={() => { setOpen(false); navigate(href); }}
                    className="shrink-0 flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm px-2.5 py-1.5 text-muted-foreground hover:text-white transition-colors relative"
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                    {count > 0 && (
                      <span className="ml-0.5 bg-primary text-background text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                        {count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Notification list */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No notifications yet.</p>
                </div>
              ) : (
                notifications.map(n => {
                  const cfg = typeConfig[n.type];
                  const isClickable = isAdmin && !!cfg?.adminLink;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`w-full text-left px-4 py-3 border-b border-white/5 last:border-0 transition-colors ${
                        !n.isRead ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-white/5"
                      } ${isClickable ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-base shrink-0 mt-0.5">{cfg?.emoji ?? "🔔"}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-xs font-medium leading-snug ${!n.isRead ? "text-white" : "text-white/70"}`}>
                              {n.title}
                            </p>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isClickable && (
                                <span className="text-[9px] text-primary/60 border border-primary/20 rounded px-1">
                                  VIEW →
                                </span>
                              )}
                              {!n.isRead && (
                                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                            {n.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {fmtTime(n.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
