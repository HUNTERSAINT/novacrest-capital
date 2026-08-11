import { useState } from "react";
import { useGetAdminStrategies, useCreateAdminStrategy, useUpdateAdminStrategy, useDeleteAdminStrategy } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { CopyTradingStrategy } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Copy, Plus, Edit2, Trash2, X, Check, Users, TrendingUp } from "lucide-react";

const blankStrategy = (): Partial<CopyTradingStrategy> => ({
  name: "", managerName: "", description: "", monthlyRoi: 5, riskLevel: "medium",
  minAmount: 100, winRate: 75, isActive: true,
});

const riskColor: Record<string, string> = {
  low: "bg-green-500/10 text-green-400 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  high: "bg-red-500/10 text-red-400 border-red-500/20",
};

function StrategyForm({ initial, onSave, onCancel, loading }: {
  initial: Partial<CopyTradingStrategy>;
  onSave: (v: Partial<CopyTradingStrategy>) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="bg-background/80 border border-white/10 rounded-sm p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Strategy Name *</Label>
          <Input value={form.name ?? ""} onChange={e => set("name", e.target.value)} className="bg-background border-white/10 text-white rounded-sm h-9 text-sm mt-1" placeholder="Alpha Growth" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Manager Name *</Label>
          <Input value={form.managerName ?? ""} onChange={e => set("managerName", e.target.value)} className="bg-background border-white/10 text-white rounded-sm h-9 text-sm mt-1" placeholder="James K." />
        </div>
        <div className="col-span-2">
          <Label className="text-xs text-muted-foreground">Description *</Label>
          <Input value={form.description ?? ""} onChange={e => set("description", e.target.value)} className="bg-background border-white/10 text-white rounded-sm h-9 text-sm mt-1" placeholder="Focuses on top 10 crypto assets with swing trading…" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Monthly ROI (%)</Label>
          <Input type="number" value={form.monthlyRoi ?? 5} onChange={e => set("monthlyRoi", parseFloat(e.target.value))} className="bg-background border-white/10 text-white rounded-sm h-9 text-sm mt-1" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Win Rate (%)</Label>
          <Input type="number" value={form.winRate ?? 75} onChange={e => set("winRate", parseFloat(e.target.value))} className="bg-background border-white/10 text-white rounded-sm h-9 text-sm mt-1" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Min Amount ($)</Label>
          <Input type="number" value={form.minAmount ?? 100} onChange={e => set("minAmount", parseFloat(e.target.value))} className="bg-background border-white/10 text-white rounded-sm h-9 text-sm mt-1" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Risk Level</Label>
          <select value={form.riskLevel ?? "medium"} onChange={e => set("riskLevel", e.target.value)}
            className="w-full mt-1 h-9 rounded-sm border border-white/10 bg-background text-white text-sm px-2">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="flex items-center gap-3 pt-3">
          <Switch checked={form.isActive ?? true} onCheckedChange={v => set("isActive", v)} />
          <Label className="text-sm text-muted-foreground">Active</Label>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={onCancel} className="border-white/10 text-muted-foreground hover:bg-white/5 rounded-sm text-xs">
          <X className="w-3 h-3 mr-1" /> Cancel
        </Button>
        <Button size="sm" onClick={() => onSave(form)} disabled={loading} className="bg-primary text-background hover:bg-primary/90 rounded-sm text-xs">
          <Check className="w-3 h-3 mr-1" /> {loading ? "Saving…" : "Save Strategy"}
        </Button>
      </div>
    </div>
  );
}

export default function AdminCopyTrading() {
  const { data } = useGetAdminStrategies();
  const createMutation = useCreateAdminStrategy();
  const updateMutation = useUpdateAdminStrategy();
  const deleteMutation = useDeleteAdminStrategy();
  const { toast } = useToast();

  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const strategies = data?.strategies ?? [];

  const handleCreate = (form: Partial<CopyTradingStrategy>) => {
    createMutation.mutate(form, {
      onSuccess: () => { toast({ title: "Strategy Created" }); setShowNew(false); },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleUpdate = (id: number, form: Partial<CopyTradingStrategy>) => {
    updateMutation.mutate({ id, ...form }, {
      onSuccess: () => { toast({ title: "Strategy Updated" }); setEditId(null); },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this strategy?")) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast({ title: "Deleted" }),
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-white">Copy Trading Strategies</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage portfolio strategies available to members.</p>
        </div>
        <Button onClick={() => setShowNew(true)} disabled={showNew}
          className="bg-primary text-background hover:bg-primary/90 rounded-sm text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Strategy
        </Button>
      </div>

      {showNew && (
        <Card className="bg-card border-primary/20 rounded-sm">
          <CardHeader><CardTitle className="text-white font-serif text-base">New Strategy</CardTitle></CardHeader>
          <CardContent>
            <StrategyForm initial={blankStrategy()} onSave={handleCreate} onCancel={() => setShowNew(false)} loading={createMutation.isPending} />
          </CardContent>
        </Card>
      )}

      {strategies.length === 0 ? (
        <Card className="bg-card border-white/5 rounded-sm">
          <CardContent className="py-16 text-center">
            <Copy className="w-12 h-12 text-primary/20 mx-auto mb-4" />
            <p className="text-muted-foreground">No strategies yet. Create your first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {strategies.map((strategy, i) => (
            <motion.div key={strategy.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
              {editId === strategy.id ? (
                <Card className="bg-card border-primary/20 rounded-sm">
                  <CardContent className="p-4">
                    <StrategyForm initial={strategy} onSave={(f) => handleUpdate(strategy.id, f)} onCancel={() => setEditId(null)} loading={updateMutation.isPending} />
                  </CardContent>
                </Card>
              ) : (
                <div className="flex items-center justify-between p-4 bg-card border border-white/5 rounded-sm hover:border-white/10 transition-colors group">
                  <div className="flex items-center gap-4 min-w-0">
                    <Copy className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">{strategy.name}</p>
                        {!strategy.isActive && <Badge className="text-xs rounded-sm border bg-white/5 text-muted-foreground border-white/10">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{strategy.managerName} · <span className="text-primary">+{strategy.monthlyRoi}% /mo</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Badge className={`hidden sm:flex text-xs rounded-sm border capitalize ${riskColor[strategy.riskLevel]}`}>{strategy.riskLevel}</Badge>
                    <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" />{strategy.followersCount}
                    </span>
                    <Button size="icon" variant="ghost" onClick={() => setEditId(strategy.id)} className="w-8 h-8 text-muted-foreground hover:text-white hover:bg-white/5 rounded-sm">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(strategy.id)} disabled={deleteMutation.isPending} className="w-8 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-sm">
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
