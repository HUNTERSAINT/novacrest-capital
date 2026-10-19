import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useGetMarketPrices } from "@workspace/api-client-react";
import { ActivityPopup } from "@/components/ActivityPopup";
import { ArrowRight, ShieldCheck, TrendingUp, LockKeyhole, Globe, Users, Star, CheckCircle2, Zap, BarChart3 } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "James Whitfield",
    role: "Portfolio Manager, New York",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face&auto=format",
    quote: "Novacrest delivered 18% ROI on my platinum plan in under 30 days. The transparency and reporting are unlike anything I've used before.",
    plan: "Platinum Prestige",
    stars: 5,
  },
  {
    name: "Sarah Chen",
    role: "Tech Entrepreneur, Singapore",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face&auto=format",
    quote: "I started with the Silver plan to test the waters. Within a month I upgraded to Gold — the returns are consistent and withdrawals are instant.",
    plan: "Gold Elite",
    stars: 5,
  },
  {
    name: "Marcus Johnson",
    role: "Hedge Fund Analyst, London",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face&auto=format",
    quote: "As someone who works in traditional finance, I was skeptical. Novacrest changed that. Their cold-storage custody and audit trail are genuinely institutional-grade.",
    plan: "Diamond Sovereign",
    stars: 5,
  },
  {
    name: "Olivia Brooks",
    role: "Real Estate Investor, Dubai",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face&auto=format",
    quote: "Diversifying into crypto felt risky until Novacrest. The dedicated advisor I got with my Platinum plan walked me through everything. Absolutely professional.",
    plan: "Platinum Prestige",
    stars: 5,
  },
  {
    name: "David Osei",
    role: "Business Owner, Lagos",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face&auto=format",
    quote: "I've referred 11 people to Novacrest. The referral bonuses alone pay for a portion of my monthly expenses. This platform is the real deal.",
    plan: "Gold Elite",
    stars: 5,
  },
  {
    name: "Priya Nair",
    role: "Investment Advisor, Mumbai",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face&auto=format",
    quote: "The dashboard alone is worth signing up for. Real-time tracking, beautiful charts, and the team responds within hours. My clients love it too.",
    plan: "Silver Growth",
    stars: 5,
  },
];

const STATS = [
  { value: "$1.4B+", label: "Assets Under Management" },
  { value: "52,000+", label: "Active Investors" },
  { value: "99.9%", label: "Platform Uptime" },
  { value: "6 Years", label: "Of Proven Excellence" },
];

export default function Home() {
  const { data: prices } = useGetMarketPrices();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <>
    <div className="flex flex-col w-full">

      {/* ── Hero ── */}
      <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1600&h=900&fit=crop&auto=format&q=80"
            alt=""
            className="w-full h-full object-cover opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background/97 to-background/75" />
          <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-primary/8 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full" />
        </div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-primary text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
              Exclusive Digital Asset Management
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif font-bold tracking-tight text-white leading-[1.1] mb-6 drop-shadow-lg">
              Wealth Without <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-yellow-200 to-primary">
                Compromise.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl font-light">
              Novacrest provides vault-grade security and exceptional returns for the uncompromising crypto investor.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm w-full sm:w-auto text-base h-14 px-8 border border-primary/50 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all">
                  Request Access
                </Button>
              </Link>
              <Link href="/plans">
                <Button size="lg" variant="outline" className="rounded-sm w-full sm:w-auto text-base h-14 px-8 border-white/20 hover:bg-white/5 text-white">
                  View Portfolios
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Crypto Ticker ── */}
      {prices && prices.length > 0 && (
        <div className="w-full bg-card border-y border-white/5 py-4 overflow-hidden relative z-20">
          <div className="flex whitespace-nowrap" style={{ animation: 'marquee 40s linear infinite' }}>
            {[...prices, ...prices].map((crypto, i) => (
              <div key={`ticker-${i}`} className="inline-flex items-center gap-3 px-8 border-r border-white/10 shrink-0">
                <span className="text-white font-medium">{crypto.symbol}</span>
                <span className="text-muted-foreground">${crypto.price.toLocaleString()}</span>
                <span className={`text-sm ${(crypto.changePercent24h ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {(crypto.changePercent24h ?? 0) >= 0 ? '+' : ''}{(crypto.changePercent24h ?? 0).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats Bar ── */}
      <section className="py-16 bg-card border-b border-white/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {STATS.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <p className="text-3xl md:text-4xl font-serif font-bold text-primary mb-1">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust & Security ── */}
      <section className="py-24 lg:py-32 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-6">
                Vault-Grade Security. <br />Institutional Trust.
              </h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                Your assets are protected by industry-leading multi-signature cold storage and strictly regulated custodial partners. We don't take chances with your wealth.
              </p>
              <div className="space-y-6">
                {[
                  { icon: ShieldCheck, title: "Cold Storage Custody", desc: "98% of all digital assets are held in offline, geographically distributed cold vaults." },
                  { icon: LockKeyhole, title: "Military-Grade Encryption", desc: "End-to-end AES-256 encryption secures every transaction and personal detail." },
                  { icon: Zap, title: "Real-Time Monitoring", desc: "24/7 automated threat detection with immediate response protocols across all systems." },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-4">
                    <div className="w-12 h-12 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-lg mb-1">{title}</h3>
                      <p className="text-muted-foreground text-sm">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative rounded-sm overflow-hidden border border-white/10"
            >
              <img
                src="https://images.unsplash.com/photo-1639762681057-408e52192e55?w=800&h=600&fit=crop&auto=format&q=80"
                alt="Secure vault technology"
                className="w-full h-64 lg:h-auto object-cover opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center gap-3 bg-black/60 backdrop-blur-sm border border-white/10 rounded-sm p-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Bank-Level Security</p>
                    <p className="text-muted-foreground text-xs">SOC 2 Type II Certified · ISO 27001</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="py-24 bg-card border-y border-white/5 relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-4">The Novacrest Advantage</h2>
            <p className="text-muted-foreground">Engineered for those who demand excellence in every aspect of their financial life.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[
              { icon: TrendingUp, title: "Market-Leading Yields", desc: "Our proprietary algorithmic trading and staking infrastructure delivers consistent, high-tier returns up to 25% per month." },
              { icon: Globe, title: "Global Accessibility", desc: "Manage your portfolio from anywhere in the world with zero border restrictions, 24/7 access, and multi-currency support." },
              { icon: Users, title: "Dedicated Advisory", desc: "Diamond and Platinum members receive priority support and bespoke portfolio strategy sessions with our wealth advisors." },
              { icon: BarChart3, title: "Real-Time Analytics", desc: "Interactive charts and live portfolio tracking let you monitor every dollar with precision and confidence." },
              { icon: Zap, title: "Instant Withdrawals", desc: "Your funds are always accessible. Request withdrawals 24/7 with same-day processing on verified accounts." },
              { icon: ShieldCheck, title: "Regulated & Audited", desc: "Fully compliant with international financial regulations. Independent quarterly audits ensure complete transparency." },
            ].map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
                className="bg-background border border-white/5 p-6 lg:p-8 rounded-sm hover:border-primary/30 transition-colors group"
              >
                <feat.icon className="w-10 h-10 text-primary mb-5 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg lg:text-xl font-medium text-white mb-3">{feat.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-4">Trusted by Investors Worldwide</h2>
            <p className="text-muted-foreground">Real results from real members of the Novacrest community.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
                className="bg-card border border-white/5 hover:border-primary/20 transition-colors rounded-sm p-6 flex flex-col gap-5"
              >
                {/* Stars */}
                <div className="flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, si) => (
                    <Star key={si} className="w-4 h-4 text-primary fill-primary" />
                  ))}
                </div>
                {/* Quote */}
                <p className="text-muted-foreground text-sm leading-relaxed flex-1">"{t.quote}"</p>
                {/* Plan badge */}
                <div className="inline-flex items-center gap-1.5 text-xs text-primary/80 bg-primary/10 px-2.5 py-1 rounded-full w-fit">
                  <CheckCircle2 className="w-3 h-3" />
                  {t.plan}
                </div>
                {/* Author */}
                <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-10 h-10 rounded-full object-cover border border-white/10"
                    loading="lazy"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter / Email Opt-in ── */}
      <section className="py-20 bg-card border-y border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-3">
                Stay Ahead of the Markets
              </h2>
              <p className="text-muted-foreground mb-8">
                Get exclusive market intelligence, new plan announcements, and portfolio tips delivered to your inbox every week.
              </p>

              {subscribed ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center gap-3 text-green-400 bg-green-500/10 border border-green-500/20 rounded-sm py-4 px-6"
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span className="font-medium">You're subscribed! Welcome to the Novacrest circle.</span>
                </motion.div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="flex-1 h-12 px-4 bg-background border border-white/10 focus:border-primary/50 focus:outline-none text-white placeholder:text-muted-foreground rounded-sm text-sm"
                  />
                  <Button
                    type="submit"
                    className="h-12 px-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm border border-primary/50 shadow-[0_0_15px_rgba(212,175,55,0.2)] whitespace-nowrap"
                  >
                    Subscribe Free
                  </Button>
                </form>
              )}
              <p className="text-xs text-muted-foreground/60 mt-4">No spam. Unsubscribe at any time.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 blur-[120px] rounded-full" />
        </div>
        <div className="container relative z-10 mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white mb-6">
            Ready to elevate your portfolio?
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto font-light">
            Join an exclusive network of investors commanding the future of digital wealth.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm text-lg h-16 px-10 border border-primary/50 shadow-[0_0_20px_rgba(212,175,55,0.3)] w-full sm:w-auto">
                Begin Your Journey <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/plans">
              <Button size="lg" variant="outline" className="rounded-sm text-base h-16 px-10 border-white/20 hover:bg-white/5 text-white w-full sm:w-auto">
                Explore Plans
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
    <ActivityPopup />
    </>
  );
}
