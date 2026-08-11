import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { Menu, X, Smartphone, Download, CheckCircle } from "lucide-react";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [appModalOpen, setAppModalOpen] = useState(false);
  const { prompt, install, installed, platform } = useInstallPrompt();

  const isDarkBg = location === "/";

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/plans", label: "Plans" },
    { href: null, label: "Get the App", modal: true },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-x-hidden">
      {/* ── Navbar ── */}
      <header className={`absolute top-0 w-full z-50 transition-colors duration-300 ${isDarkBg ? "bg-transparent text-white" : "bg-card/50 backdrop-blur-md border-b border-white/5"}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group cursor-pointer shrink-0">
            <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight group-hover:text-primary transition-colors">
              Novacrest<span className="text-primary">.</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(n => n.modal ? (
              <button key={n.label} onClick={() => setAppModalOpen(true)} className="text-sm font-medium hover:text-primary transition-colors">
                {n.label}
              </button>
            ) : (
              <Link key={n.href!} href={n.href!} className="text-sm font-medium hover:text-primary transition-colors">
                {n.label}
              </Link>
            ))}
          </nav>

          {/* Right side: CTA + hamburger */}
          <div className="flex items-center gap-3">
            {user ? (
              <Link href={user.role === 'admin' ? '/admin' : '/dashboard'}>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-sm border border-primary/50 text-sm h-9 sm:h-10 px-4 sm:px-5">
                  {user.role === 'admin' ? 'Admin Portal' : 'Dashboard'}
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors hidden sm:block">
                  Sign In
                </Link>
                <Link href="/register">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-sm border border-primary/50 shadow-[0_0_15px_rgba(212,175,55,0.2)] text-sm h-9 sm:h-10 px-4 sm:px-5">
                    Get Started
                  </Button>
                </Link>
              </>
            )}

            {/* Mobile hamburger (nav links only) */}
            <button
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-sm bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden bg-card/95 backdrop-blur-md border-b border-white/10 px-4 pb-4 space-y-1">
            {navLinks.map(n => n.modal ? (
              <button
                key={n.label}
                onClick={() => { setMobileOpen(false); setAppModalOpen(true); }}
                className="block w-full text-left py-3 text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/5 px-3 rounded-sm transition-colors"
              >
                {n.label}
              </button>
            ) : (
              <Link
                key={n.href!}
                href={n.href!}
                onClick={() => setMobileOpen(false)}
                className="block py-3 text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/5 px-3 rounded-sm transition-colors"
              >
                {n.label}
              </Link>
            ))}
            {!user && (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block py-3 text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/5 px-3 rounded-sm transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        )}
      </header>

      {/* ── Get the App modal ── */}
      <Dialog open={appModalOpen} onOpenChange={setAppModalOpen}>
        <DialogContent className="bg-card border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" /> Install Novacrest
            </DialogTitle>
          </DialogHeader>

          {installed ? (
            /* Already installed */
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle className="w-10 h-10 text-primary" />
              <p className="text-sm text-muted-foreground">
                Novacrest is already installed on your device.
              </p>
            </div>
          ) : platform === "ios" ? (
            /* iOS — no install API, show Safari steps */
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Open this page in <strong className="text-white">Safari</strong>, then:
              </p>
              <ol className="space-y-3">
                {[
                  { n: 1, text: <>Tap the <strong className="text-white">Share</strong> button at the bottom of the screen</> },
                  { n: 2, text: <>Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong></> },
                  { n: 3, text: <>Tap <strong className="text-white">Add</strong> — the app icon appears on your home screen</> },
                ].map(({ n, text }) => (
                  <li key={n} className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center mt-0.5">{n}</span>
                    <span className="text-sm text-muted-foreground">{text}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : prompt ? (
            /* Android / desktop — one-tap install */
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Install Novacrest directly on your device — no app store needed.
              </p>
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium h-11 gap-2"
                onClick={async () => {
                  const accepted = await install();
                  if (accepted) setAppModalOpen(false);
                }}
              >
                <Download className="w-4 h-4" /> Install App
              </Button>
            </div>
          ) : (
            /* Prompt not yet fired (desktop Chrome needs HTTPS + engagement, or already installed) */
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Open this site in <strong className="text-white">Chrome on your phone</strong>, then tap <strong className="text-white">"Get the App"</strong> to install with one tap.
              </p>
              <p className="text-xs text-muted-foreground">
                On Android: Chrome will show an Install button automatically.<br/>
                On iPhone: use Safari → Share → Add to Home Screen.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-white/5 py-12 mt-auto relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div className="sm:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <span className="font-serif text-xl font-bold tracking-tight">
                  Novacrest<span className="text-primary">.</span>
                </span>
              </Link>
              <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
                The premier digital asset management platform for the discerning investor. Vault-grade security, exceptional returns.
              </p>
            </div>
            <div>
              <h4 className="font-serif text-lg mb-4 text-white">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/plans" className="hover:text-primary transition-colors">Investment Plans</Link></li>
                <li><Link href="/register" className="hover:text-primary transition-colors">Referral Program</Link></li>
                <li><Link href="/login" className="hover:text-primary transition-colors">Member Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-serif text-lg mb-4 text-white">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><span className="hover:text-primary transition-colors cursor-pointer">Terms of Service</span></li>
                <li><span className="hover:text-primary transition-colors cursor-pointer">Privacy Policy</span></li>
                <li><span className="hover:text-primary transition-colors cursor-pointer">Compliance</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Novacrest Capital. All rights reserved.</p>
            <p>Regulated Digital Asset Manager</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
