import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetAdminUser, useUpdateAdminUser, useCreditUser, useDeductUser } from "@workspace/api-client-react";
import { useMutation } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/custom-fetch";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ArrowLeft, DollarSign, MinusCircle, UserCog, History, TrendingUp, LogIn } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

const TOKEN_KEY = "novacrest_token";
const ADMIN_TOKEN_KEY = "novacrest_admin_token";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

export default function AdminUserDetail() {
  const [, params] = useRoute("/admin/users/:id");
  const [, setLocation] = useLocation();
  const userId = parseInt(params?.id ?? "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creditAmount, setCreditAmount] = useState("");
  const [creditType, setCreditType] = useState<"bonus" | "profit" | "deposit">("bonus");
  const [creditNote, setCreditNote] = useState("");
  const [deductAmount, setDeductAmount] = useState("");
  const [deductReason, setDeductReason] = useState("");

  const impersonateMutation = useMutation({
    mutationFn: async (id: number) => {
      const data = await customFetch<{ token: string; user: { fullName: string } }>(
        `/api/admin/impersonate/${id}`,
        { method: "POST" }
      );
      return data;
    },
    onSuccess: (data) => {
      // Save original admin token so we can return
      const adminToken = localStorage.getItem(TOKEN_KEY);
      if (adminToken) sessionStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
      // Switch to user token
      localStorage.setItem(TOKEN_KEY, data.token);
      toast({ title: `Now viewing as ${data.user.fullName}`, description: "Use 'Return to Admin' in the header to switch back." });
      // Force a full page reload to re-init auth context with new token
      window.location.href = "/dashboard";
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  // useGetAdminUser returns AdminUserDetail: { user: User, investments: Investment[], transactions: Transaction[] }
  const { data: detail, isLoading } = useGetAdminUser(userId, {
    query: { enabled: !!userId }
  });

  const updateMutation = useUpdateAdminUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast({ title: "User updated" });
      },
      onError: (err) => toast({ variant: "destructive", title: "Error", description: err.message }),
    },
  });

  const creditMutation = useCreditUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries();
        setCreditAmount("");
        setCreditNote("");
        toast({ title: "Account credited", description: "Balance updated successfully." });
      },
      onError: (err) => toast({ variant: "destructive", title: "Error", description: err.message }),
    },
  });

  const deductMutation = useDeductUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries();
        setDeductAmount("");
        setDeductReason("");
        toast({ title: "Balance deducted", description: "Amount removed from account." });
      },
      onError: (err) => toast({ variant: "destructive", title: "Error", description: err.message }),
    },
  });

  if (isLoading || !detail) {
    return (
      <div className="space-y-4">
        <div className="h-16 bg-card rounded-sm border border-white/5 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-card rounded-sm border border-white/5 animate-pulse" />)}
        </div>
      </div>
    );
  }

  // Destructure the response properly
  const user = detail.user;
  const transactions = detail.transactions ?? [];
  const investments = detail.investments ?? [];

  const handleStatusChange = (status: string) => {
    updateMutation.mutate({ id: userId, data: { status: status as "active" | "suspended" } });
  };

  const handleCredit = () => {
    const amount = parseFloat(creditAmount);
    if (!amount || amount <= 0) {
      toast({ variant: "destructive", title: "Invalid amount" });
      return;
    }
    creditMutation.mutate({ data: { userId, amount, type: creditType, notes: creditNote || "Admin credit" } });
  };

  const handleDeduct = () => {
    const amount = parseFloat(deductAmount);
    if (!amount || amount <= 0) {
      toast({ variant: "destructive", title: "Invalid amount" });
      return;
    }
    deductMutation.mutate({ data: { userId, amount, reason: deductReason || "Admin deduction" } });
  };

  return (
    <div className="space-y-6 pb-8 max-w-4xl">
      {/* Back + title */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white shrink-0">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-serif text-white truncate">{user.fullName}</h1>
          <p className="text-muted-foreground text-sm truncate">{user.email}</p>
        </div>
        <Button
          size="sm"
          onClick={() => impersonateMutation.mutate(userId)}
          disabled={impersonateMutation.isPending || user.role === "admin"}
          className="shrink-0 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-sm text-xs"
        >
          <LogIn className="w-3.5 h-3.5 mr-1.5" />
          {impersonateMutation.isPending ? "Switching…" : "Login as User"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: "Balance",        value: fmt(user.balance),       color: "text-primary" },
          { label: "Total Invested", value: fmt(user.totalInvested), color: "text-white" },
          { label: "Total Profit",   value: fmt(user.totalProfit),   color: "text-green-400" },
          { label: "Role",           value: user.role,               color: "text-white" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="bg-card border-white/5 rounded-sm">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
                <p className={`text-base md:text-xl font-serif capitalize ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Status management */}
        <Card className="bg-card border-white/5 rounded-sm">
          <CardHeader>
            <CardTitle className="font-serif text-lg text-white flex items-center gap-2">
              <UserCog className="w-5 h-5 text-primary" /> Account Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-sm">Current:</span>
              <Badge className={`rounded-sm capitalize text-xs border ${
                user.status === "active" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                "bg-red-500/10 text-red-400 border-red-500/20"
              }`}>{user.status}</Badge>
            </div>
            <Select onValueChange={handleStatusChange} defaultValue={user.status}>
              <SelectTrigger className="bg-background/50 border-white/10 text-white rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                <SelectItem value="active" className="text-white">Active</SelectItem>
                <SelectItem value="suspended" className="text-white">Suspended</SelectItem>
                <SelectItem value="pending" className="text-white">Pending</SelectItem>
              </SelectContent>
            </Select>
            <div className="pt-2 text-xs text-muted-foreground space-y-1">
              <p>Referral Code: <span className="text-primary font-mono">{user.referralCode}</span></p>
              <p>Joined: {format(new Date(user.createdAt), "MMMM d, yyyy")}</p>
              {user.country && <p>Country: {user.country}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Credit user */}
        <Card className="bg-card border-white/5 rounded-sm">
          <CardHeader>
            <CardTitle className="font-serif text-lg text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" /> Credit Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={creditType} onValueChange={v => setCreditType(v as typeof creditType)}>
              <SelectTrigger className="bg-background/50 border-white/10 text-white rounded-sm h-11">
                <SelectValue placeholder="Credit type" />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                <SelectItem value="bonus" className="text-white">Bonus</SelectItem>
                <SelectItem value="profit" className="text-white">Profit</SelectItem>
                <SelectItem value="deposit" className="text-white">Deposit</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                placeholder="0.00"
                value={creditAmount}
                onChange={e => setCreditAmount(e.target.value)}
                className="pl-7 bg-background/50 border-white/10 text-white rounded-sm h-11"
              />
            </div>
            <Input
              placeholder="Note (e.g. Profit payout, bonus)"
              value={creditNote}
              onChange={e => setCreditNote(e.target.value)}
              className="bg-background/50 border-white/10 text-white rounded-sm h-11"
            />
            <Button
              onClick={handleCredit}
              className="w-full bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 rounded-sm"
              disabled={creditMutation.isPending}
            >
              {creditMutation.isPending ? "Processing..." : "Credit Balance"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Deduct user */}
      <Card className="bg-card border-white/5 rounded-sm border-red-500/10">
        <CardHeader>
          <CardTitle className="font-serif text-lg text-white flex items-center gap-2">
            <MinusCircle className="w-5 h-5 text-red-400" /> Deduct Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                placeholder="0.00"
                value={deductAmount}
                onChange={e => setDeductAmount(e.target.value)}
                className="pl-7 bg-background/50 border-white/10 text-white rounded-sm h-11"
              />
            </div>
            <Input
              placeholder="Reason (e.g. Fee reversal, correction)"
              value={deductReason}
              onChange={e => setDeductReason(e.target.value)}
              className="bg-background/50 border-white/10 text-white rounded-sm h-11"
            />
            <Button
              onClick={handleDeduct}
              className="w-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-sm h-11"
              disabled={deductMutation.isPending}
            >
              {deductMutation.isPending ? "Processing..." : "Deduct Balance"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Current balance: <span className="text-white font-medium">{detail ? fmt(detail.user.balance) : "—"}</span>. Deduction cannot exceed balance.
          </p>
        </CardContent>
      </Card>

      {/* Active investments */}
      {investments.length > 0 && (
        <Card className="bg-card border-white/5 rounded-sm">
          <CardHeader>
            <CardTitle className="font-serif text-lg text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Investments ({investments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {investments.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-background border border-white/5 rounded-sm text-sm">
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{(inv as any).plan?.name ?? `Investment #${inv.id}`}</p>
                    <p className="text-xs text-muted-foreground">
                      Started {format(new Date(inv.startDate), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-primary font-medium">{fmt(inv.amount)}</p>
                    <span className={`text-xs ${
                      inv.status === "active" ? "text-green-400" :
                      inv.status === "completed" ? "text-blue-400" : "text-yellow-400"
                    } capitalize`}>{inv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent transactions */}
      {transactions.length > 0 && (
        <Card className="bg-card border-white/5 rounded-sm">
          <CardHeader>
            <CardTitle className="font-serif text-lg text-white flex items-center gap-2">
              <History className="w-5 h-5 text-primary" /> Transactions ({transactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {transactions.slice(0, 10).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-background border border-white/5 rounded-sm text-sm">
                  <div className="min-w-0">
                    <span className="text-white capitalize">{tx.type}</span>
                    {tx.notes && <span className="text-muted-foreground ml-2 text-xs">— {tx.notes}</span>}
                    <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(tx.createdAt), "MMM d, yyyy · h:mm a")}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-white font-medium">{fmt(tx.amount)}</p>
                    <span className={`text-xs ${tx.status === "completed" ? "text-green-400" : tx.status === "pending" ? "text-yellow-400" : "text-red-400"}`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
