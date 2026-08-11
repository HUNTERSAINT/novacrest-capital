import { useGetAdminTransactions, useApproveTransaction, useRejectTransaction } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock, CreditCard } from "lucide-react";
import { format } from "date-fns";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

const statusColor: Record<string, string> = {
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

const typeColor: Record<string, string> = {
  deposit: "text-green-400",
  withdrawal: "text-red-400",
  profit: "text-primary",
  bonus: "text-blue-400",
  investment: "text-yellow-400",
};

export default function AdminTransactions() {
  const { data: transactions, isLoading } = useGetAdminTransactions();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const approveMutation = useApproveTransaction({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast({ title: "Transaction approved", description: "User balance updated." });
      },
      onError: (err) => toast({ variant: "destructive", title: "Error", description: err.message }),
    },
  });

  const rejectMutation = useRejectTransaction({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast({ title: "Transaction rejected" });
      },
      onError: (err) => toast({ variant: "destructive", title: "Error", description: err.message }),
    },
  });

  const pending = transactions?.filter(t => t.status === "pending") ?? [];
  const rest = transactions?.filter(t => t.status !== "pending") ?? [];

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-serif text-white">Transaction Approvals</h1>
        <p className="text-muted-foreground text-sm mt-1">Review and approve pending deposits and withdrawals.</p>
      </div>

      {/* Pending - urgent */}
      {pending.length > 0 && (
        <Card className="bg-card border-yellow-500/20 rounded-sm">
          <CardHeader>
            <CardTitle className="font-serif text-xl text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" /> Pending ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pending.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-background border border-white/5 rounded-sm"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-sm font-bold uppercase tracking-wide ${typeColor[tx.type] ?? "text-white"}`}>{tx.type}</span>
                      <span className="text-white font-medium">{fmt(tx.amount)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tx.userFullName ?? "Unknown"} · {tx.userEmail ?? ""}
                    </p>
                    {tx.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{tx.notes}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(tx.createdAt), "MMM d, yyyy · h:mm a")}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate({ id: tx.id })}
                      disabled={approveMutation.isPending}
                      className="bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 rounded-sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => rejectMutation.mutate({ id: tx.id, data: { reason: "Rejected by admin" } })}
                      disabled={rejectMutation.isPending}
                      className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-sm"
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All transactions */}
      <Card className="bg-card border-white/5 rounded-sm">
        <CardHeader>
          <CardTitle className="font-serif text-xl text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" /> Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-background rounded-sm animate-pulse" />)}</div>
          ) : rest.length === 0 && pending.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No transactions found.</div>
          ) : (
            <div className="space-y-2">
              {rest.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center justify-between p-3 bg-background border border-white/5 rounded-sm text-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold uppercase tracking-wider text-xs ${typeColor[tx.type] ?? "text-white"}`}>{tx.type}</span>
                      <span className="text-white">{fmt(tx.amount)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tx.userFullName ?? "Unknown"} · {format(new Date(tx.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Badge className={`rounded-sm capitalize text-xs border ${statusColor[tx.status] ?? ""}`}>
                    {tx.status}
                  </Badge>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
