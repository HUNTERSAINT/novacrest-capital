import { useState, useRef, useCallback } from "react";
import { useGetMyKyc, useSubmitKyc } from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, ShieldCheck, ShieldAlert, Clock, FileText,
  CheckCircle2, Upload, X, ImageIcon, Loader2,
} from "lucide-react";

const TOKEN_KEY = "novacrest_token";

const statusConfig = {
  pending:  { icon: Clock,        color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20",  label: "Under Review" },
  approved: { icon: ShieldCheck,  color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20",    label: "Verified"     },
  rejected: { icon: ShieldAlert,  color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20",        label: "Rejected"     },
};

const docTypes = [
  { value: "passport",        label: "Passport" },
  { value: "national_id",     label: "National ID" },
  { value: "drivers_license", label: "Driver's License" },
];

/* ------------------------------------------------------------------ */
/*  Single file-upload slot                                            */
/* ------------------------------------------------------------------ */
interface FileSlotProps {
  label: string;
  required?: boolean;
  hint?: string;
  objectPath: string | null;
  onChange: (path: string | null) => void;
}

function FileSlot({ label, required, hint, objectPath, onChange }: FileSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview]   = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

  const { uploadFile, isUploading, progress } = useUpload({
    requestHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    onError: (err) => alert(`Upload failed: ${err.message}`),
  });

  const handleFile = useCallback(
    async (file: File) => {
      // local preview
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
      setFileName(file.name);

      const result = await uploadFile(file);
      if (result) onChange(result.objectPath);
    },
    [uploadFile, onChange],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const clear = () => {
    setPreview(null);
    setFileName(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <p className="text-sm text-white mb-1.5 font-medium">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
        {hint && <span className="text-muted-foreground text-xs ml-1.5 font-normal">{hint}</span>}
      </p>

      {objectPath && preview ? (
        /* ---- preview card ---- */
        <div className="relative rounded-sm border border-white/10 overflow-hidden bg-background/50">
          <img src={preview} alt={label} className="w-full h-36 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-2 gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            <span className="text-xs text-white truncate flex-1">{fileName}</span>
            <button onClick={clear} className="text-white/60 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* ---- drop zone ---- */
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !isUploading && inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-sm p-6 text-center cursor-pointer transition-colors
            ${isUploading
              ? "border-primary/50 bg-primary/5"
              : "border-white/10 bg-background/50 hover:border-primary/40 hover:bg-primary/5"}
          `}
        >
          {isUploading ? (
            <div className="space-y-2">
              <Loader2 className="w-6 h-6 text-primary mx-auto animate-spin" />
              <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">
                <span className="text-primary font-medium">Click to upload</span> or drag & drop
              </p>
              <p className="text-xs text-muted-foreground/60">JPG, PNG, PDF — max 10 MB</p>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                           */
/* ------------------------------------------------------------------ */
export default function KYCPage() {
  const { data, isLoading } = useGetMyKyc();
  const submitMutation      = useSubmitKyc();
  const { toast }           = useToast();
  const kyc                 = data?.kyc;

  const [docType,   setDocType]   = useState("passport");
  const [frontPath, setFrontPath] = useState<string | null>(null);
  const [backPath,  setBackPath]  = useState<string | null>(null);
  const [selfiePath, setSelfiePath] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontPath) {
      toast({ title: "Required", description: "Please upload the front of your document.", variant: "destructive" });
      return;
    }
    submitMutation.mutate(
      {
        documentType: docType as "passport" | "national_id" | "drivers_license",
        frontUrl: frontPath,
        backUrl:  backPath  ?? undefined,
        selfieUrl: selfiePath ?? undefined,
      },
      {
        onSuccess: () => toast({ title: "KYC Submitted", description: "Your documents are under review. We'll notify you within 24 hours." }),
        onError:   (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      },
    );
  };

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-card rounded-sm animate-pulse" />)}</div>;
  }

  const StatusIcon = kyc ? statusConfig[kyc.status].icon : Shield;

  return (
    <div className="space-y-6 pb-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-serif text-white">Identity Verification</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Complete KYC to unlock full withdrawal privileges and premium investment tiers.
        </p>
      </div>

      {/* Status banner */}
      {kyc ? (
        <Card className={`border rounded-sm ${statusConfig[kyc.status].bg}`}>
          <CardContent className="p-6 flex items-start gap-4">
            <StatusIcon className={`w-8 h-8 ${statusConfig[kyc.status].color} shrink-0 mt-0.5`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-white">{statusConfig[kyc.status].label}</h3>
                <Badge className={`text-xs rounded-sm border capitalize ${statusConfig[kyc.status].bg} ${statusConfig[kyc.status].color}`}>
                  {kyc.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {kyc.status === "pending"  && "Your documents are being reviewed. This typically takes 1–24 hours."}
                {kyc.status === "approved" && "Your identity has been successfully verified. You have full access to all features."}
                {kyc.status === "rejected" && `Your verification was rejected. ${kyc.adminNotes ?? "Please resubmit with clearer documents."}`}
              </p>
              {kyc.reviewedAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  Reviewed: {new Date(kyc.reviewedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-white/5 rounded-sm">
          <CardContent className="p-6 flex items-start gap-4">
            <Shield className="w-8 h-8 text-primary/50 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white mb-1">Not Verified</h3>
              <p className="text-sm text-muted-foreground">
                Submit your identity documents to verify your account and unlock higher limits.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Benefits */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Unlimited Withdrawals" },
          { label: "Premium Plan Access"   },
          { label: "Priority Support"      },
        ].map(({ label }) => (
          <div key={label} className="bg-card border border-white/5 rounded-sm p-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Submission form */}
      {(!kyc || kyc.status === "rejected") && (
        <Card className="bg-card border-white/5 rounded-sm">
          <CardHeader>
            <CardTitle className="text-white font-serif text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {kyc?.status === "rejected" ? "Resubmit Documents" : "Submit Documents"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Doc type selector */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Document Type</p>
                <div className="grid grid-cols-3 gap-2">
                  {docTypes.map(dt => (
                    <button
                      key={dt.value}
                      type="button"
                      onClick={() => setDocType(dt.value)}
                      className={`p-2.5 rounded-sm border text-xs font-medium transition-colors ${
                        docType === dt.value
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-background/50 border-white/10 text-muted-foreground hover:border-white/20"
                      }`}
                    >
                      {dt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload slots */}
              <div className="space-y-5">
                <FileSlot
                  label="Front of Document"
                  required
                  objectPath={frontPath}
                  onChange={setFrontPath}
                />
                <FileSlot
                  label="Back of Document"
                  hint="(optional)"
                  objectPath={backPath}
                  onChange={setBackPath}
                />
                <FileSlot
                  label="Selfie with Document"
                  hint="(optional but recommended)"
                  objectPath={selfiePath}
                  onChange={setSelfiePath}
                />
              </div>

              <div className="bg-background/50 border border-white/5 rounded-sm p-3 flex items-start gap-2">
                <Upload className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Files are uploaded securely and stored encrypted. Only our compliance team can access them for review.
                </p>
              </div>

              <Button
                type="submit"
                disabled={submitMutation.isPending || !frontPath}
                className="w-full bg-primary text-background hover:bg-primary/90 rounded-sm font-semibold"
              >
                {submitMutation.isPending ? "Submitting…" : "Submit for Review"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
