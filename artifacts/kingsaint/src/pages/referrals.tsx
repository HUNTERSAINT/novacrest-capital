import { useGetReferrals } from "@workspace/api-client-react";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Users, Copy, CheckCheck, Gift, Link as LinkIcon } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function Referrals() {
  const { user } = useAuth();
  const { data: referrals, isLoading } = useGetReferrals();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const referralLink = `${window.location.origin}/register?ref=${user?.referralCode}`;

  const copyCode = () => {
    navigator.clipboard.writeText(user?.referralCode ?? "");
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-serif text-white">Referral Program</h1>
        <p className="text-muted-foreground text-sm mt-1">Earn bonuses for every investor you bring to Novacrest.</p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { step: "01", title: "Share Your Link", desc: "Send your unique referral link or code to friends and colleagues." },
          { step: "02", title: "They Register", desc: "Your referral signs up using your code and makes their first investment." },
          { step: "03", title: "You Earn", desc: "Receive a bonus credited directly to your account balance." },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="bg-card border-white/5 rounded-sm">
              <CardContent className="pt-6">
                <span className="text-4xl font-serif font-bold text-primary/30">{s.step}</span>
                <h3 className="text-lg font-medium text-white mt-2 mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Your referral details */}
      <Card className="bg-card border-white/5 rounded-sm">
        <CardHeader>
          <CardTitle className="font-serif text-xl text-white flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary" /> Your Referral Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Referral Code</p>
            <div className="flex items-center gap-3 p-3 bg-background border border-white/5 rounded-sm">
              <code className="text-primary font-mono font-bold text-lg tracking-widest flex-1">
                {user?.referralCode}
              </code>
              <button onClick={copyCode} className="p-2 rounded-sm bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
                {copiedCode ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Referral Link</p>
            <div className="flex items-center gap-3 p-3 bg-background border border-white/5 rounded-sm">
              <span className="text-sm text-white/70 font-mono flex-1 truncate">{referralLink}</span>
              <button onClick={copyLink} className="p-2 rounded-sm bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
                {copiedLink ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {referrals && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-card border-white/5 rounded-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-muted-foreground text-sm uppercase tracking-wider">Total Referrals</span>
              </div>
              <p className="text-4xl font-serif text-white">{referrals.totalReferrals}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-white/5 rounded-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <Gift className="w-5 h-5 text-green-400" />
                <span className="text-muted-foreground text-sm uppercase tracking-wider">Total Bonus Earned</span>
              </div>
              <p className="text-4xl font-serif text-green-400">{fmt(referrals.totalBonusEarned)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Referred users list */}
      <Card className="bg-card border-white/5 rounded-sm">
        <CardHeader>
          <CardTitle className="font-serif text-xl text-white">Referred Members</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-background rounded-sm animate-pulse" />)}</div>
          ) : !referrals?.referredUsers.length ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-primary/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No referrals yet. Share your link to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.referredUsers.map((u, i) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-4 bg-background border border-white/5 rounded-sm"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{u.fullName}</p>
                    <p className="text-xs text-muted-foreground">Joined {format(new Date(u.createdAt), "MMM d, yyyy")}</p>
                  </div>
                  <span className={`text-xs uppercase tracking-wider px-2 py-1 rounded-sm ${
                    u.status === "active" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
                  }`}>{u.status}</span>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
