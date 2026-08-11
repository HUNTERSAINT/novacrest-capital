import { useState } from "react";
import {
  useGetAdminWallets,
  useCreateAdminWallet,
  useUpdateAdminWallet,
  useDeleteAdminWallet,
} from "@workspace/api-client-react";
import type { WalletAddress, WalletAddressInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Wallet, Check, X, Copy, CheckCheck } from "lucide-react";

const CRYPTO_OPTIONS = ["BTC", "ETH", "USDT", "BNB", "SOL", "XRP"];

const cryptoColor: Record<string, string> = {
  BTC: "text-orange-400 bg-orange-400/10",
  ETH: "text-blue-400 bg-blue-400/10",
  USDT: "text-green-400 bg-green-400/10",
  BNB: "text-yellow-400 bg-yellow-400/10",
  SOL: "text-purple-400 bg-purple-400/10",
  XRP: "text-sky-400 bg-sky-400/10",
};

const NETWORK_SUGGESTIONS: Record<string, string> = {
  BTC: "Mainnet", ETH: "ERC20", USDT: "TRC20", BNB: "BEP20", SOL: "Mainnet", XRP: "Mainnet",
};

const LABEL_SUGGESTIONS: Record<string, string> = {
  BTC: "Bitcoin", ETH: "Ethereum", USDT: "Tether (TRC20)", BNB: "BNB Smart Chain", SOL: "Solana", XRP: "XRP",
};

interface FormState {
  cryptoType: string;
  network: string;
  label: string;
  address: string;
  isActive: boolean;
}

const emptyForm = (): FormState => ({ cryptoType: "BTC", network: "Mainnet", label: "Bitcoin", address: "", isActive: true });

export default function AdminWallets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addForm, setAddForm] = useState<FormState>(emptyForm());
  const [editForm, setEditForm] = useState<FormState>(emptyForm());
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { data: wallets, isLoading } = useGetAdminWallets();

  const createMutation = useCreateAdminWallet({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin", "wallets"] });
        queryClient.invalidateQueries({ queryKey: ["wallets"] });
        setShowAdd(false);
        setAddForm(emptyForm());
        toast({ title: "Wallet added" });
      },
      onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message }),
    },
  });

  const updateMutation = useUpdateAdminWallet({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin", "wallets"] });
        queryClient.invalidateQueries({ queryKey: ["wallets"] });
        setEditingId(null);
        toast({ title: "Wallet updated" });
      },
      onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message }),
    },
  });

  const deleteMutation = useDeleteAdminWallet({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin", "wallets"] });
        queryClient.invalidateQueries({ queryKey: ["wallets"] });
        toast({ title: "Wallet removed" });
      },
      onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message }),
    },
  });

  const handleCryptoChange = (type: string, target: "add" | "edit") => {
    const update = {
      cryptoType: type,
      network: NETWORK_SUGGESTIONS[type] ?? "",
      label: LABEL_SUGGESTIONS[type] ?? type,
    };
    if (target === "add") setAddForm(f => ({ ...f, ...update }));
    else setEditForm(f => ({ ...f, ...update }));
  };

  const startEdit = (wallet: WalletAddress) => {
    setEditingId(wallet.id);
    setEditForm({
      cryptoType: wallet.cryptoType,
      network: wallet.network,
      label: wallet.label,
      address: wallet.address,
      isActive: wallet.isActive,
    });
  };

  const copyAddress = (wallet: WalletAddress) => {
    navigator.clipboard.writeText(wallet.address);
    setCopiedId(wallet.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const WalletForm = ({
    form, onChange, onSubmit, onCancel, loading, submitLabel
  }: {
    form: FormState;
    onChange: (f: Partial<FormState>) => void;
    onSubmit: () => void;
    onCancel: () => void;
    loading: boolean;
    submitLabel: string;
  }) => (
    <div className="space-y-4 p-4 bg-background border border-white/5 rounded-sm">
      {/* Crypto type selector */}
      <div>
        <Label className="text-white/80 text-xs uppercase tracking-wider mb-2 block">Crypto Type</Label>
        <div className="flex flex-wrap gap-2">
          {CRYPTO_OPTIONS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => handleCryptoChange(c, submitLabel.includes("Add") ? "add" : "edit")}
              className={`px-3 py-1.5 rounded-sm border text-sm font-medium transition-all ${
                form.cryptoType === c
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-white/10 text-muted-foreground hover:border-white/20"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-white/80 text-xs uppercase tracking-wider mb-1.5 block">Label</Label>
          <Input
            value={form.label}
            onChange={e => onChange({ label: e.target.value })}
            placeholder="e.g. Tether (TRC20)"
            className="bg-background/50 border-white/10 text-white rounded-sm h-10"
          />
        </div>
        <div>
          <Label className="text-white/80 text-xs uppercase tracking-wider mb-1.5 block">Network</Label>
          <Input
            value={form.network}
            onChange={e => onChange({ network: e.target.value })}
            placeholder="e.g. ERC20, TRC20, BEP20"
            className="bg-background/50 border-white/10 text-white rounded-sm h-10"
          />
        </div>
      </div>

      <div>
        <Label className="text-white/80 text-xs uppercase tracking-wider mb-1.5 block">Wallet Address</Label>
        <Input
          value={form.address}
          onChange={e => onChange({ address: e.target.value })}
          placeholder="Full wallet address"
          className="bg-background/50 border-white/10 text-white rounded-sm h-10 font-mono text-sm"
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <Switch
            checked={form.isActive}
            onCheckedChange={v => onChange({ isActive: v })}
          />
          <span className="text-sm text-muted-foreground">Active (visible to members)</span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onCancel}
            className="text-muted-foreground hover:text-white rounded-sm"
          >
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSubmit}
            disabled={loading || !form.address}
            className="bg-primary text-primary-foreground rounded-sm hover:bg-primary/90"
          >
            {loading ? "Saving..." : <><Check className="w-4 h-4 mr-1" /> {submitLabel}</>}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-white">Payment Wallets</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage deposit wallet addresses shown to members. Changes take effect immediately.
          </p>
        </div>
        {!showAdd && (
          <Button
            onClick={() => setShowAdd(true)}
            className="bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Wallet
          </Button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-card border-primary/20 rounded-sm">
            <CardHeader>
              <CardTitle className="font-serif text-lg text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" /> New Payment Wallet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WalletForm
                form={addForm}
                onChange={updates => setAddForm(f => ({ ...f, ...updates }))}
                onSubmit={() => createMutation.mutate(addForm)}
                onCancel={() => { setShowAdd(false); setAddForm(emptyForm()); }}
                loading={createMutation.isPending}
                submitLabel="Add Wallet"
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Wallets list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-card rounded-sm border border-white/5 animate-pulse" />)}
        </div>
      ) : wallets && wallets.length > 0 ? (
        <div className="space-y-3">
          {wallets.map((wallet, i) => (
            <motion.div key={wallet.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="bg-card border-white/5 rounded-sm">
                <CardContent className="p-0">
                  {editingId === wallet.id ? (
                    <div className="p-4">
                      <WalletForm
                        form={editForm}
                        onChange={updates => setEditForm(f => ({ ...f, ...updates }))}
                        onSubmit={() => updateMutation.mutate({ id: wallet.id, data: editForm })}
                        onCancel={() => setEditingId(null)}
                        loading={updateMutation.isPending}
                        submitLabel="Save Changes"
                      />
                    </div>
                  ) : (
                    <div className="flex items-start gap-4 p-4">
                      {/* Crypto badge */}
                      <div className={`shrink-0 w-12 h-12 rounded-sm flex items-center justify-center font-bold text-sm ${cryptoColor[wallet.cryptoType] ?? "text-white bg-white/10"}`}>
                        {wallet.cryptoType}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-white font-medium">{wallet.label}</span>
                          {wallet.network && (
                            <span className="text-xs px-1.5 py-0.5 bg-white/5 text-muted-foreground rounded-sm">
                              {wallet.network}
                            </span>
                          )}
                          <span className={`text-xs px-1.5 py-0.5 rounded-sm ${
                            wallet.isActive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                          }`}>
                            {wallet.isActive ? "Active" : "Disabled"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs text-muted-foreground font-mono truncate">{wallet.address}</code>
                          <button
                            onClick={() => copyAddress(wallet)}
                            className="shrink-0 p-1 text-muted-foreground hover:text-primary transition-colors"
                          >
                            {copiedId === wallet.id ? <CheckCheck className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-muted-foreground hover:text-white hover:bg-white/5"
                          onClick={() => startEdit(wallet)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => deleteMutation.mutate({ id: wallet.id })}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="bg-card border-white/5 rounded-sm">
          <CardContent className="py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-serif text-lg text-white mb-2">No Wallets Configured</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Add your payment wallet addresses. Members will see these when making deposits.
            </p>
            <Button onClick={() => setShowAdd(true)} className="bg-primary text-primary-foreground rounded-sm">
              <Plus className="w-4 h-4 mr-2" /> Add First Wallet
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
