import { useState } from "react";
import { useGetAdminUsers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Search, ChevronRight, Users } from "lucide-react";
import { format } from "date-fns";

const statusColor: Record<string, string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  suspended: "bg-red-500/10 text-red-400 border-red-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

export default function AdminUsers() {
  const { data, isLoading } = useGetAdminUsers();
  const [search, setSearch] = useState("");

  // API returns { users: [...], total: number }
  const users = data?.users ?? [];

  const filtered = users.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-serif text-white">Member Management</h1>
        <p className="text-muted-foreground text-sm mt-1">View and manage all platform members.</p>
      </div>

      <Card className="bg-card border-white/5 rounded-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 bg-background/50 border-white/10 text-white rounded-sm h-10"
              />
            </div>
            <div className="text-sm text-muted-foreground whitespace-nowrap">
              {filtered.length} member{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-background rounded-sm animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-primary/30 mx-auto mb-4" />
              <p className="text-muted-foreground">{users.length === 0 ? "No members found." : "No results for your search."}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((u, i) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link href={`/admin/users/${u.id}`}>
                    <div className="flex items-center justify-between p-4 bg-background border border-white/5 rounded-sm hover:border-white/15 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-serif font-bold text-lg">
                          {u.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white group-hover:text-primary transition-colors">{u.fullName}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="hidden md:block text-right">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Balance</p>
                          <p className="text-sm text-white font-medium">{fmt(u.balance)}</p>
                        </div>
                        <div className="hidden md:block text-right">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Joined</p>
                          <p className="text-sm text-muted-foreground">{format(new Date(u.createdAt), "MMM d, yyyy")}</p>
                        </div>
                        <Badge className={`rounded-sm capitalize text-xs border ${statusColor[u.status] ?? ""}`}>
                          {u.status}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
