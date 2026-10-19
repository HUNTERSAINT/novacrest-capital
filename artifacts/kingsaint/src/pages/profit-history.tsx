import { useGetTransactions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Calendar } from "lucide-react";
import { format, subDays } from "date-fns";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

export default function ProfitHistory() {
  const { data, isLoading } = useGetTransactions();
  // useGetTransactions returns Transaction[] directly
  const transactions = Array.isArray(data) ? data : [];

  // All earning transactions
  const earning = transactions.filter(t => ["profit", "bonus"].includes(t.type) && t.status === "completed");

  // Build daily profit for last 30 days
  const days = Array.from({ length: 30 }, (_, i) => subDays(new Date(), 29 - i));
  const dailyMap = new Map<string, number>();
  earning.forEach(t => {
    const day = t.createdAt.split("T")[0];
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + t.amount);
  });

  const dailyData = days.map(d => ({
    date: format(d, "MMM d"),
    dateKey: format(d, "yyyy-MM-dd"),
    amount: dailyMap.get(format(d, "yyyy-MM-dd")) ?? 0,
  }));

  const maxAmount = Math.max(...dailyData.map(d => d.amount), 1);

  const totalProfit = earning.reduce((s, t) => s + t.amount, 0);
  const thisMonth = earning
    .filter(t => t.createdAt >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
    .reduce((s, t) => s + t.amount, 0);
  const profitTx = earning.filter(t => t.type === "profit");
  const bonusTx = earning.filter(t => t.type === "bonus");

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-card rounded-sm animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-serif text-white">Profit History</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your daily earnings and bonus history.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Earnings", value: fmt(totalProfit), icon: DollarSign, color: "text-primary" },
          { label: "This Month", value: fmt(thisMonth), icon: Calendar, color: "text-green-400" },
          { label: "Profit Entries", value: profitTx.length, icon: TrendingUp, color: "text-blue-400" },
          { label: "Bonus Entries", value: bonusTx.length, icon: TrendingUp, color: "text-yellow-400" },
        ].map(s => (
          <Card key={s.label} className="bg-card border-white/5 rounded-sm">
            <CardContent className="p-4">
              <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
              <p className={`text-xl font-serif font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 30-day chart */}
      <Card className="bg-card border-white/5 rounded-sm">
        <CardHeader>
          <CardTitle className="text-white font-serif text-lg">30-Day Earnings Chart</CardTitle>
        </CardHeader>
        <CardContent>
          {earning.length === 0 ? (
            <div className="py-12 text-center">
              <TrendingUp className="w-12 h-12 text-primary/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No earnings recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Bar chart */}
              <div className="flex items-end gap-1 h-32">
                {dailyData.map((d, i) => (
                  <div key={d.dateKey} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    <div className="absolute bottom-full mb-1 hidden group-hover:block bg-card border border-white/10 rounded px-2 py-1 text-xs text-white whitespace-nowrap z-10">
                      {d.date}: {fmt(d.amount)}
                    </div>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(d.amount / maxAmount) * 100}%` }}
                      transition={{ delay: i * 0.01, duration: 0.4 }}
                      className={`w-full rounded-sm min-h-[2px] ${d.amount > 0 ? "bg-primary" : "bg-white/5"}`}
                    />
                  </div>
                ))}
              </div>
              {/* X-axis labels */}
              <div className="flex gap-1">
                {dailyData.map((d, i) => (
                  <div key={d.dateKey} className="flex-1 text-center">
                    {i % 5 === 0 && <p className="text-xs text-muted-foreground/60 truncate">{d.date}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Log */}
      <Card className="bg-card border-white/5 rounded-sm">
        <CardHeader>
          <CardTitle className="text-white font-serif text-lg">Earnings Log</CardTitle>
        </CardHeader>
        <CardContent>
          {earning.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No earnings yet.</p>
          ) : (
            <div className="space-y-2">
              {earning.slice(0, 50).map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center justify-between p-3 bg-background border border-white/5 rounded-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${tx.type === "profit" ? "bg-primary" : "bg-yellow-400"}`} />
                    <div>
                      <p className="text-sm text-white capitalize font-medium">{tx.type}</p>
                      <p className="text-xs text-muted-foreground">{tx.notes ?? "—"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-400 font-semibold">+{fmt(tx.amount)}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(tx.createdAt), "MMM d, yyyy")}</p>
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
