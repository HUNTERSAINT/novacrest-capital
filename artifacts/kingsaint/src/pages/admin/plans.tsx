import { useState } from "react";
import { useGetPlans, useCreatePlan, useUpdatePlan, useDeletePlan } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";

const planSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  minAmount: z.coerce.number().positive(),
  maxAmount: z.coerce.number().optional(),
  roiPercent: z.coerce.number().positive().max(100),
  durationDays: z.coerce.number().int().positive(),
  tier: z.enum(["bronze", "silver", "gold", "platinum", "diamond"]),
  isActive: z.boolean().default(true),
});

const tierColor: Record<string, string> = {
  bronze: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  silver: "text-gray-300 border-gray-300/30 bg-gray-300/10",
  gold: "text-primary border-primary/30 bg-primary/10",
  platinum: "text-cyan-300 border-cyan-300/30 bg-cyan-300/10",
  diamond: "text-blue-300 border-blue-300/30 bg-blue-300/10",
};

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

function PlanForm({ onSubmit, isPending, defaultValues }: {
  onSubmit: (values: any) => void;
  isPending: boolean;
  defaultValues?: any;
}) {
  const form = useForm<z.infer<typeof planSchema>>({
    resolver: zodResolver(planSchema),
    defaultValues: defaultValues ?? {
      name: "", description: "", minAmount: 100, roiPercent: 5, durationDays: 30, tier: "bronze", isActive: true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel className="text-white/80">Plan Name</FormLabel>
              <FormControl><Input className="bg-background/50 border-white/10 text-white rounded-sm" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="tier" render={({ field }) => (
            <FormItem><FormLabel className="text-white/80">Tier</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger className="bg-background/50 border-white/10 text-white rounded-sm"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent className="bg-card border-white/10">
                  {["bronze","silver","gold","platinum","diamond"].map(t => (
                    <SelectItem key={t} value={t} className="text-white capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel className="text-white/80">Description</FormLabel>
            <FormControl><Input className="bg-background/50 border-white/10 text-white rounded-sm" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="minAmount" render={({ field }) => (
            <FormItem><FormLabel className="text-white/80">Min Amount ($)</FormLabel>
              <FormControl><Input type="number" className="bg-background/50 border-white/10 text-white rounded-sm" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="maxAmount" render={({ field }) => (
            <FormItem><FormLabel className="text-white/80">Max Amount ($, optional)</FormLabel>
              <FormControl><Input type="number" placeholder="Unlimited" className="bg-background/50 border-white/10 text-white rounded-sm" {...field} value={field.value ?? ""} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="roiPercent" render={({ field }) => (
            <FormItem><FormLabel className="text-white/80">ROI (%)</FormLabel>
              <FormControl><Input type="number" step="0.1" className="bg-background/50 border-white/10 text-white rounded-sm" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="durationDays" render={({ field }) => (
            <FormItem><FormLabel className="text-white/80">Duration (days)</FormLabel>
              <FormControl><Input type="number" className="bg-background/50 border-white/10 text-white rounded-sm" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <Button type="submit" className="w-full bg-primary text-primary-foreground rounded-sm" disabled={isPending}>
          {isPending ? "Saving..." : defaultValues ? "Update Plan" : "Create Plan"}
        </Button>
      </form>
    </Form>
  );
}

export default function AdminPlans() {
  const { data: plans, isLoading } = useGetPlans();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<any>(null);

  const createMutation = useCreatePlan({
    mutation: {
      onSuccess: () => { queryClient.invalidateQueries(); setCreateOpen(false); toast({ title: "Plan created" }); },
      onError: (err) => toast({ variant: "destructive", title: "Error", description: err.message }),
    },
  });

  const updateMutation = useUpdatePlan({
    mutation: {
      onSuccess: () => { queryClient.invalidateQueries(); setEditPlan(null); toast({ title: "Plan updated" }); },
      onError: (err) => toast({ variant: "destructive", title: "Error", description: err.message }),
    },
  });

  const deleteMutation = useDeletePlan({
    mutation: {
      onSuccess: () => { queryClient.invalidateQueries(); toast({ title: "Plan deleted" }); },
      onError: (err) => toast({ variant: "destructive", title: "Error", description: err.message }),
    },
  });

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-white">Investment Plans</h1>
          <p className="text-muted-foreground text-sm mt-1">Create and manage all investment portfolios.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground rounded-sm border border-primary/50">
              <Plus className="w-4 h-4 mr-2" /> New Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-white/10 text-white max-w-lg">
            <DialogHeader><DialogTitle className="font-serif text-xl">Create Investment Plan</DialogTitle></DialogHeader>
            <PlanForm onSubmit={(v) => createMutation.mutate({ data: v })} isPending={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-card rounded-sm border border-white/5 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans?.map((plan, i) => (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card className="bg-card border-white/5 rounded-sm hover:border-white/10 transition-colors">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-white font-serif text-lg">{plan.name}</h3>
                      <p className="text-muted-foreground text-xs mt-0.5">{plan.description}</p>
                    </div>
                    <Badge className={`rounded-sm capitalize text-xs border ${tierColor[plan.tier] ?? ""}`}>{plan.tier}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center mb-4">
                    <div className="bg-background border border-white/5 rounded-sm p-2">
                      <p className="text-xs text-muted-foreground mb-0.5">ROI</p>
                      <p className="text-primary font-bold">{plan.roiPercent}%</p>
                    </div>
                    <div className="bg-background border border-white/5 rounded-sm p-2">
                      <p className="text-xs text-muted-foreground mb-0.5">Duration</p>
                      <p className="text-white font-medium">{plan.durationDays}d</p>
                    </div>
                    <div className="bg-background border border-white/5 rounded-sm p-2">
                      <p className="text-xs text-muted-foreground mb-0.5">Min</p>
                      <p className="text-white font-medium">{fmt(plan.minAmount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${plan.isActive ? "text-green-400" : "text-red-400"}`}>
                      {plan.isActive ? "● Active" : "○ Inactive"}
                    </span>
                    <div className="flex gap-2">
                      <Dialog open={editPlan?.id === plan.id} onOpenChange={(o) => !o && setEditPlan(null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="ghost" onClick={() => setEditPlan(plan)} className="text-muted-foreground hover:text-white">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-white/10 text-white max-w-lg">
                          <DialogHeader><DialogTitle className="font-serif text-xl">Edit Plan</DialogTitle></DialogHeader>
                          <PlanForm
                            onSubmit={(v) => updateMutation.mutate({ id: plan.id, data: v })}
                            isPending={updateMutation.isPending}
                            defaultValues={plan}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate({ id: plan.id })}
                        className="text-destructive/60 hover:text-destructive"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {plans?.length === 0 && (
        <Card className="bg-card border-white/5 rounded-sm">
          <CardContent className="py-16 flex flex-col items-center text-center">
            <Wallet className="w-12 h-12 text-primary/30 mb-4" />
            <p className="text-muted-foreground">No plans created yet. Click "New Plan" to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
