import { useGetPlans } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Check, ShieldCheck } from "lucide-react";

export default function Plans() {
  const { data: plans, isLoading } = useGetPlans();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-[500px] bg-card rounded-sm border border-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  const activePlans = plans?.filter(p => p.isActive) || [];

  return (
    <div className="py-12">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">Investment Portfolios</h1>
        <p className="text-lg text-muted-foreground">Select a portfolio tier tailored to your wealth accumulation goals. All plans are backed by our secure institutional framework.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 max-w-7xl mx-auto px-4">
        {activePlans.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex h-full"
          >
            <Card className={`w-full flex flex-col bg-background border ${
              plan.tier === 'diamond' || plan.tier === 'platinum' ? 'border-primary/50 shadow-[0_0_30px_rgba(212,175,55,0.15)] relative' : 'border-white/10'
            } rounded-sm overflow-hidden`}>
              {(plan.tier === 'diamond' || plan.tier === 'platinum') && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
              )}
              
              <CardHeader className="text-center pb-8 pt-10">
                <div className="uppercase tracking-widest text-primary text-xs font-bold mb-2">
                  {plan.tier} Tier
                </div>
                <CardTitle className="text-3xl font-serif text-white">{plan.name}</CardTitle>
                <div className="mt-6 flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold tracking-tighter text-white">{plan.roiPercent}%</span>
                  <span className="text-muted-foreground font-medium">ROI</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">After {plan.durationDays} Days</p>
              </CardHeader>
              
              <CardContent className="flex-1">
                <div className="flex justify-between items-center py-4 border-y border-white/5 mb-6">
                  <div className="text-center w-1/2 border-r border-white/5">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Min. Deposit</div>
                    <div className="text-white font-medium">${plan.minAmount.toLocaleString()}</div>
                  </div>
                  <div className="text-center w-1/2">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Max. Deposit</div>
                    <div className="text-white font-medium">{plan.maxAmount ? `$${plan.maxAmount.toLocaleString()}` : 'Unlimited'}</div>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-white/80">
                      <Check className="w-5 h-5 text-primary shrink-0" />
                      <span className="leading-snug">{feature}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-3 text-sm text-white/80">
                    <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                    <span className="leading-snug">Principal Return Guaranteed</span>
                  </li>
                </ul>
              </CardContent>

              <CardFooter className="pt-4 pb-8">
                <Link href={`/invest/${plan.id}`} className="w-full">
                  <Button className={`w-full h-12 rounded-sm text-base font-medium ${
                    plan.tier === 'diamond' || plan.tier === 'platinum' 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                    : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                  }`}>
                    Select Portfolio
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
