import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PasswordRecovery() {
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const isReset = Boolean(token);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (isReset && password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(isReset ? "/api/auth/reset-password" : "/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isReset ? { token, password } : { email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setMessage(data.message || "Request completed.");
      if (isReset) {
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center pt-20 pb-12 px-4 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-[400px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card/80 backdrop-blur-xl border border-white/10 p-8 rounded-sm shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-white mb-2">{isReset ? "Create a New Password" : "Forgot Password?"}</h1>
          <p className="text-muted-foreground text-sm">{isReset ? "Choose a strong password for your NovaCrest account." : "Enter your account email and we’ll send you a secure reset link."}</p>
        </div>
        <form onSubmit={submit} className="space-y-5">
          {!isReset ? (
            <div className="space-y-2">
              <label className="text-sm text-white/80" htmlFor="reset-email">Email Address</label>
              <Input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="investor@example.com" className="bg-background/50 border-white/10 text-white rounded-sm h-12" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm text-white/80" htmlFor="new-password">New Password</label>
                <Input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="bg-background/50 border-white/10 text-white rounded-sm h-12" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/80" htmlFor="confirm-password">Confirm New Password</label>
                <Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Enter your new password again" className="bg-background/50 border-white/10 text-white rounded-sm h-12" />
              </div>
            </>
          )}
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          {message && <p role="status" className="text-sm text-emerald-400">{message}</p>}
          <Button type="submit" disabled={busy} className="w-full h-12 text-base rounded-sm bg-primary text-primary-foreground hover:bg-primary/90">
            {busy ? "Please wait..." : isReset ? "Reset Password" : "Send Reset Link"}
          </Button>
        </form>
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:text-primary/80 transition-colors">Back to sign in</Link>
        </div>
      </motion.div>
    </div>
  );
}
