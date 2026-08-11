import { useState } from "react";
import { useGetStrategies, useGetMyCopyTrade, useJoinStrategy, useLeaveStrategy } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";
import { motion } from "framer-motion";
import { Copy, TrendingUp, Users, Shield, AlertTriangle, CheckCircle, Zap } from "lucide-react";

const riskColor = {
  low: "bg-green-500/10 text-green-400 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  high: "bg-red-500/10 text-red-400 border-red-500/20",
};

const riskIcon = {
  low: Shield,
  medium: AlertTriangle,
  high: Zap,
};

export default function CopyTrading() {
  const { user } = useAuth();
  const { data: strategiesData, isLoading } = useGetStrategies();
  const { data: myTradeData, isLoading: myLoading } = useGetMyCopyTrade();
  const joinMutation = useJoinStrategy();
  const leaveMutation = useLeaveStrategy();
  const { toast } = useToast();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");

  const strategies = strategiesData?.strategies ?? [];
  const myCopyTrade = myTradeData?.copyTrade;
  const myStrategy = myTradeData?.strategy;

  const handleJoin = (strategyId: number) => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid allocation amount.", variant: "destructive" });
      return;
    }
    joinMutation.mutate(
      { strategyId, allocatedAmount: amt },
      {
        onSuccess: (data) => {
          toast({ title: "Strategy Joined!", description: `You are now copying ${data.strategy.name}.` });
          setSelectedId(null);
          setAmount("");
        },
        onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleLeave = () => {
    leaveMutation.mutate(undefined, {
      onSuccess: () => toast({ title: "Strategy Left", description: "Your funds have been returned to your balance." }),
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  if (isLoading || myLoading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-48 bg-card rounded-sm animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-serif text-white">Copy Trading</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Mirror the trades of expert portfolio managers automatically.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-sm p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Copy trading involves risk. Past performance is not indicative of future results. Only allocate funds you can afford to risk.
        </p>
      </div>

      {/* Active Trade Status */}
      {myCopyTrade && myStrategy && (
        <Card className="bg-primary/5 border-primary/20 rounded-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Copy className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{myStrategy.name}</h3>
                    <Badge className="bg-primary/10 text-primary border-primary/20 rounded-sm text-xs border">Active</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Manager: {myStrategy.managerName}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Allocated: <span className="text-white font-medium">${myCopyTrade.allocatedAmount.toLocaleString()}</span>
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleLeave}
                disabled={leaveMutation.isPending}
                className="border-destructive/50 text-destructive hover:bg-destructive/10 rounded-sm shrink-0"
              >
                {leaveMutation.isPending ? "Leaving…" : "Leave Strategy"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategy Grid */}
      {strategies.length === 0 ? (
        <Card className="bg-card border-white/5 rounded-sm">
          <CardContent className="py-16 text-center">
            <Copy className="w-12 h-12 text-primary/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No strategies available at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {strategies.map((strategy, i) => {
            const RiskIcon = riskIcon[strategy.riskLevel];
            const isSelected = selectedId === strategy.id;
            const isMyStrategy = myCopyTrade?.strategyId === strategy.id;

            return (
              <motion.div
                key={strategy.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className={`bg-card border rounded-sm transition-all duration-200 h-full flex flex-col ${
                  isMyStrategy ? "border-primary/40" : "border-white/5 hover:border-white/15"
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-white font-serif text-base">{strategy.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">by {strategy.managerName}</p>
                      </div>
                      <Badge className={`rounded-sm text-xs border flex items-center gap-1 capitalize ${riskColor[strategy.riskLevel]}`}>
                        <RiskIcon className="w-3 h-3" />
                        {strategy.riskLevel}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">{strategy.description}</p>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-background/50 rounded-sm p-2 text-center">
                        <p className="text-xs text-muted-foreground">Monthly ROI</p>
                        <p className="text-sm font-bold text-primary">+{strategy.monthlyRoi}%</p>
                      </div>
                      <div className="bg-background/50 rounded-sm p-2 text-center">
                        <p className="text-xs text-muted-foreground">Win Rate</p>
                        <p className="text-sm font-bold text-white">{strategy.winRate}%</p>
                      </div>
                      <div className="bg-background/50 rounded-sm p-2 text-center">
                        <p className="text-xs text-muted-foreground">Followers</p>
                        <p className="text-sm font-bold text-white flex items-center justify-center gap-0.5">
                          <Users className="w-3 h-3" />{strategy.followersCount}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Min allocation: <span className="text-white">${strategy.minAmount.toLocaleString()}</span>
                    </p>

                    {isMyStrategy ? (
                      <div className="flex items-center gap-2 mt-auto">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span className="text-sm text-primary font-medium">Currently copying</span>
                      </div>
                    ) : isSelected ? (
                      <div className="space-y-2 mt-auto">
                        <Label className="text-xs text-muted-foreground">Allocation Amount (USD)</Label>
                        <Input
                          type="number"
                          placeholder={`Min $${strategy.minAmount}`}
                          value={amount}
                          onChange={e => setAmount(e.target.value)}
                          className="bg-background/50 border-white/10 text-white rounded-sm h-9 text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleJoin(strategy.id)}
                            disabled={joinMutation.isPending}
                            className="flex-1 bg-primary text-background hover:bg-primary/90 rounded-sm text-xs font-semibold"
                          >
                            {joinMutation.isPending ? "Joining…" : "Confirm"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setSelectedId(null); setAmount(""); }}
                            className="flex-1 border-white/10 text-muted-foreground hover:bg-white/5 rounded-sm text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => { if (!myCopyTrade) setSelectedId(strategy.id); }}
                        disabled={!!myCopyTrade}
                        className="mt-auto bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-sm text-xs font-semibold"
                      >
                        {myCopyTrade ? "Already Copying a Strategy" : "Copy This Strategy"}
                      </Button>
                    )}
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
