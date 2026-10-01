import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGetPlan, useCreateInvestment } from "@workspace/api-client-react";
import { useAuth } from "@/components/auth-provider";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, Info, CheckCircle2 } from "lucide-react";

const investSchema = z.object({
  amount: z.string()
    .trim()
    .min(1, "Amount is required")
    .refine(value => Number.isFinite(Number(value)) && Number(value) > 0, "Enter a valid amount"),
});

export default function Invest() {
  const [, params] = useRoute("/invest/:planId");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const planId = parseInt(params?.planId || "0");
  
  const { data: plan, isLoading: isLoadingPlan } = useGetPlan(planId, {
    query: { queryKey: ["investment-plan", planId], enabled: !!planId }
  });

  const [completedInvestment, setCompletedInvestment] = useState<{ id: number; amount: number } | null>(null);
  
  const form = useForm<z.infer<typeof investSchema>>({
    resolver: zodResolver(investSchema),
    defaultValues: {
      amount: "",
    }
  });

  const amount = Number(form.watch("amount") || 0);

  const investMutation = useCreateInvestment({
    mutation: {
      onSuccess: (investment) => {
        setCompletedInvestment({ id: investment.id, amount: investment.amount });
        void queryClient.invalidateQueries();
        toast({
          title: "Investment activated",
          description: `$${investment.amount.toLocaleString()} was invested and deducted from your account balance.`,
        });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Investment Failed",
          description: error.message || "Something went wrong.",
        });
      }
    }
  });

  function onSubmit(values: z.output<typeof investSchema>) {
    if (!plan) return;
    const investmentAmount = Number(values.amount);
    
    if (investmentAmount < plan.minAmount) {
      form.setError("amount", { message: `Minimum amount is $${plan.minAmount}` });
      return;
    }
    if (plan.maxAmount && investmentAmount > plan.maxAmount) {
      form.setError("amount", { message: `Maximum amount is $${plan.maxAmount}` });
      return;
    }

    if (user && investmentAmount > user.balance) {
      form.setError("amount", { message: "Amount exceeds your available balance" });
      return;
    }

    investMutation.mutate({
      data: {
        planId: plan.id,
        amount: investmentAmount,
        cryptoType: "USD",
        walletAddress: "",
      }
    });
  }

  if (isLoadingPlan) {
    return <div className="h-64 flex items-center justify-center">Loading plan details...</div>;
  }

  if (!plan) {
    return <div className="p-8 text-center text-red-500">Plan not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-white mb-2">Invest in Your Portfolio</h1>
        <p className="text-muted-foreground">You are investing in the {plan.name} ({plan.tier} tier).</p>
      </div>

      {!completedInvestment ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="bg-card border-white/10 rounded-sm">
              <CardHeader>
                <CardTitle className="text-xl text-white">Investment Details</CardTitle>
                <CardDescription>Enter the amount you wish to allocate to this portfolio.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Amount (USD)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                              <Input 
                                type="number" 
                                min={plan.minAmount}
                                max={plan.maxAmount ?? undefined}
                                step="0.01"
                                inputMode="decimal"
                                placeholder="0.00"
                                className="pl-8 bg-background/50 border-white/10 h-14 text-lg rounded-sm"
                                {...field}
                                value={field.value ?? ""}
                                onChange={e => field.onChange(e.currentTarget.value)}
                              />
                            </div>
                          </FormControl>
                          <FormDescription className="text-muted-foreground text-xs">
                            Limits: ${plan.minAmount.toLocaleString()} - {plan.maxAmount ? `$${plan.maxAmount.toLocaleString()}` : 'Unlimited'}
                          </FormDescription>
                          <FormMessage className="text-destructive" />
                        </FormItem>
                      )}
                    />

                    <div className="bg-primary/5 border border-primary/20 rounded-sm p-4 mt-6">
                      <div className="flex gap-3">
                        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="text-white font-medium mb-1">Expected Return Calculation</p>
                          <p className="text-muted-foreground mb-2">
                            An investment of <strong>${(amount || 0).toLocaleString()}</strong> will generate{" "}
                            <strong>${((amount || 0) * (plan.roiPercent / 100)).toLocaleString()}</strong> in profit after {plan.durationDays} days.
                          </p>
                          <p className="text-primary font-medium">
                            Total Return: <strong>${((amount || 0) * (1 + plan.roiPercent / 100)).toLocaleString()}</strong>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-sm border border-white/10 bg-background/40 p-4 text-sm">
                      <span className="text-muted-foreground">Available balance</span>
                      <span className="font-semibold text-white">
                        ${(user?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-14 text-base rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                      disabled={investMutation.isPending || !user || !Number.isFinite(amount) || amount < plan.minAmount || amount > (user?.balance ?? 0) || (!!plan.maxAmount && amount > plan.maxAmount)}
                    >
                      {investMutation.isPending ? "Processing..." : "Invest from balance"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-card border-white/10 rounded-sm">
              <CardHeader>
                <CardTitle className="text-white text-lg">Portfolio Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="text-white font-medium">{plan.name}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="text-white font-medium">{plan.durationDays} Days</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-muted-foreground">ROI</span>
                  <span className="text-primary font-bold">{plan.roiPercent}%</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-muted-foreground">Security</span>
                  <span className="text-green-500 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3"/> Vault Secured
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="bg-card border-white/10 rounded-sm max-w-2xl mx-auto overflow-hidden">
          <div className="bg-primary/10 border-b border-primary/20 p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-serif text-white mb-2">Investment activated</h2>
            <p className="text-muted-foreground text-sm">
              ${completedInvestment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} has been deducted from your balance and added to your active investments.
            </p>
          </div>
          <CardContent className="p-8 space-y-6 text-center">
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Investment ID</p>
              <p className="font-mono text-white">#{completedInvestment.id}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Your updated balance and transaction history are available in your account.
            </p>
            <Link href="/investments">
              <Button className="rounded-sm bg-white/10 hover:bg-white/20 text-white w-full h-12">
                View My Investments
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
