import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/custom-fetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Search, Users, CheckCircle2, AlertCircle } from "lucide-react";

type Recipient = { id: number; fullName: string; email: string; status: string };
type Audience = "all" | "active" | "selected";

async function loadRecipients() {
  return customFetch<{ users: Recipient[] }>("/api/admin/email/recipients");
}
async function sendCampaign(payload: { audience: Audience; userIds: number[]; subject: string; message: string }) {
  return customFetch<{ total: number; sent: number; failed: number; failures: Array<{ email: string; error: string }> }>("/api/admin/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export default function AdminEmail() {
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-email-recipients"], queryFn: loadRecipients });
  const [audience, setAudience] = useState<Audience>("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof sendCampaign>> | null>(null);
  const recipients = data?.users ?? [];
  const activeCount = recipients.filter(user => user.status === "active").length;
  const filtered = useMemo(() => recipients.filter(user =>
    user.fullName.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  ), [recipients, search]);
  const recipientCount = audience === "all" ? recipients.length : audience === "active" ? activeCount : selectedIds.length;

  const mutation = useMutation({
    mutationFn: sendCampaign,
    onSuccess: response => setResult(response),
    onMutate: () => setResult(null),
  });

  const toggleUser = (id: number) => setSelectedIds(current =>
    current.includes(id) ? current.filter(value => value !== id) : [...current, id]
  );
  const selectVisible = () => {
    const visibleIds = filtered.map(user => user.id);
    setSelectedIds(current => Array.from(new Set([...current, ...visibleIds])));
  };

  const handleSend = () => {
    if (!subject.trim() || !message.trim() || recipientCount < 1 || mutation.isPending) return;
    const confirmed = window.confirm(`Send this email to ${recipientCount} member${recipientCount === 1 ? "" : "s"}?`);
    if (!confirmed) return;
    mutation.mutate({ audience, userIds: audience === "selected" ? selectedIds : [], subject: subject.trim(), message: message.trim() });
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-sm bg-primary/10 flex items-center justify-center"><Mail className="w-5 h-5 text-primary" /></div>
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-white">Mail Centre</h1>
          <p className="text-sm text-muted-foreground mt-1">Send announcements and account updates to NovaCrest members.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-card border-white/5 rounded-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Members</p><p className="text-2xl text-white font-serif mt-1">{isLoading ? "—" : recipients.length}</p></CardContent></Card>
        <Card className="bg-card border-white/5 rounded-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Active members</p><p className="text-2xl text-green-400 font-serif mt-1">{isLoading ? "—" : activeCount}</p></CardContent></Card>
        <Card className="bg-card border-white/5 rounded-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Selected recipients</p><p className="text-2xl text-primary font-serif mt-1">{recipientCount}</p></CardContent></Card>
      </div>

      <Card className="bg-card border-white/5 rounded-sm">
        <CardHeader><CardTitle className="text-white font-serif">Compose email</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div>
            <label className="block text-xs text-muted-foreground mb-2 uppercase tracking-wide">Recipients</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {([{value:"all",label:"All members"},{value:"active",label:"Active members"},{value:"selected",label:"Choose members"}] as const).map(option => (
                <button key={option.value} type="button" onClick={() => setAudience(option.value)} className={`rounded-sm border px-3 py-3 text-sm text-left transition-colors ${audience === option.value ? "border-primary bg-primary/10 text-primary" : "border-white/10 bg-background text-muted-foreground hover:border-white/20"}`}>
                  <Users className="w-4 h-4 mb-2" />{option.label}
                </button>
              ))}
            </div>
          </div>

          {audience === "selected" && (
            <div className="rounded-sm border border-white/10 p-3 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search members by name or email" className="pl-9 bg-background border-white/10 text-white" />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={selectVisible}>Select visible</Button>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filtered.map(user => (
                  <label key={user.id} className="flex items-center gap-3 p-2 rounded-sm hover:bg-white/5 cursor-pointer">
                    <input type="checkbox" checked={selectedIds.includes(user.id)} onChange={() => toggleUser(user.id)} className="accent-primary h-4 w-4" />
                    <span className="min-w-0 flex-1"><span className="block text-sm text-white truncate">{user.fullName}</span><span className="block text-xs text-muted-foreground truncate">{user.email}</span></span>
                    <Badge variant="outline" className="capitalize text-[10px]">{user.status}</Badge>
                  </label>
                ))}
                {!isLoading && filtered.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No members match your search.</p>}
              </div>
              <p className="text-xs text-muted-foreground">{selectedIds.length} selected</p>
            </div>
          )}

          <div>
            <label className="block text-xs text-muted-foreground mb-2 uppercase tracking-wide">Subject</label>
            <Input value={subject} onChange={event => setSubject(event.target.value)} maxLength={180} placeholder="e.g. Important NovaCrest announcement" className="bg-background border-white/10 text-white" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-2 uppercase tracking-wide">Message</label>
            <textarea value={message} onChange={event => setMessage(event.target.value)} maxLength={10000} rows={9} placeholder="Write your email message here..." className="w-full rounded-sm border border-white/10 bg-background px-3 py-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y" />
            <p className="text-right text-[11px] text-muted-foreground mt-1">{message.length}/10,000</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/5 pt-4">
            <p className="text-xs text-muted-foreground">From: support@novacrestfi.com · Each member receives a private email.</p>
            <Button onClick={handleSend} disabled={isLoading || !!error || !subject.trim() || !message.trim() || recipientCount < 1 || mutation.isPending} className="bg-primary text-background hover:bg-primary/90">
              {mutation.isPending ? "Sending..." : <><Send className="w-4 h-4 mr-2" />Send to {recipientCount}</>}
            </Button>
          </div>
          {error && <p role="alert" className="text-sm text-red-300">Could not load member list. Refresh and try again.</p>}
          {mutation.isError && <p role="alert" className="text-sm text-red-300">The email request failed. Please try again.</p>}
          {result && (
            <div role="status" className="rounded-sm border border-white/10 bg-background p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-white"><CheckCircle2 className="w-4 h-4 text-green-400" />Sending completed</div>
              <p className="text-sm text-muted-foreground">{result.sent} of {result.total} emails accepted by Resend. {result.failed} failed.</p>
              {result.failures.length > 0 && <div className="space-y-1"><p className="text-xs text-amber-300 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Failed recipients</p>{result.failures.map(item => <p key={item.email} className="text-xs text-muted-foreground">{item.email}: {item.error}</p>)}</div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
