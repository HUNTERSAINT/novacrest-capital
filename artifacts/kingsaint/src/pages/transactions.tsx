import { useGetTransactions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, TrendingUp, Gift, Clock, History } from "lucide-react";
import { format } from "date-fns";

const typeIcon: Record<string, React.ReactNode> = {
  deposit: <ArrowDownRight className="w-4 h-4" />,
  withdrawal: <ArrowUpRight className="w-4 h-4" />,
  profit: <TrendingUp className="w-4 h-4" />,
  bonus: <Gift className="w-4 h-4" />,
  referral: <Gift className="w-4 h-4" />,
  investment: <TrendingUp className="w-4 h-4" />,
};

const typeColor: Record<string, string> = {
  deposit: "bg-green-500/10 text-green-400",
  withdrawal: "bg-red-500/10 text-red-400",
  profit: "bg-primary/10 text-primary",
  bonus: "bg-blue-500/10 text-blue-400",
  referral: "bg-purple-500/10 text-purple-400",
  investment: "bg-yellow-500/10 text-yellow-400",
};

const statusColor: Record<string, string> = {
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

const isCredit = (type: string) => ["deposit", "profit", "bonus", "referral"].includes(type);

export default function Transactions() {
  const { data: transactions, isLoading } = useGetTransactions();

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-20 bg-card rounded-sm border border-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-serif text-white">Transaction History</h1>
        <p className="text-muted-foreground text-sm mt-1">A full record of your deposits, withdrawals, and earnings.</p>
      </div>

      <Card className="bg-card border-white/5 rounded-sm">
        <CardHeader>
          <CardTitle className="font-serif text-xl text-white flex items-center gap-2">
            <History className="w-5 h-5 text-primary" /> All Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!transactions || transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <History className="w-12 h-12 text-primary/30 mb-4" />
              <p className="text-muted-foreground">No transactions yet. Make a deposit to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between p-4 rounded-sm bg-background border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${typeColor[tx.type] ?? "bg-white/10 text-white"}`}>
                      {typeIcon[tx.type] ?? <Clock className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white capitalize">{tx.type}</p>
                      {tx.description && (
                        <p className="text-xs text-muted-foreground">{tx.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {format(new Date(tx.createdAt), "MMM d, yyyy · h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className={`text-sm font-bold ${isCredit(tx.type) ? "text-green-400" : "text-white"}`}>
                      {isCredit(tx.type) ? "+" : "-"}{fmt(tx.amount)}
                    </p>
                    <Badge className={`rounded-sm capitalize text-xs border ${statusColor[tx.status] ?? ""}`}>
                      {tx.status}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
