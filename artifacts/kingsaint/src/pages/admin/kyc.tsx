import { useState } from "react";
import { useGetAdminKyc, useUpdateKycStatus } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Shield, Clock, CheckCircle, XCircle,
  Download, Eye, X, ZoomIn, ChevronLeft, ChevronRight,
  FileImage, User, Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { useObjectUrl, downloadObject } from "@/hooks/use-object-url";

// ── helpers ────────────────────────────────────────────────────────────────────
const statusColor: Record<string, string> = {
  pending:  "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  approved: "bg-green-500/10  text-green-400  border-green-500/20",
  rejected: "bg-red-500/10    text-red-400    border-red-500/20",
};

const docLabel: Record<string, string> = {
  passport:        "Passport",
  national_id:     "National ID",
  drivers_license: "Driver's License",
};

// ── DocThumb ─────────────────────────────────────────────────────────────────
function DocThumb({
  objectPath, label, onExpand, onDownload,
}: {
  objectPath: string | null | undefined;
  label: string;
  onExpand: () => void;
  onDownload: () => void;
}) {
  const url = useObjectUrl(objectPath);
  if (!objectPath) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <div className="relative group w-full aspect-[4/3] bg-white/5 border border-white/10 rounded-sm overflow-hidden">
        {url ? (
          <img src={url} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileImage className="w-7 h-7 text-muted-foreground/40 animate-pulse" />
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={onExpand}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            title="View full size"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={onDownload}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({
  images,
  index,
  onClose,
  onChange,
}: {
  images: { path: string; label: string }[];
  index: number;
  onClose: () => void;
  onChange: (i: number) => void;
}) {
  const current = images[index];
  const url = useObjectUrl(current?.path);

  const handleDownload = () => {
    if (current?.path) {
      downloadObject(current.path, `kyc-${current.label.toLowerCase().replace(/\s+/g, "-")}.jpg`).catch(() => {});
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Controls bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-white text-sm font-medium">{current?.label}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-sm transition-colors border border-white/10"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>
          <button onClick={onClose} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="max-w-3xl max-h-[75vh] w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
        {url ? (
          <img src={url} alt={current?.label} className="max-w-full max-h-[75vh] object-contain rounded-sm shadow-2xl" />
        ) : (
          <div className="w-64 h-64 flex items-center justify-center">
            <FileImage className="w-16 h-16 text-white/20 animate-pulse" />
          </div>
        )}
      </div>

      {/* Nav arrows */}
      {images.length > 1 && (
        <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 pointer-events-none">
          <button
            className="pointer-events-auto p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors disabled:opacity-30"
            onClick={e => { e.stopPropagation(); onChange(index - 1); }}
            disabled={index === 0}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            className="pointer-events-auto p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors disabled:opacity-30"
            onClick={e => { e.stopPropagation(); onChange(index + 1); }}
            disabled={index === images.length - 1}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-6 flex gap-2" onClick={e => e.stopPropagation()}>
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => onChange(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === index ? "bg-primary w-5" : "bg-white/30"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── KYC Card ─────────────────────────────────────────────────────────────────
function KycCard({ kyc, index }: { kyc: any; index: number }) {
  const updateMutation = useUpdateKycStatus();
  const { toast } = useToast();
  const [notes, setNotes] = useState(kyc.adminNotes ?? "");
  const [lightbox, setLightbox] = useState<{ images: { path: string; label: string }[]; index: number } | null>(null);

  const isPending = kyc.status === "pending";

  const docs = [
    kyc.frontUrl  ? { path: kyc.frontUrl,  label: "Front" }  : null,
    kyc.backUrl   ? { path: kyc.backUrl,   label: "Back" }   : null,
    kyc.selfieUrl ? { path: kyc.selfieUrl, label: "Selfie" } : null,
  ].filter(Boolean) as { path: string; label: string }[];

  const openLightbox = (idx: number) => setLightbox({ images: docs, index: idx });

  const handle = (status: "approved" | "rejected") => {
    updateMutation.mutate(
      { id: kyc.id, status, adminNotes: notes },
      {
        onSuccess: () => toast({ title: status === "approved" ? "KYC Approved ✓" : "KYC Rejected", description: `${kyc.userFullName}'s documents have been ${status}.` }),
        onError:   (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleDownload = (doc: { path: string; label: string }) => {
    const ext = doc.path.includes(".") ? doc.path.split(".").pop() : "jpg";
    downloadObject(doc.path, `kyc-${kyc.userFullName?.replace(/\s/g, "-") ?? "user"}-${doc.label}.${ext}`)
      .catch(() => toast({ variant: "destructive", title: "Download failed", description: "Unable to download the document." }));
  };

  const handleDownloadAll = () => {
    docs.forEach((doc, i) => {
      setTimeout(() => {
        const ext = doc.path.includes(".") ? doc.path.split(".").pop() : "jpg";
        downloadObject(doc.path, `kyc-${kyc.userFullName?.replace(/\s/g, "-") ?? "user"}-${doc.label}.${ext}`).catch(() => {});
      }, i * 600);
    });
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
        <Card className={`bg-card rounded-sm ${isPending ? "border-yellow-500/20" : "border-white/5"}`}>
          <CardContent className="p-5 space-y-5">
            {/* Header row */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-white font-medium leading-tight">{kyc.userFullName ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{kyc.userEmail ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`text-xs rounded-sm border capitalize ${statusColor[kyc.status]}`}>{kyc.status}</Badge>
                <span className="text-xs text-muted-foreground bg-white/5 border border-white/10 rounded-sm px-2 py-0.5">
                  {docLabel[kyc.documentType] ?? kyc.documentType}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(kyc.submittedAt), "MMM d, yyyy")}
                </span>
              </div>
            </div>

            {/* Documents grid */}
            {docs.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Documents ({docs.length})</p>
                  <button
                    onClick={handleDownloadAll}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    <Download className="w-3 h-3" /> Download all
                  </button>
                </div>
                <div className={`grid gap-3 ${docs.length === 1 ? "grid-cols-1 max-w-[240px]" : docs.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                  {docs.map((doc, i) => (
                    <DocThumb
                      key={doc.path}
                      objectPath={doc.path}
                      label={doc.label}
                      onExpand={() => openLightbox(i)}
                      onDownload={() => handleDownload(doc)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Admin notes + actions (only for pending) */}
            {isPending && (
              <div className="space-y-3 pt-1 border-t border-white/5">
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Admin notes (optional — shown to user on rejection)"
                  className="bg-background/50 border-white/10 text-white text-sm placeholder:text-muted-foreground resize-none h-16 rounded-sm focus-visible:ring-primary/30"
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handle("approved")}
                    disabled={updateMutation.isPending}
                    className="bg-green-600 hover:bg-green-500 text-white rounded-sm text-xs h-8 px-4 gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handle("rejected")}
                    disabled={updateMutation.isPending}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-sm text-xs h-8 px-4 gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </Button>
                </div>
              </div>
            )}

            {/* Reviewed metadata */}
            {!isPending && (
              <div className="pt-1 border-t border-white/5 flex items-center gap-2 text-xs text-muted-foreground">
                {kyc.status === "approved"
                  ? <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                  : <Shield className="w-3.5 h-3.5 text-red-400" />}
                Reviewed {kyc.reviewedAt ? format(new Date(kyc.reviewedAt), "MMM d, yyyy 'at' h:mm a") : "—"}
                {kyc.adminNotes && <span className="ml-2 text-muted-foreground/70">· {kyc.adminNotes}</span>}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Lightbox portal */}
      <AnimatePresence>
        {lightbox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <Lightbox
              images={lightbox.images}
              index={lightbox.index}
              onClose={() => setLightbox(null)}
              onChange={i => setLightbox(prev => prev ? { ...prev, index: i } : null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminKyc() {
  const { data, isLoading } = useGetAdminKyc();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const kycs = data?.kycs ?? [];
  const pending  = kycs.filter(k => k.status === "pending");
  const approved = kycs.filter(k => k.status === "approved");
  const rejected = kycs.filter(k => k.status === "rejected");

  const displayed = filter === "all" ? kycs
    : filter === "pending"  ? pending
    : filter === "approved" ? approved
    : rejected;

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-serif text-white">KYC Review</h1>
        <p className="text-muted-foreground text-sm mt-1">Review, verify, and download member identity documents.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Pending",  value: pending.length,  color: "text-yellow-400", filter: "pending"  as const },
          { label: "Approved", value: approved.length, color: "text-green-400",  filter: "approved" as const },
          { label: "Rejected", value: rejected.length, color: "text-red-400",    filter: "rejected" as const },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setFilter(f => f === s.filter ? "all" : s.filter)}
            className={`p-4 text-center bg-card border rounded-sm transition-all ${
              filter === s.filter ? "border-primary/40 bg-primary/5" : "border-white/5 hover:border-white/10"
            }`}
          >
            <p className={`text-2xl font-serif font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white/5 rounded-sm p-1 w-fit">
        {(["all", "pending", "approved", "rejected"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-sm capitalize transition-colors font-medium ${
              filter === f ? "bg-card text-white" : "text-muted-foreground hover:text-white"
            }`}
          >
            {f} {f !== "all" && <span className="ml-1 opacity-60">
              {f === "pending" ? pending.length : f === "approved" ? approved.length : rejected.length}
            </span>}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-48 bg-card rounded-sm animate-pulse" />)}</div>
      ) : displayed.length === 0 ? (
        <Card className="bg-card border-white/5 rounded-sm">
          <CardContent className="py-16 text-center">
            <ShieldCheck className="w-12 h-12 text-primary/20 mx-auto mb-4" />
            <p className="text-muted-foreground">No {filter === "all" ? "" : filter} submissions.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayed.map((kyc, i) => (
            <KycCard key={kyc.id} kyc={kyc} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
