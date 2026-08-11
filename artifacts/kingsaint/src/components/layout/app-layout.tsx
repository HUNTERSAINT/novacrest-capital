import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  LayoutDashboard, 
  Wallet, 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Users, 
  Settings, 
  LogOut,
  ShieldAlert,
  CreditCard,
  Menu,
  X,
  QrCode,
  Zap,
  Copy,
  Shield,
  TrendingUp,
  ShieldCheck,
  MessageSquare,
  UserCheck,
} from "lucide-react";
import { useLogout } from "@workspace/api-client-react";
import { NotificationBell } from "@/components/NotificationBell";
import { LiveChat } from "@/components/LiveChat";

const TOKEN_KEY = "novacrest_token";
const ADMIN_TOKEN_KEY = "novacrest_admin_token";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout: localLogout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Impersonation banner
  const isImpersonating = !!sessionStorage.getItem(ADMIN_TOKEN_KEY);

  const returnToAdmin = () => {
    const adminToken = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (adminToken) {
      localStorage.setItem(TOKEN_KEY, adminToken);
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
      window.location.href = "/admin/users";
    }
  };

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        localLogout();
        setLocation("/login");
      }
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate();
    setMobileOpen(false);
  };

  const isAdmin = user?.role === 'admin';

  const userLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/investments", label: "My Portfolio", icon: Wallet },
    { href: "/deposit", label: "Deposit", icon: ArrowDownLeft },
    { href: "/withdraw", label: "Withdraw", icon: ArrowUpRight },
    { href: "/transactions", label: "Transactions", icon: History },
    { href: "/profit-history", label: "Profit History", icon: TrendingUp },
    { href: "/signals", label: "Trading Signals", icon: Zap },
    { href: "/copy-trading", label: "Copy Trading", icon: Copy },
    { href: "/kyc", label: "KYC Verification", icon: Shield },
    { href: "/referrals", label: "Referrals", icon: Users },
  ];

  const adminLinks = [
    { href: "/admin", label: "Overview", icon: ShieldAlert },
    { href: "/admin/users", label: "Members", icon: Users },
    { href: "/admin/transactions", label: "Approvals", icon: CreditCard },
    { href: "/admin/plans", label: "Manage Plans", icon: Wallet },
    { href: "/admin/wallets", label: "Payment Wallets", icon: QrCode },
    { href: "/admin/kyc", label: "KYC Review", icon: ShieldCheck },
    { href: "/admin/signals", label: "Signals", icon: Zap },
    { href: "/admin/copy-trading", label: "Copy Trading", icon: Copy },
    { href: "/admin/chat", label: "Live Chat", icon: MessageSquare },
  ];

  const links = isAdmin ? adminLinks : userLinks;

  const pageTitle = (() => {
    const seg = location.split('/').filter(Boolean);
    if (!seg.length) return 'Overview';
    const last = seg[seg.length - 1];
    if (/^\d+$/.test(last) && seg.length > 1) return seg[seg.length - 2];
    return last;
  })();

  if (!user) return null;

  const SidebarInner = ({ onNav }: { onNav?: () => void }) => (
    <>
      {/* Logo */}
      <div className="h-16 lg:h-20 flex items-center justify-between px-6 border-b border-white/5 shrink-0">
        <Link href={isAdmin ? "/admin" : "/dashboard"} onClick={onNav} className="flex items-center gap-2 group cursor-pointer">
          <span className="font-serif text-2xl font-bold tracking-tight text-white group-hover:text-primary transition-colors">
            Novacrest<span className="text-primary">.</span>
          </span>
        </Link>
        {onNav && (
          <button onClick={onNav} className="lg:hidden text-muted-foreground hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav links */}
      <div className="flex-1 py-6 px-4 overflow-y-auto">
        <nav className="space-y-1">
          <div className="px-2 mb-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {isAdmin ? 'Admin Console' : 'Member Area'}
          </div>
          {links.map((link) => {
            const isActive = location === link.href || 
              (link.href !== "/admin" && link.href !== "/dashboard" && location.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} onClick={onNav}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-sm cursor-pointer transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary/10 text-primary border-l-2 border-primary' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-sm">{link.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User footer */}
      <div className="p-4 border-t border-white/5 shrink-0">
        <div className="flex items-center gap-3 px-2 py-3 mb-2 rounded-sm bg-white/5">
          <Avatar className="h-9 w-9 border border-white/10 shrink-0">
            <AvatarImage src={user.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary">{user.fullName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-white truncate">{user.fullName}</span>
            <span className="text-xs text-muted-foreground truncate capitalize">{user.role}</span>
          </div>
        </div>
        <nav className="space-y-1">
          <Link href="/profile" onClick={onNav}>
            <div className="flex items-center gap-3 px-3 py-2 rounded-sm cursor-pointer text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
              <Settings className="w-4 h-4" />
              <span className="font-medium text-sm">Settings</span>
            </div>
          </Link>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-sm cursor-pointer text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </nav>
      </div>
    </>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      {/* Impersonation banner */}
      {isImpersonating && (
        <div className="w-full bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-3 z-30 shrink-0">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
            <UserCheck className="w-3.5 h-3.5 shrink-0" />
            You are viewing this account as an admin. Actions taken here affect a real user.
          </div>
          <button
            onClick={returnToAdmin}
            className="shrink-0 text-xs bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 px-3 py-1 rounded-sm transition-colors font-medium"
          >
            Return to Admin
          </button>
        </div>
      )}
      <div className="flex flex-1 min-h-0">

      {/* ── Desktop Sidebar (lg+) ── */}
      <aside className="hidden lg:flex w-64 border-r border-white/5 bg-card flex-col fixed inset-y-0 left-0 z-20">
        <SidebarInner />
      </aside>

      {/* ── Mobile Drawer overlay ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-card border-r border-white/10 flex flex-col h-full z-50 mobile-drawer">
            <SidebarInner onNav={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0">

        {/* Header */}
        <header className="h-16 lg:h-20 border-b border-white/5 bg-background/80 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-sm bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-base lg:text-lg font-serif font-medium text-white capitalize tracking-wide truncate">
              {pageTitle.replace(/-/g, ' ') || 'Overview'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {!isAdmin && (
              <div className="text-right hidden sm:block">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Balance</p>
                <p className="font-serif text-base lg:text-lg text-primary">
                  ${user.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
            <NotificationBell />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden bg-noise">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Live Chat Widget — only for members, not admins */}
      {!isAdmin && <LiveChat />}
    </div>
    </div>
  );
}
