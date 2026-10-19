import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Wallet, Activity, CreditCard, Clock, ChevronRight, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard();

  if (isLoading || !dashboard) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-card rounded-sm border border-white/5 animate-pulse" />
          ))}
        </div>
        <div className="h-[400px] bg-card rounded-sm border border-white/5 animate-pulse" />
      </div>
    );
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="space-y-8 pb-8">
      {/* Hero Welcome */}
      <div className="relative rounded-sm overflow-hidden border border-white/10 bg-card">
        <div className="absolute inset-0">
          <img src="/attached_assets/growth.jpg" alt="Growth" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-card via-card/90 to-transparent" />
        </div>
        <div className="relative z-10 p-5 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif text-white mb-2">Portfolio Overview</h1>
            <p className="text-muted-foreground text-sm max-w-md">Track your wealth accumulation and active investments in real-time.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/deposit">
              <Button className="bg-white text-black hover:bg-white/90 rounded-sm text-sm h-9 md:h-10">
                <ArrowDownRight className="w-4 h-4 mr-1.5" /> Deposit
              </Button>
            </Link>
            <Link href="/plans">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm border border-primary/50 shadow-[0_0_15px_rgba(212,175,55,0.2)] text-sm h-9 md:h-10">
                <ArrowUpRight className="w-4 h-4 mr-1.5" /> Invest
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-card border-white/5 shadow-none rounded-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-muted-foreground flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" /> Total Balance
              </CardDescription>
              <CardTitle className="text-3xl font-serif text-white">{formatCurrency(dashboard.balance)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mt-2">Available for withdrawal</div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-card border-white/5 shadow-none rounded-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-500" /> Total Profit
              </CardDescription>
              <CardTitle className="text-3xl font-serif text-white">{formatCurrency(dashboard.totalProfit)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-green-500/80 mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Lifetime earnings
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-card border-white/5 shadow-none rounded-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-muted-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-500" /> Active Investments
              </CardDescription>
              <CardTitle className="text-3xl font-serif text-white">{formatCurrency(dashboard.totalInvested)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mt-2">{dashboard.activeInvestments} active plans</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="bg-card border-white/5 shadow-none rounded-sm">
          <CardHeader>
            <CardTitle className="font-serif text-xl text-white">Wealth Trajectory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full mt-4">
              {dashboard.investmentGrowth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboard.investmentGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="rgba(255,255,255,0.3)" 
                      fontSize={12} 
                      tickFormatter={(val) => format(new Date(val), 'MMM d')}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.3)" 
                      fontSize={12}
                      tickFormatter={(val) => `$${val.toLocaleString()}`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '0.25rem' }}
                      itemStyle={{ color: 'hsl(var(--primary))' }}
                      formatter={(value: number) => [formatCurrency(value), 'Portfolio Value']}
                      labelFormatter={(label) => format(new Date(label as string), 'MMM d, yyyy')}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground border border-dashed border-white/10 rounded-sm">
                  <Activity className="w-8 h-8 mb-2 opacity-50" />
                  <p>No growth data yet.</p>
                  <Link href="/plans"><Button variant="link" className="text-primary">Start investing</Button></Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="bg-card border-white/5 shadow-none rounded-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-serif text-xl text-white">Recent Activity</CardTitle>
            <Link href="/transactions">
              <Button variant="ghost" className="text-primary hover:text-primary/80 px-0">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {dashboard.recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {dashboard.recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 rounded-sm bg-background border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'deposit' ? 'bg-green-500/10 text-green-500' :
                        tx.type === 'withdrawal' ? 'bg-red-500/10 text-red-500' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {tx.type === 'deposit' ? <ArrowDownRight className="w-5 h-5" /> :
                         tx.type === 'withdrawal' ? <ArrowUpRight className="w-5 h-5" /> :
                         <TrendingUp className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white capitalize">{tx.type}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {format(new Date(tx.createdAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${
                        tx.type === 'deposit' || tx.type === 'profit' || tx.type === 'bonus' || tx.type === 'referral' 
                          ? 'text-green-500' 
                          : 'text-white'
                      }`}>
                        {tx.type === 'withdrawal' ? '-' : '+'}{formatCurrency(tx.amount)}
                      </p>
                      <p className={`text-xs uppercase tracking-wider ${
                        tx.status === 'completed' ? 'text-green-500' :
                        tx.status === 'pending' ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {tx.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent transactions.
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

