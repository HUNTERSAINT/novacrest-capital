import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

const NAMES = [
  "James W.", "Sarah C.", "Marcus J.", "Olivia B.", "David O.", "Priya N.",
  "Chen W.", "Amira K.", "Lucas M.", "Fatima A.", "Ryan T.", "Elena S.",
  "Mohammed A.", "Jessica L.", "Carlos R.", "Yuki T.", "Aisha P.", "Noah G.",
];

const CITIES = [
  "New York", "London", "Dubai", "Singapore", "Toronto", "Sydney",
  "Lagos", "Paris", "Tokyo", "Mumbai", "Berlin", "Zurich", "Hong Kong",
];

const CRYPTOS = ["BTC", "ETH", "USDT", "BNB", "SOL", "XRP"];

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEvent() {
  const isDeposit = Math.random() > 0.4;
  const amount = isDeposit
    ? randomBetween(500, 50000)
    : randomBetween(200, 30000);
  return {
    id: Date.now(),
    type: isDeposit ? "deposit" : "withdrawal",
    name: NAMES[randomBetween(0, NAMES.length - 1)],
    city: CITIES[randomBetween(0, CITIES.length - 1)],
    crypto: CRYPTOS[randomBetween(0, CRYPTOS.length - 1)],
    amount,
    minsAgo: randomBetween(1, 12),
  };
}

export function ActivityPopup() {
  const [event, setEvent] = useState<ReturnType<typeof generateEvent> | null>(null);

  useEffect(() => {
    // First popup after 3s, then every 6-10s
    const show = () => {
      setEvent(generateEvent());
      setTimeout(() => setEvent(null), 4500); // hide after 4.5s
    };

    const initial = setTimeout(show, 3000);
    const interval = setInterval(show, randomBetween(7000, 12000));

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="fixed bottom-5 left-5 z-40 pointer-events-none">
      <AnimatePresence>
        {event && (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -30, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex items-center gap-3 bg-card border border-white/10 rounded-sm px-4 py-3 shadow-2xl max-w-xs"
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              event.type === "deposit"
                ? "bg-green-500/15 text-green-400"
                : "bg-primary/15 text-primary"
            }`}>
              {event.type === "deposit"
                ? <ArrowDownLeft className="w-4 h-4" />
                : <ArrowUpRight className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {event.name} from {event.city}
              </p>
              <p className="text-xs text-muted-foreground">
                {event.type === "deposit" ? "deposited" : "withdrew"}{" "}
                <span className={`font-semibold ${event.type === "deposit" ? "text-green-400" : "text-primary"}`}>
                  {fmt(event.amount)}
                </span>{" "}
                in {event.crypto}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{event.minsAgo}m ago</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
