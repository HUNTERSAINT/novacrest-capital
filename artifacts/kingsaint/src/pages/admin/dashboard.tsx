import { useGetAdminStats, useGetAdminUsers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Users, DollarSign, Activity, TrendingUp, Clock, ShieldAlert } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetAdminStats();
  const { data: usersData, isLoading: usersLoading } = useGetAdminUsers();

  const isLoading = statsLoading || usersLoading;

  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-card rounded-sm border border-white/5 animate-pulse" />)}
        </div>
        <div className="h-48 bg-card rounded-sm border border-white/5 animate-pulse" />
      </div>
    );
  }

  // Sort users by createdAt desc for recent registrations
  const recentUsers = [...(usersData?.users ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const statCards = [
    { icon: Users,      label: "Total Members",     value: stats.totalUsers.toString(),        color: "text-blue-400",   bg: "bg-blue-500/10" },
    { icon: DollarSign, label: "Platform Volume",    value: fmt(stats.totalInvested),           color: "text-primary",    bg: "bg-primary/10" },
    { icon: Activity,   label: "Active Investments", value: stats.activeInvestments.toString(), color: "text-green-400",  bg: "bg-green-500/10" },
    { icon: Clock,      label: "Pending Approvals",  value: stats.pendingWithdrawals.toString(),color: "text-yellow-400", bg: "bg-yellow-500/10" },
  ];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-white">Admin Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">Platform health and key metrics.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-sm">
          <ShieldAlert className="w-4 h-4 text-primary" />
          <span className="text-primary text-sm font-medium">Admin Console</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="bg-card border-white/5 rounded-sm shadow-none">
              <CardContent className="pt-5 pb-4">
                <div className={`w-9 h-9 rounded-sm ${s.bg} flex items-center justify-center mb-3`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 leading-tight">{s.label}</p>
                <p className={`text-xl md:text-2xl font-serif font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-white/5 rounded-sm">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Platform Revenue</p>
            <p className="text-xl md:text-2xl font-serif text-primary">{fmt(stats.platformRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/5 rounded-sm">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Paid Out</p>
            <p className="text-xl md:text-2xl font-serif text-green-400">{fmt(stats.totalPaidOut)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/5 rounded-sm">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Transactions</p>
            <p className="text-xl md:text-2xl font-serif text-white">{stats.totalTransactions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent users */}
      {recentUsers.length > 0 && (
        <Card className="bg-card border-white/5 rounded-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="font-serif text-lg md:text-xl text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Recent Registrations
            </CardTitle>
            <Link href="/admin/users">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentUsers.map((u) => (
                <Link key={u.id} href={`/admin/users/${u.id}`}>
                  <div className="flex items-center justify-between p-3 bg-background border border-white/5 rounded-sm hover:border-white/15 transition-colors cursor-pointer">
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{u.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-xs text-muted-foreground">{format(new Date(u.createdAt), "MMM d, yyyy")}</p>
                      <span className={`text-xs uppercase px-2 py-0.5 rounded-sm ${
                        u.status === "active" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
                      }`}>{u.status}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/admin/transactions">
          <Card className="bg-card border-yellow-500/20 rounded-sm cursor-pointer hover:border-yellow-500/40 transition-colors">
            <CardContent className="pt-5 pb-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-sm bg-yellow-500/10 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-medium">Pending Approvals</p>
                <p className="text-muted-foreground text-sm">{stats.pendingWithdrawals} transactions awaiting review</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/users">
          <Card className="bg-card border-white/5 rounded-sm cursor-pointer hover:border-white/10 transition-colors">
            <CardContent className="pt-5 pb-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-medium">Member Management</p>
                <p className="text-muted-foreground text-sm">View, edit, and credit member accounts</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
