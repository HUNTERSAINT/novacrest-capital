import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateTransaction } from "@workspace/api-client-react";
import { useAuth } from "@/components/auth-provider";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ArrowUpRight, CheckCheck, AlertCircle } from "lucide-react";

const CURRENCIES = [
  { symbol: "BTC",  label: "Bitcoin (BTC)" },
  { symbol: "ETH",  label: "Ethereum (ETH) — ERC20" },
  { symbol: "USDT", label: "Tether (USDT)" },
  { symbol: "BNB",  label: "BNB Smart Chain (BNB)" },
  { symbol: "SOL",  label: "Solana (SOL)" },
  { symbol: "XRP",  label: "XRP" },
];

const schema = z.object({
  amount: z.coerce.number().positive("Amount must be positive").min(10, "Minimum withdrawal is $10"),
  walletAddress: z.string().min(10, "Enter a valid wallet address"),
  currency: z.string().min(1, "Select a currency"),
});

export default function Withdraw() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0, walletAddress: "", currency: "USDT" },
  });

  const mutation = useCreateTransaction({
    mutation: {
      onSuccess: () => {
        setSubmitted(true);
        queryClient.invalidateQueries();
        toast({ title: "Withdrawal requested", description: "Processing time: 1–24 hours." });
      },
      onError: (err) => toast({ variant: "destructive", title: "Error", description: err.message }),
    },
  });

  const onSubmit = (values: z.infer<typeof schema>) => {
    mutation.mutate({
      data: {
        type: "withdrawal",
        amount: values.amount,
        cryptoType: values.currency as any,
        walletAddress: values.walletAddress,
        notes: `${values.currency} withdrawal to ${values.walletAddress.slice(0, 12)}...`,
      },
    });
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto pt-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="bg-card border-white/5 rounded-sm text-center">
            <CardContent className="py-16">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <CheckCheck className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-serif text-white mb-2">Withdrawal Requested</h2>
              <p className="text-muted-foreground mb-8">
                Your withdrawal is being processed. Funds will arrive within 1–24 hours depending on network congestion.
              </p>
              <Button onClick={() => setSubmitted(false)} className="bg-primary text-primary-foreground rounded-sm">
                New Request
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-serif text-white">Withdraw Funds</h1>
        <p className="text-muted-foreground text-sm mt-1">Transfer your earnings to your external wallet.</p>
      </div>

      {/* Balance display */}
      <Card className="bg-primary/10 border-primary/30 rounded-sm">
        <CardContent className="py-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Available Balance</p>
            <p className="text-2xl font-serif text-white mt-1">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(user?.balance ?? 0)}
            </p>
          </div>
          <ArrowUpRight className="w-8 h-8 text-primary" />
        </CardContent>
      </Card>

      {(user?.balance ?? 0) < 10 && (
        <div className="flex items-start gap-3 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-sm">
          <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-200/70">
            You need a minimum balance of $10 to make a withdrawal. Earn profits through active investments first.
          </p>
        </div>
      )}

      <Card className="bg-card border-white/5 rounded-sm">
        <CardHeader>
          <CardTitle className="font-serif text-lg text-white">Withdrawal Details</CardTitle>
          <CardDescription>Withdrawals are typically processed within 1–24 hours.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Select Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-white/10 text-white rounded-sm h-12">
                          <SelectValue placeholder="Choose currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-white/10">
                        {CURRENCIES.map(c => (
                          <SelectItem key={c.symbol} value={c.symbol} className="text-white hover:bg-white/5">
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="walletAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Destination Wallet Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your external wallet address"
                        className="bg-background/50 border-white/10 focus:border-primary/50 text-white rounded-sm h-12 font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Amount (USD)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          max={user?.balance}
                          className="pl-7 bg-background/50 border-white/10 focus:border-primary/50 text-white rounded-sm h-12"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full h-12 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                disabled={mutation.isPending || (user?.balance ?? 0) < 10}
              >
                {mutation.isPending ? "Submitting..." : "Request Withdrawal"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
