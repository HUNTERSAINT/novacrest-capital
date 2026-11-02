import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Wallet, Activity, CalendarClock, Save, RefreshCw } from "lucide-react";

type InvestmentRow = {
  id: number; userId: number; planId: number; planName: string; planTier: string | null;
  amount: number; roiPercent: number; durationDays: number; status: string;
  startDate: string; endDate: string; profitEarned: number; createdAt: string;
  userName: string | null; userEmail: string | null;
};
type PlanGroup = {
  planId: number; planName: string; totalAmount: number; investmentCount: number;
  activeCount: number; investors: InvestmentRow[];
};
type Overview = {
  totalInvested: number; totalInvestments: number; activeInvestments: number;
  plans: PlanGroup[]; investments: InvestmentRow[];
};

const money = (n: number) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 2,
}).format(n);

function toLocalDateTimeInput(value: string): string {
  // Older investments store a date only; retain midnight as their editable time.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminInvestments() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [dates, setDates] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/investments", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not load investments");
      setData(await response.json());
    } catch (error) {
      toast({ variant: "destructive", title: "Unable to load investments", description: error instanceof Error ? error.message : "Please try again." });
    } finally { setLoading(false); }
  };

  useEffect(() => { if (token) void load(); }, [token]);

  const visibleRows = useMemo(() => {
    if (!data) return [];
    return selectedPlan === null ? data.investments : data.investments.filter(row => row.planId === selectedPlan);
  }, [data, selectedPlan]);

  const saveMaturity = async (row: InvestmentRow) => {
    const localDateTime = dates[row.id] ?? toLocalDateTimeInput(row.endDate);
    if (!localDateTime || Number.isNaN(new Date(localDateTime).getTime())) {
      toast({ variant: "destructive", title: "Invalid maturity date", description: "Choose a valid date and time before saving." });
      return;
    }
    const endDate = new Date(localDateTime).toISOString();
    setSavingId(row.id);
    try {
      const response = await fetch(`/api/admin/investments/${row.id}/maturity`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ endDate }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update maturity date");
      toast({ title: "Maturity date and time updated", description: `Investment #${row.id} now matures on ${new Date(result.endDate).toLocaleString()}.` });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Update failed", description: error instanceof Error ? error.message : "Please try again." });
    } finally { setSavingId(null); }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-serif text-white">Investment Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Review platform investment volume, plan participation and exact maturity dates and times.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading} className="border-white/10 text-white">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Invested", value: money(data?.totalInvested ?? 0), icon: Wallet },
          { label: "All Investments", value: String(data?.totalInvestments ?? 0), icon: Activity },
          { label: "Active Investments", value: String(data?.activeInvestments ?? 0), icon: Users },
        ].map(item => (
          <Card key={item.label} className="bg-card border-white/5 rounded-sm">
            <CardContent className="pt-5">
              <item.icon className="w-5 h-5 text-primary mb-3" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-serif text-white mt-1">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-serif text-white">Investment plans</h2>
          <Button size="sm" variant={selectedPlan === null ? "default" : "outline"} onClick={() => setSelectedPlan(null)}>All plans</Button>
        </div>
        {loading && !data ? <p className="text-sm text-muted-foreground">Loading investment records…</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {data?.plans.map(plan => (
              <button key={plan.planId} onClick={() => setSelectedPlan(plan.planId)}
                className={`text-left rounded-sm border p-4 transition-colors ${selectedPlan === plan.planId ? "border-primary bg-primary/5" : "border-white/10 bg-card hover:border-white/20"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-serif text-lg text-white">{plan.planName}</p>
                  <Badge variant="outline" className="border-white/10 text-white">{plan.investmentCount} investors</Badge>
                </div>
                <p className="text-2xl font-semibold text-primary mt-3">{money(plan.totalAmount)}</p>
                <p className="text-xs text-muted-foreground mt-1">{plan.activeCount} active investment(s)</p>
              </button>
            ))}
            {data?.plans.length === 0 && <p className="text-sm text-muted-foreground">No investments have been made yet.</p>}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-serif text-white">{selectedPlan === null ? "All investors" : `Investors in ${data?.plans.find(p => p.planId === selectedPlan)?.planName ?? "selected plan"}`}</h2>
        <div className="overflow-x-auto rounded-sm border border-white/10 bg-card">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3">Investor</th><th className="text-left p-3">Plan</th>
                <th className="text-right p-3">Amount</th><th className="text-left p-3">Started</th>
                <th className="text-left p-3">Matures</th><th className="text-left p-3">Status</th><th className="text-left p-3">Update maturity date & time</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(row => (
                <tr key={row.id} className="border-t border-white/5 align-middle">
                  <td className="p-3"><p className="text-white">{row.userName ?? `User #${row.userId}`}</p><p className="text-xs text-muted-foreground">{row.userEmail ?? "No email"}</p></td>
                  <td className="p-3 text-white">{row.planName}</td>
                  <td className="p-3 text-right text-white">{money(row.amount)}</td>
                  <td className="p-3 text-muted-foreground">{row.startDate}</td>
                  <td className="p-3 text-white">{row.endDate.length > 10 ? new Date(row.endDate).toLocaleString() : row.endDate}</td>
                  <td className="p-3"><Badge variant="outline" className="border-white/10 text-white capitalize">{row.status}</Badge></td>
                  <td className="p-3">
                    {row.status === "active" ? (
                      <div className="flex items-center gap-2">
                        <Input type="datetime-local" step="60" value={dates[row.id] ?? toLocalDateTimeInput(row.endDate)}
                          onChange={e => setDates(prev => ({ ...prev, [row.id]: e.target.value }))}
                          className="w-56 bg-background border-white/10 text-white" />
                        <Button size="icon" onClick={() => void saveMaturity(row)} disabled={savingId === row.id}
                          aria-label="Save maturity date and time" className="shrink-0">
                          {savingId === row.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </Button>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">Locked</span>}
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No investments in this view.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-2"><CalendarClock className="w-3.5 h-3.5" /> Choose the exact date and time. Times are interpreted in your device's local timezone, then stored consistently. Payouts run automatically once that time has passed.</p>
      </section>
    </div>
  );
}
