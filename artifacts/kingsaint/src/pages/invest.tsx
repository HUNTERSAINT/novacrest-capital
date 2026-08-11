import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGetPlan, useCreateInvestment, useGetMarketPrices, useGetWallets } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, Info, CheckCircle2, Copy } from "lucide-react";
import { motion } from "framer-motion";

// Fallback addresses if admin has not configured any wallets yet
const FALLBACK_WALLETS: Record<string, string> = {
  BTC:  "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  ETH:  "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  USDT: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  BNB:  "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  SOL:  "HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH",
  XRP:  "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
};

const investSchema = z.object({
  amount: z.coerce.number().min(1, "Amount is required"),
  cryptoType: z.enum(["BTC", "ETH", "USDT", "BNB", "SOL", "XRP"]),
});

export default function Invest() {
  const [match, params] = useRoute("/invest/:planId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const planId = parseInt(params?.planId || "0");
  
  const { data: plan, isLoading: isLoadingPlan } = useGetPlan(planId, {
    query: { enabled: !!planId }
  });
  
  const { data: prices } = useGetMarketPrices();
  const { data: walletData } = useGetWallets();

  // Build a crypto→address map from admin-configured wallets (or fallback)
  const walletMap: Record<string, string> = { ...FALLBACK_WALLETS };
  if (walletData && walletData.length > 0) {
    for (const w of walletData) {
      walletMap[w.cryptoType] = w.address;
    }
  }

  // Which crypto types have a configured wallet address
  const availableCryptos = Object.keys(walletMap).filter(k =>
    ["BTC", "ETH", "USDT", "BNB", "SOL", "XRP"].includes(k)
  );

  const [step, setStep] = useState<1 | 2>(1);
  const [cryptoAmount, setCryptoAmount] = useState<number>(0);
  
  const form = useForm<z.infer<typeof investSchema>>({
    resolver: zodResolver(investSchema),
    defaultValues: {
      amount: 0,
      cryptoType: "USDT"
    }
  });

  const amount = form.watch("amount");
  const cryptoType = form.watch("cryptoType");

  useEffect(() => {
    if (prices && amount && cryptoType) {
      const price = prices.find(p => p.symbol === cryptoType)?.price || 1;
      setCryptoAmount(amount / price);
    }
  }, [amount, cryptoType, prices]);

  const investMutation = useCreateInvestment({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Investment Request Received",
          description: "Please transfer the funds to complete activation.",
        });
        setStep(2);
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

  function onSubmit(values: z.infer<typeof investSchema>) {
    if (!plan) return;
    
    if (values.amount < plan.minAmount) {
      form.setError("amount", { message: `Minimum amount is $${plan.minAmount}` });
      return;
    }
    if (plan.maxAmount && values.amount > plan.maxAmount) {
      form.setError("amount", { message: `Maximum amount is $${plan.maxAmount}` });
      return;
    }

    const walletAddress = walletMap[values.cryptoType] ?? "";

    investMutation.mutate({
      data: {
        planId: plan.id,
        amount: values.amount,
        cryptoType: values.cryptoType,
        walletAddress,
      }
    });
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: "Copied to clipboard" });
  };

  if (isLoadingPlan) {
    return <div className="h-64 flex items-center justify-center">Loading plan details...</div>;
  }

  if (!plan) {
    return <div className="p-8 text-center text-red-500">Plan not found</div>;
  }

  const currentWalletAddress = walletMap[cryptoType] ?? "";

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-white mb-2">Fund Your Portfolio</h1>
        <p className="text-muted-foreground">You are investing in the {plan.name} ({plan.tier} tier).</p>
      </div>

      {step === 1 ? (
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
                                className="pl-8 bg-background/50 border-white/10 h-14 text-lg rounded-sm" 
                                {...field} 
                                onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
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

                    <FormField
                      control={form.control}
                      name="cryptoType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Funding Asset</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background/50 border-white/10 h-14 rounded-sm text-white">
                                <SelectValue placeholder="Select asset" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-card border-white/10 text-white">
                              <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                              <SelectItem value="ETH">Ethereum (ETH) — ERC20</SelectItem>
                              <SelectItem value="USDT">Tether (USDT)</SelectItem>
                              <SelectItem value="BNB">Binance Coin (BNB) — BEP20</SelectItem>
                              <SelectItem value="SOL">Solana (SOL)</SelectItem>
                              <SelectItem value="XRP">XRP</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="bg-primary/5 border border-primary/20 rounded-sm p-4 mt-6">
                      <div className="flex gap-3">
                        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="text-white font-medium mb-1">Expected Return Calculation</p>
                          <p className="text-muted-foreground mb-2">
                            A deposit of <strong>${(amount || 0).toLocaleString()}</strong> will generate{" "}
                            <strong>${((amount || 0) * (plan.roiPercent / 100)).toLocaleString()}</strong> in profit after {plan.durationDays} days.
                          </p>
                          <p className="text-primary font-medium">
                            Total Return: <strong>${((amount || 0) * (1 + plan.roiPercent / 100)).toLocaleString()}</strong>
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-14 text-base rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                      disabled={investMutation.isPending || !amount}
                    >
                      {investMutation.isPending ? "Processing..." : "Proceed to Funding"}
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
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="bg-card border-white/10 rounded-sm max-w-2xl mx-auto overflow-hidden">
            <div className="bg-primary/10 border-b border-primary/20 p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-serif text-white mb-2">Request Approved</h2>
              <p className="text-muted-foreground text-sm">Please send the exact amount to the address below to activate your portfolio.</p>
            </div>
            
            <CardContent className="p-8 space-y-8">
              <div className="text-center">
                <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Amount to Send</p>
                <p className="text-4xl font-mono text-white font-medium">
                  {cryptoAmount.toFixed(6)} <span className="text-xl text-primary">{cryptoType}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">≈ ${(amount || 0).toLocaleString()} USD</p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-white">Deposit Address ({cryptoType})</p>
                <div className="flex items-center gap-2 bg-background p-4 rounded-sm border border-white/10">
                  <code className="text-primary text-sm flex-1 break-all">{currentWalletAddress}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(currentWalletAddress)}
                    className="text-white hover:text-primary shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-sm flex gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <p>Send ONLY {cryptoType} to this address. Sending any other asset will result in permanent loss.</p>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 text-center">
                <p className="text-sm text-muted-foreground mb-6">
                  Your investment will be automatically activated after 3 network confirmations.
                </p>
                <Link href="/investments">
                  <Button className="rounded-sm bg-white/10 hover:bg-white/20 text-white w-full h-12">
                    View My Investments
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
