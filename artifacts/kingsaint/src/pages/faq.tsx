import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  {
    category: "Getting Started",
    items: [
      {
        q: "What is Novacrest Capital?",
        a: "Novacrest Capital is a premium digital asset investment platform that offers managed crypto investment plans with competitive returns. Members deposit funds and choose from a range of investment plans tailored to different risk tolerances and goals.",
      },
      {
        q: "How do I create an account?",
        a: "Click 'Get Started' on the homepage and complete the registration form. You'll need to provide your full name, email address, and a secure password. Once registered, you can log in and explore investment plans immediately.",
      },
      {
        q: "Is KYC verification required?",
        a: "KYC (Know Your Customer) verification is required to unlock full withdrawal privileges and higher investment tiers. You can submit your ID documents via the KYC page in your member dashboard.",
      },
    ],
  },
  {
    category: "Investments & Returns",
    items: [
      {
        q: "How are returns calculated?",
        a: "Returns are based on the ROI percentage of your chosen plan. For example, a plan with 10% ROI on a $1,000 investment yields $100 profit over the plan duration. Compounding reinvests your profit automatically for exponential growth.",
      },
      {
        q: "What is the compounding option?",
        a: "When you enable compounding on an investment, your earned profits are automatically reinvested at the end of each cycle, allowing your returns to compound over time — significantly increasing long-term gains.",
      },
      {
        q: "Can I have multiple active investments?",
        a: "Yes. You can invest in multiple plans simultaneously, provided you have sufficient balance. Each investment runs independently until its duration ends.",
      },
      {
        q: "What happens when my investment plan expires?",
        a: "When an investment matures, the principal plus earned profit is credited to your account balance. You will also receive an in-app notification confirming the payout.",
      },
    ],
  },
  {
    category: "Deposits & Withdrawals",
    items: [
      {
        q: "Which cryptocurrencies are accepted for deposit?",
        a: "We accept Bitcoin (BTC), Ethereum (ETH), USDT (TRC20/ERC20), BNB (BEP20), Solana (SOL), and XRP. Always use the wallet address displayed on your deposit page to ensure funds are credited correctly.",
      },
      {
        q: "How long do deposits take to reflect?",
        a: "Deposits are typically reviewed and approved within 1–24 hours. You will receive an in-app notification once your deposit is confirmed. Blockchain confirmation times may vary.",
      },
      {
        q: "What is the minimum withdrawal amount?",
        a: "The minimum withdrawal amount is $50. Withdrawals are processed within 1–3 business days after admin review and approval.",
      },
      {
        q: "Are there withdrawal fees?",
        a: "Novacrest does not charge platform withdrawal fees. However, blockchain network fees (gas fees) may apply depending on the cryptocurrency and network congestion.",
      },
    ],
  },
  {
    category: "Copy Trading",
    items: [
      {
        q: "What is Copy Trading?",
        a: "Copy Trading lets you automatically mirror the trades of experienced portfolio managers. You allocate a portion of your balance to a strategy, and your account mirrors the manager's trades proportionally.",
      },
      {
        q: "Can I lose money on Copy Trading?",
        a: "All trading involves risk. While our portfolio managers are experienced professionals, past performance does not guarantee future results. Always allocate only funds you can afford to risk.",
      },
      {
        q: "How do I leave a Copy Trading strategy?",
        a: "You can leave a strategy at any time from the Copy Trading page in your dashboard. Your allocated funds will be returned to your balance immediately.",
      },
    ],
  },
  {
    category: "Security & Account",
    items: [
      {
        q: "How is my account secured?",
        a: "Novacrest uses industry-standard encryption for all data transmission and storage. We recommend using a strong, unique password and never sharing your login credentials with anyone.",
      },
      {
        q: "What should I do if I forget my password?",
        a: "Use the 'Forgot Password' link on the login page to reset your password via email. If you continue to have issues, contact our support team.",
      },
      {
        q: "How does the referral programme work?",
        a: "Share your unique referral code with friends. When they invest, you earn a 5% Level 1 commission on their investment amount. If your referrals also refer others, you earn an additional 2% Level 2 commission.",
      },
    ],
  },
];

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 group"
      >
        <span className="text-sm font-medium text-white/90 group-hover:text-primary transition-colors">{q}</span>
        <ChevronDown className={`w-4 h-4 text-primary shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative border-b border-white/5 bg-card/50 py-20 text-center px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
        <p className="text-primary text-xs font-semibold uppercase tracking-widest mb-3">Support</p>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-white mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-base">
          Everything you need to know about investing with Novacrest Capital.
        </p>
      </div>

      {/* FAQ content */}
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-12">
        {faqs.map((section) => (
          <div key={section.category}>
            <h2 className="font-serif text-xl text-primary mb-4 pb-2 border-b border-primary/20">
              {section.category}
            </h2>
            <div className="bg-card border border-white/5 rounded-sm px-6">
              {section.items.map((item) => (
                <AccordionItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}

        {/* Contact CTA */}
        <div className="bg-card border border-white/5 rounded-sm p-8 text-center">
          <h3 className="font-serif text-xl text-white mb-2">Still have questions?</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Our support team is available 24/7 to assist you.
          </p>
          <a
            href="mailto:support@novacrest.com"
            className="inline-flex items-center gap-2 bg-primary text-background font-semibold px-6 py-2.5 rounded-sm hover:bg-primary/90 transition-colors text-sm"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
