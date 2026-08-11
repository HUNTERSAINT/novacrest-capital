import { useGetSignals } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Zap, Clock } from "lucide-react";
import { format } from "date-fns";

const actionColor = {
  buy: "bg-green-500/10 text-green-400 border-green-500/20",
  sell: "bg-red-500/10 text-red-400 border-red-500/20",
  hold: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

const statusColor = {
  active: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  expired: "bg-white/5 text-muted-foreground border-white/10",
};

const timeframeLabel = {
  short_term: "Short Term",
  mid_term: "Mid Term",
  long_term: "Long Term",
};

const ActionIcon = ({ action }: { action: string }) => {
  if (action === "buy") return <TrendingUp className="w-4 h-4" />;
  if (action === "sell") return <TrendingDown className="w-4 h-4" />;
  return <Minus className="w-4 h-4" />;
};

export default function Signals() {
  const { data, isLoading } = useGetSignals();
  const signals = data?.signals ?? [];
  const active = signals.filter(s => s.status === "active");
  const past = signals.filter(s => s.status !== "active");

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-serif text-white">Trading Signals</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Expert market signals from our analysis team. Not financial advice.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active Signals", value: active.length, color: "text-primary" },
          { label: "Buy Signals", value: signals.filter(s => s.action === "buy").length, color: "text-green-400" },
          { label: "Sell Signals", value: signals.filter(s => s.action === "sell").length, color: "text-red-400" },
        ].map(s => (
          <Card key={s.label} className="bg-card border-white/5 rounded-sm">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-serif font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1,2,3,4].map(i => <div key={i} className="h-48 bg-card rounded-sm animate-pulse" />)}
        </div>
      ) : active.length === 0 && past.length === 0 ? (
        <Card className="bg-card border-white/5 rounded-sm">
          <CardContent className="py-16 text-center">
            <Zap className="w-12 h-12 text-primary/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No signals published yet. Check back soon.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">
                Active Signals ({active.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {active.map((signal, i) => (
                  <motion.div
                    key={signal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="bg-card border-white/5 rounded-sm hover:border-primary/20 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-white text-base font-serif">{signal.title}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">{signal.asset}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <Badge className={`rounded-sm text-xs border flex items-center gap-1 capitalize ${actionColor[signal.action]}`}>
                              <ActionIcon action={signal.action} />
                              {signal.action}
                            </Badge>
                            <Badge className={`rounded-sm text-xs border capitalize ${statusColor[signal.status]}`}>
                              {signal.status}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: "Entry", value: signal.entryPrice },
                            { label: "Target", value: signal.targetPrice },
                            { label: "Stop Loss", value: signal.stopLoss },
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-background/50 rounded-sm p-2 text-center">
                              <p className="text-xs text-muted-foreground">{label}</p>
                              <p className="text-sm text-white font-medium">{value ?? "—"}</p>
                            </div>
                          ))}
                        </div>
                        {signal.notes && (
                          <p className="text-xs text-muted-foreground bg-background/50 rounded-sm p-2 leading-relaxed">
                            {signal.notes}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeframeLabel[signal.timeframe]}
                          </span>
                          <span>{format(new Date(signal.createdAt), "MMM d, yyyy")}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Past Signals
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {past.map((signal, i) => (
                  <motion.div key={signal.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <Card className="bg-card/50 border-white/5 rounded-sm opacity-70">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-white/70 text-sm font-serif">{signal.title}</CardTitle>
                            <p className="text-xs text-muted-foreground">{signal.asset}</p>
                          </div>
                          <div className="flex gap-1.5">
                            <Badge className={`rounded-sm text-xs border capitalize ${actionColor[signal.action]}`}>{signal.action}</Badge>
                            <Badge className={`rounded-sm text-xs border capitalize ${statusColor[signal.status]}`}>{signal.status}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">{format(new Date(signal.createdAt), "MMM d, yyyy")}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
