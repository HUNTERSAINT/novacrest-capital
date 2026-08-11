import { useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateTransaction, useGetWallets } from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ArrowDownLeft, Copy, CheckCheck, ShieldCheck, Loader2, AlertCircle, ImageIcon, X, CheckCircle2 } from "lucide-react";

const TOKEN_KEY = "novacrest_token";

const FALLBACK_WALLETS = [
  { id: 0, cryptoType: "BTC",  network: "Mainnet", label: "Bitcoin",        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", isActive: true, createdAt: "", updatedAt: "" },
  { id: 0, cryptoType: "ETH",  network: "ERC20",   label: "Ethereum",       address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", isActive: true, createdAt: "", updatedAt: "" },
  { id: 0, cryptoType: "USDT", network: "TRC20",   label: "Tether (TRC20)", address: "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9",      isActive: true, createdAt: "", updatedAt: "" },
  { id: 0, cryptoType: "BNB",  network: "BEP20",   label: "BNB Smart Chain",address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", isActive: true, createdAt: "", updatedAt: "" },
  { id: 0, cryptoType: "SOL",  network: "Mainnet", label: "Solana",         address: "HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH", isActive: true, createdAt: "", updatedAt: "" },
  { id: 0, cryptoType: "XRP",  network: "Mainnet", label: "XRP",            address: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",         isActive: true, createdAt: "", updatedAt: "" },
];

const cryptoColor: Record<string, string> = {
  BTC: "text-orange-400", ETH: "text-blue-400", USDT: "text-green-400",
  BNB: "text-yellow-400", SOL: "text-purple-400", XRP: "text-sky-400",
};

const schema = z.object({
  amount: z.coerce.number().positive("Amount must be positive").min(10, "Minimum deposit is $10"),
  notes: z.string().optional(),
});

/* ── Proof upload slot ─────────────────────────────────────────── */
function ProofUpload({ proofPath, onChange }: { proofPath: string | null; onChange: (p: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

  const { uploadFile, isUploading, progress } = useUpload({
    requestHeaders: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const handleFile = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setFileName(file.name);
    const result = await uploadFile(file);
    if (result) onChange(result.objectPath);
  }, [uploadFile, onChange]);

  const clear = () => {
    setPreview(null); setFileName(null); onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <p className="text-sm text-white/80 mb-1.5 font-medium">
        Payment Proof <span className="text-muted-foreground text-xs font-normal">(screenshot / receipt)</span>
      </p>

      {proofPath && preview ? (
        <div className="relative rounded-sm border border-white/10 overflow-hidden bg-background/50">
          <img src={preview} alt="proof" className="w-full h-28 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-2 gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            <span className="text-xs text-white truncate flex-1">{fileName}</span>
            <button type="button" onClick={clear} className="text-white/60 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !isUploading && inputRef.current?.click()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onDragOver={e => e.preventDefault()}
          className={`border-2 border-dashed rounded-sm p-4 text-center cursor-pointer transition-colors ${
            isUploading ? "border-primary/50 bg-primary/5" : "border-white/10 bg-background/50 hover:border-primary/40 hover:bg-primary/5"
          }`}
        >
          {isUploading ? (
            <div className="space-y-2">
              <Loader2 className="w-5 h-5 text-primary mx-auto animate-spin" />
              <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <ImageIcon className="w-5 h-5 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">
                <span className="text-primary font-medium">Click to upload</span> or drag & drop
              </p>
              <p className="text-[11px] text-muted-foreground/60">JPG, PNG, PDF</p>
            </div>
          )}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────── */
export default function Deposit() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [proofPath, setProofPath] = useState<string | null>(null);

  const { data: fetchedWallets, isLoading: walletsLoading } = useGetWallets();
  const wallets = (fetchedWallets && fetchedWallets.length > 0) ? fetchedWallets : FALLBACK_WALLETS;
  const selectedCrypto = wallets[Math.min(selectedIdx, wallets.length - 1)];

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0, notes: "" },
  });

  const mutation = useCreateTransaction({
    mutation: {
      onSuccess: () => {
        setSubmitted(true);
        queryClient.invalidateQueries();
        toast({ title: "Deposit request submitted", description: "Your deposit will be confirmed within 30–60 minutes." });
      },
      onError: (err) => toast({ variant: "destructive", title: "Error", description: err.message }),
    },
  });

  const copyAddress = () => {
    navigator.clipboard.writeText(selectedCrypto.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onSubmit = (values: z.infer<typeof schema>) => {
    mutation.mutate({
      data: {
        type: "deposit",
        amount: values.amount,
        cryptoType: selectedCrypto.cryptoType as any,
        notes: values.notes || `${selectedCrypto.cryptoType} deposit via ${selectedCrypto.network || "network"}`,
        proofUrl: proofPath ?? undefined,
      } as any,
    });
  };

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-serif text-white mb-2">Request Submitted</h2>
        <p className="text-muted-foreground text-sm">
          Your deposit has been recorded. Our team will confirm it within 30–60 minutes.
          {proofPath && " Your payment proof has been uploaded successfully."}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-white">Deposit Funds</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Send crypto to the address below, then submit your deposit details.
        </p>
      </div>

      {/* Coin selector */}
      <Card className="bg-card border-white/5 rounded-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-white font-serif text-base flex items-center gap-2">
            <ArrowDownLeft className="w-5 h-5 text-primary" />
            Select Network
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {wallets.filter(w => w.isActive).map((w, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedIdx(i)}
                className={`p-3 rounded-sm border text-sm font-medium transition-colors ${
                  selectedIdx === i
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-background/50 border-white/10 text-muted-foreground hover:border-white/20"
                }`}
              >
                <span className={`text-base block mb-0.5 ${cryptoColor[w.cryptoType] ?? ""}`}>{w.cryptoType}</span>
                <span className="text-[10px] text-muted-foreground">{w.network}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Wallet address */}
      <Card className="bg-card border-white/5 rounded-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-white font-serif text-base">{selectedCrypto?.label ?? "Wallet"} Address</CardTitle>
          <CardDescription>Send only {selectedCrypto?.cryptoType} on {selectedCrypto?.network} to this address</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 bg-background/50 border border-white/10 rounded-sm p-3">
            <code className="text-xs text-white/80 flex-1 break-all font-mono">{selectedCrypto?.address}</code>
            <button
              type="button"
              onClick={copyAddress}
              className="shrink-0 p-1.5 rounded-sm hover:bg-white/10 transition-colors text-muted-foreground hover:text-white"
            >
              {copied ? <CheckCheck className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-start gap-2 mt-3">
            <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Only send {selectedCrypto?.cryptoType} on the {selectedCrypto?.network} network. Sending any other asset will result in permanent loss.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card className="bg-card border-white/5 rounded-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-white font-serif text-base">Confirm Your Deposit</CardTitle>
          <CardDescription>Fill in the amount and upload your payment receipt</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Amount (USD Equivalent)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input type="number" step="0.01" className="pl-7 bg-background/50 border-white/10 focus:border-primary/50 text-white rounded-sm h-12" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment proof upload */}
              <ProofUpload proofPath={proofPath} onChange={setProofPath} />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Note (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={`${selectedCrypto?.cryptoType ?? "Crypto"} transfer`}
                        className="bg-background/50 border-white/10 focus:border-primary/50 text-white rounded-sm h-12"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                disabled={mutation.isPending || walletsLoading}
              >
                {mutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : "Confirm Deposit"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
