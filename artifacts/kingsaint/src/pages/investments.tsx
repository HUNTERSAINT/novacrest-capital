import { useGetInvestments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { TrendingUp, Clock, ArrowUpRight, Wallet, AlertTriangle } from "lucide-react";
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
            const isGold = tierGold.has(inv.planTier ?? "");
            const durationMs = inv.durationDays * 86400000;
            const progress = durationMs > 0
              ? Math.min(100, Math.max(0, Math.round(
                  ((Date.now() - new Date(inv.startDate).getTime()) / durationMs) * 100
                )))
              : 0;
            const expectedProfit = inv.amount * inv.roiPercent / 100;

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
                        <CardTitle className="font-serif text-xl text-white">{inv.planName}</CardTitle>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{inv.planTier ?? "Standard"} tier</p>
                      </div>
                      <Badge className={`rounded-sm capitalize text-xs border ${statusColor[inv.status] ?? ""}`}>
                        {inv.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {inv.slowSignalActive && (
                      <div role="alert" className="relative isolate mb-5 overflow-hidden rounded-xl border border-red-500/55 bg-gradient-to-br from-[#3b080d] via-[#21070b] to-[#12070a] p-4 text-red-50 shadow-[0_10px_30px_rgba(220,38,38,0.16)] md:p-5">
                        <div aria-hidden="true" className="pointer-events-none absolute -right-7 -top-9 h-36 w-36 rounded-full border border-red-400/10">
                          <div className="absolute inset-4 rounded-full border border-red-400/15">
                            <div className="absolute inset-4 rounded-full border border-red-400/20" />
                          </div>
                        </div>
                        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-red-500/[0.08] to-transparent" />
                        <div className="relative flex items-start gap-3 md:gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-400/30 bg-red-500/15 text-red-300 shadow-[inset_0_0_18px_rgba(248,113,113,0.12)] md:h-12 md:w-12">
                            <div className="relative">
                              <AlertTriangle className="h-6 w-6" strokeWidth={2.2} />
                              <span className="absolute -right-2 -top-2 h-2 w-2 animate-pulse rounded-full bg-red-400 ring-4 ring-red-500/15" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-300/80">Investment status alert</span>
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-200">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> Attention
                              </span>
                            </div>
                            <p className="mt-1 text-lg font-black leading-tight tracking-wide text-white md:text-xl">LOW SIGNAL <span className="text-red-300">MODE</span></p>
                            <p className="mt-2 text-sm leading-relaxed text-red-100/85">This investment has a signal delay. Contact support for details about your investment status.</p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Principal</p>
                        <p className="text-white font-medium">{fmt(inv.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Expected Profit</p>
                        <p className="text-green-400 font-medium flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> {fmt(expectedProfit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">ROI</p>
                        <p className="text-primary font-medium">{inv.roiPercent}%</p>
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
