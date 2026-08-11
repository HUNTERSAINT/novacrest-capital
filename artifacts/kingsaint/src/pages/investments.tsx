import { useGetInvestments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { TrendingUp, Clock, ArrowUpRight, Wallet } from "lucide-react";
import { format } from "date-fns";

const statusColor: Record<string, string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

const tierGold = new Set(["platinum", "diamond"]);

export default function Investments() {
  const { data: investments, isLoading } = useGetInvestments();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-36 bg-card rounded-sm border border-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-white">My Portfolio</h1>
          <p className="text-muted-foreground text-sm mt-1">All your active and past investments.</p>
        </div>
        <Link href="/plans">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm border border-primary/50 shrink-0">
            <ArrowUpRight className="w-4 h-4 mr-2" /> New Investment
          </Button>
        </Link>
      </div>

      {!investments || investments.length === 0 ? (
        <Card className="bg-card border-white/5 rounded-sm">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
            <Wallet className="w-14 h-14 text-primary/40 mb-4" />
            <h3 className="text-xl font-serif text-white mb-2">No investments yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Start growing your wealth by selecting an investment plan.</p>
            <Link href="/plans">
              <Button className="bg-primary text-primary-foreground rounded-sm">Browse Plans</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {investments.map((inv, i) => {
            const isGold = tierGold.has(inv.plan?.tier ?? "");
            const progress = inv.plan
              ? Math.min(100, Math.round(
                  ((Date.now() - new Date(inv.startDate).getTime()) /
                    (inv.plan.durationDays * 86400000)) * 100
                ))
              : 0;

            return (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <Card className={`bg-card rounded-sm border ${isGold ? "border-primary/30" : "border-white/5"}`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="font-serif text-xl text-white">{inv.plan?.name ?? "Unknown Plan"}</CardTitle>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{inv.plan?.tier} tier</p>
                      </div>
                      <Badge className={`rounded-sm capitalize text-xs border ${statusColor[inv.status] ?? ""}`}>
                        {inv.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Principal</p>
                        <p className="text-white font-medium">{fmt(inv.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Expected Profit</p>
                        <p className="text-green-400 font-medium flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> {fmt(inv.expectedProfit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">ROI</p>
                        <p className="text-primary font-medium">{inv.plan?.roiPercent}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Maturity Date
                        </p>
                        <p className="text-white font-medium">
                          {inv.endDate ? format(new Date(inv.endDate), "MMM d, yyyy") : "—"}
                        </p>
                      </div>
                    </div>

                    {inv.status === "active" && (
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-2">
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground mt-4">
                      Started {format(new Date(inv.startDate), "MMM d, yyyy")}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
