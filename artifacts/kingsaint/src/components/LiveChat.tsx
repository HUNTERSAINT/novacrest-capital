import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/custom-fetch";
import type { ChatMessage } from "@workspace/api-client-react";
import { MessageCircle, X, Send, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth-provider";

const BASE = "";

async function fetchMessages(): Promise<{ sessionId: number; messages: ChatMessage[] }> {
  return customFetch(`${BASE}/api/chat/messages`);
}

async function postMessage(message: string): Promise<{ message: ChatMessage }> {
  return customFetch(`${BASE}/api/chat/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
}

export function LiveChat() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Poll for messages every 2s when chat is open
  const { data } = useQuery({
    queryKey: ["chat-messages"],
    queryFn: fetchMessages,
    enabled: !!user && open,
    refetchInterval: open ? 2000 : false,
  });

  const messages = data?.messages ?? [];

  const sendMutation = useMutation({
    mutationFn: postMessage,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-messages"] });
      setInput("");
    },
  });

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Refetch when chat opens
  useEffect(() => {
    if (open) qc.invalidateQueries({ queryKey: ["chat-messages"] });
  }, [open, qc]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    sendMutation.mutate(text);
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Count unread admin messages
  const unreadCount = messages.filter(m => m.senderRole === "admin" && !m.isRead).length;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && !minimized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-80 bg-card border border-white/10 rounded-sm shadow-2xl overflow-hidden flex flex-col"
            style={{ height: 420 }}
          >
            {/* Header */}
            <div className="bg-primary px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-background/20 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-background" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-primary rounded-full" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-background">Novacrest Support</p>
                  <p className="text-xs text-background/70 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                    Online · Avg reply &lt;2h
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setMinimized(true)} className="p-1 hover:bg-background/10 rounded transition-colors">
                  <Minimize2 className="w-3.5 h-3.5 text-background/80" />
                </button>
                <button onClick={() => setOpen(false)} className="p-1 hover:bg-background/10 rounded transition-colors">
                  <X className="w-3.5 h-3.5 text-background/80" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {/* Welcome message */}
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-sm px-3 py-2 max-w-[85%]">
                  <p className="text-xs text-white leading-relaxed">
                    Hello{user ? ` ${user.fullName.split(" ")[0]}` : ""}! 👋 Welcome to Novacrest support. How can we help you today?
                  </p>
                </div>
              </div>

              {messages.map((msg) => {
                const isUser = msg.senderRole === "user";
                return (
                  <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-sm px-3 py-2 ${
                      isUser
                        ? "bg-primary text-background"
                        : "bg-white/5 border border-white/10 text-white"
                    }`}>
                      <p className="text-xs leading-relaxed">{msg.message}</p>
                      <p className={`text-[10px] mt-1 ${isUser ? "text-background/60 text-right" : "text-muted-foreground"}`}>
                        {fmt(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {sendMutation.isPending && (
                <div className="flex justify-end">
                  <div className="bg-primary/50 rounded-sm px-3 py-2">
                    <div className="flex gap-1 items-center h-4">
                      {[0,1,2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 bg-background/60 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/5 p-3 flex items-center gap-2 shrink-0">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") sendMessage(); }}
                placeholder="Type a message…"
                className="flex-1 bg-background/50 border border-white/10 rounded-sm px-3 py-2 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sendMutation.isPending}
                className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-background" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        onClick={() => { setOpen(v => !v); setMinimized(false); }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors"
      >
        <AnimatePresence mode="wait">
          {open && !minimized ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-5 h-5 text-background" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageCircle className="w-5 h-5 text-background" />
            </motion.div>
          )}
        </AnimatePresence>
        {/* Online dot */}
        <span className="absolute top-0 right-0 w-3 h-3 bg-green-400 border-2 border-background rounded-full" />
        {/* Unread badge */}
        {unreadCount > 0 && !open && (
          <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
            {unreadCount}
          </span>
        )}
      </motion.button>
    </div>
  );
}
