import { useState } from "react";
import { useGetSignals, useCreateAdminSignal, useUpdateAdminSignal, useDeleteAdminSignal } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { TradingSignal } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Zap, Plus, Edit2, Trash2, TrendingUp, TrendingDown, Minus, X, Check } from "lucide-react";
import { format } from "date-fns";

const blank = (): Partial<TradingSignal> => ({
  title: "", asset: "", action: "buy", timeframe: "short_term", status: "active",
  entryPrice: "", targetPrice: "", stopLoss: "", notes: "",
});

const actionColor: Record<string, string> = {
  buy: "bg-green-500/10 text-green-400 border-green-500/20",
  sell: "bg-red-500/10 text-red-400 border-red-500/20",
  hold: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

const statusColor: Record<string, string> = {
  active: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  expired: "bg-white/5 text-muted-foreground border-white/10",
};

function SignalForm({ initial, onSave, onCancel, loading }: {
  initial: Partial<TradingSignal>;
  onSave: (v: Partial<TradingSignal>) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="bg-background/80 border border-white/10 rounded-sm p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs text-muted-foreground">Title *</Label>
          <Input value={form.title ?? ""} onChange={e => set("title", e.target.value)} className="bg-background border-white/10 text-white rounded-sm h-9 text-sm mt-1" placeholder="BTC Bullish Breakout" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Asset *</Label>
          <Input value={form.asset ?? ""} onChange={e => set("asset", e.target.value)} className="bg-background border-white/10 text-white rounded-sm h-9 text-sm mt-1" placeholder="BTC/USD" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Action</Label>
          <select value={form.action ?? "buy"} onChange={e => set("action", e.target.value)}
            className="w-full mt-1 h-9 rounded-sm border border-white/10 bg-background text-white text-sm px-2">
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
            <option value="hold">Hold</option>
          </select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Entry Price</Label>
          <Input value={form.entryPrice ?? ""} onChange={e => set("entryPrice", e.target.value)} className="bg-background border-white/10 text-white rounded-sm h-9 text-sm mt-1" placeholder="$65,000" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Target Price</Label>
          <Input value={form.targetPrice ?? ""} onChange={e => set("targetPrice", e.target.value)} className="bg-background border-white/10 text-white rounded-sm h-9 text-sm mt-1" placeholder="$72,000" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Stop Loss</Label>
          <Input value={form.stopLoss ?? ""} onChange={e => set("stopLoss", e.target.value)} className="bg-background border-white/10 text-white rounded-sm h-9 text-sm mt-1" placeholder="$62,000" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Timeframe</Label>
          <select value={form.timeframe ?? "short_term"} onChange={e => set("timeframe", e.target.value)}
            className="w-full mt-1 h-9 rounded-sm border border-white/10 bg-background text-white text-sm px-2">
            <option value="short_term">Short Term</option>
            <option value="mid_term">Mid Term</option>
            <option value="long_term">Long Term</option>
          </select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Status</Label>
          <select value={form.status ?? "active"} onChange={e => set("status", e.target.value)}
            className="w-full mt-1 h-9 rounded-sm border border-white/10 bg-background text-white text-sm px-2">
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div className="col-span-2">
          <Label className="text-xs text-muted-foreground">Notes</Label>
          <Input value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} className="bg-background border-white/10 text-white rounded-sm h-9 text-sm mt-1" placeholder="Additional context…" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={onCancel} className="border-white/10 text-muted-foreground hover:bg-white/5 rounded-sm text-xs">
          <X className="w-3 h-3 mr-1" /> Cancel
        </Button>
        <Button size="sm" onClick={() => onSave(form)} disabled={loading} className="bg-primary text-background hover:bg-primary/90 rounded-sm text-xs">
          <Check className="w-3 h-3 mr-1" /> {loading ? "Saving…" : "Save Signal"}
        </Button>
      </div>
    </div>
  );
}

export default function AdminSignals() {
  const { data } = useGetSignals();
  const createMutation = useCreateAdminSignal();
  const updateMutation = useUpdateAdminSignal();
  const deleteMutation = useDeleteAdminSignal();
  const { toast } = useToast();

  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const signals = data?.signals ?? [];

  const handleCreate = (form: Partial<TradingSignal>) => {
    createMutation.mutate(form, {
      onSuccess: () => { toast({ title: "Signal Created" }); setShowNew(false); },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleUpdate = (id: number, form: Partial<TradingSignal>) => {
    updateMutation.mutate({ id, ...form }, {
      onSuccess: () => { toast({ title: "Signal Updated" }); setEditId(null); },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this signal?")) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast({ title: "Deleted" }),
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-white">Trading Signals</h1>
          <p className="text-muted-foreground text-sm mt-1">Publish and manage market signals for members.</p>
        </div>
        <Button onClick={() => setShowNew(true)} disabled={showNew}
          className="bg-primary text-background hover:bg-primary/90 rounded-sm text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Signal
        </Button>
      </div>

      {showNew && (
        <Card className="bg-card border-primary/20 rounded-sm">
          <CardHeader><CardTitle className="text-white font-serif text-base">New Signal</CardTitle></CardHeader>
          <CardContent>
            <SignalForm initial={blank()} onSave={handleCreate} onCancel={() => setShowNew(false)} loading={createMutation.isPending} />
          </CardContent>
        </Card>
      )}

      {signals.length === 0 ? (
        <Card className="bg-card border-white/5 rounded-sm">
          <CardContent className="py-16 text-center">
            <Zap className="w-12 h-12 text-primary/20 mx-auto mb-4" />
            <p className="text-muted-foreground">No signals yet. Create your first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {signals.map((signal, i) => (
            <motion.div key={signal.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
              {editId === signal.id ? (
                <Card className="bg-card border-primary/20 rounded-sm">
                  <CardContent className="p-4">
                    <SignalForm initial={signal} onSave={(f) => handleUpdate(signal.id, f)} onCancel={() => setEditId(null)} loading={updateMutation.isPending} />
                  </CardContent>
                </Card>
              ) : (
                <div className="flex items-center justify-between p-4 bg-card border border-white/5 rounded-sm hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{signal.title}</p>
                      <p className="text-xs text-muted-foreground">{signal.asset} · {format(new Date(signal.createdAt), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Badge className={`hidden sm:flex text-xs rounded-sm border items-center gap-1 capitalize ${actionColor[signal.action]}`}>
                      {signal.action === "buy" ? <TrendingUp className="w-3 h-3" /> : signal.action === "sell" ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      {signal.action}
                    </Badge>
                    <Badge className={`hidden sm:flex text-xs rounded-sm border capitalize ${statusColor[signal.status]}`}>{signal.status}</Badge>
                    <Button size="icon" variant="ghost" onClick={() => setEditId(signal.id)} className="w-8 h-8 text-muted-foreground hover:text-white hover:bg-white/5 rounded-sm">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(signal.id)} disabled={deleteMutation.isPending} className="w-8 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-sm">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
