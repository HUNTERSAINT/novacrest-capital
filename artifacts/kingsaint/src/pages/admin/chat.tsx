import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/custom-fetch";
import type { ChatSession, ChatMessage } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Send, X, CheckCheck, ChevronLeft,
  User, Circle, AlertCircle,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

// ── API helpers ───────────────────────────────────────────────────────────────
async function fetchSessions() {
  return customFetch<{ sessions: ChatSession[] }>(`/api/admin/chat/sessions`);
}
async function fetchMessages(sessionId: number) {
  return customFetch<{ messages: ChatMessage[] }>(`/api/admin/chat/sessions/${sessionId}/messages`);
}
async function sendReply(sessionId: number, message: string) {
  return customFetch(`/api/admin/chat/sessions/${sessionId}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
}
async function closeSession(sessionId: number) {
  return customFetch(`/api/admin/chat/sessions/${sessionId}/close`, { method: "PATCH" });
}

// ── Time helpers ──────────────────────────────────────────────────────────────
function fmtTime(d: string) {
  const date = new Date(d);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return `Yesterday ${format(date, "h:mm a")}`;
  return format(date, "MMM d, h:mm a");
}
function fmtShort(d: string) {
  const date = new Date(d);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}

// ── Session row ───────────────────────────────────────────────────────────────
function SessionRow({
  session,
  active,
  onClick,
}: {
  session: ChatSession;
  active: boolean;
  onClick: () => void;
}) {
  const unread = session.unreadCount ?? 0;
  const isClosed = session.status === "closed";
  // lastMessage is a ChatMessage object — get its .message text
  const lastMsgText = session.lastMessage?.message ?? null;
  const lastAt = session.lastMessageAt;
  const displayName = session.user?.fullName ?? `User #${session.userId}`;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-white/5 transition-colors flex items-start gap-3 ${
        active
          ? "bg-primary/10 border-l-2 border-l-primary"
          : "hover:bg-white/5 border-l-2 border-l-transparent"
      }`}
    >
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        isClosed ? "bg-white/5" : unread ? "bg-primary/20" : "bg-white/8"
      }`}>
        <User className={`w-4 h-4 ${isClosed ? "text-muted-foreground/50" : unread ? "text-primary" : "text-muted-foreground"}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={`text-sm font-medium truncate ${active ? "text-white" : unread ? "text-white" : "text-white/70"}`}>
            {displayName}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {fmtShort(lastAt || session.createdAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground truncate">
            {lastMsgText ?? "No messages yet"}
          </span>
          {unread > 0 && !isClosed && (
            <span className="shrink-0 min-w-[18px] h-[18px] bg-primary text-background text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
          {isClosed && (
            <span className="shrink-0 text-[10px] text-muted-foreground/50 border border-white/10 rounded-sm px-1.5 py-0.5">
              Closed
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isAdmin = msg.senderRole === "admin";
  return (
    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[78%] sm:max-w-[65%] rounded-2xl px-4 py-2.5 ${
        isAdmin
          ? "bg-primary text-background rounded-br-sm"
          : "bg-white/8 text-white border border-white/10 rounded-bl-sm"
      }`}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
        <div className={`flex items-center gap-1 mt-1 ${isAdmin ? "justify-end" : "justify-start"}`}>
          <span className={`text-[10px] ${isAdmin ? "text-background/60" : "text-muted-foreground"}`}>
            {fmtTime(msg.createdAt)}
          </span>
          {isAdmin && (
            <CheckCheck className={`w-3 h-3 ${msg.isRead ? "text-background/80" : "text-background/40"}`} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Chat panel ────────────────────────────────────────────────────────────────
function ChatPanel({
  session,
  messages,
  onBack,
  onClose,
  onSend,
  isSending,
}: {
  session: ChatSession;
  messages: ChatMessage[];
  onBack?: () => void;
  onClose: () => void;
  onSend: (text: string) => void;
  isSending: boolean;
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isClosed = session.status === "closed";
  const displayName = session.user?.fullName ?? `User #${session.userId}`;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isClosed || isSending) return;
    onSend(trimmed);
    setInput("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [input, isClosed, isSending, onSend]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const quickReplies = [
    "Thanks for reaching out! I'll look into this shortly.",
    "Your request has been processed. Please allow 24 hours.",
    "Could you provide more details about your issue?",
    "This has been resolved. Please refresh your account.",
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-card shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-white/5 rounded-full transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
        <div className="w-8 h-8 rounded-full bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
          <User className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{displayName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isClosed ? (
              <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                <AlertCircle className="w-2.5 h-2.5" /> Closed
              </span>
            ) : (
              <span className="text-[10px] text-green-400 flex items-center gap-1">
                <Circle className="w-2 h-2 fill-green-400" /> Active
              </span>
            )}
          </div>
        </div>
        {!isClosed && (
          <button
            onClick={onClose}
            className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white border border-white/10 hover:border-white/20 rounded-sm px-2.5 py-1.5 transition-colors"
          >
            <X className="w-3 h-3" /> Close
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-12">
            <MessageCircle className="w-10 h-10 text-primary/20" />
            <p className="text-muted-foreground text-sm">No messages yet.</p>
            <p className="text-muted-foreground/60 text-xs">Send a greeting to start the conversation.</p>
          </div>
        ) : (
          messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      {!isClosed && (
        <div className="px-3 pb-2 shrink-0">
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {quickReplies.map(qr => (
              <button
                key={qr}
                onClick={() => {
                  setInput(qr);
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }}
                className="shrink-0 text-[11px] text-primary/80 bg-primary/8 hover:bg-primary/15 border border-primary/20 rounded-full px-3 py-1 whitespace-nowrap transition-colors"
              >
                {qr.slice(0, 38)}{qr.length > 38 ? "…" : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-white/5 px-3 py-3 shrink-0 bg-card">
        {isClosed ? (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground/60">
            <AlertCircle className="w-3.5 h-3.5" />
            This session is closed. No further messages can be sent.
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <div className="flex-1 bg-background/60 border border-white/10 focus-within:border-primary/40 rounded-xl transition-colors">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => { setInput(e.target.value); autoResize(e.target); }}
                onKeyDown={handleKey}
                placeholder="Type a reply… (Enter to send, Shift+Enter for newline)"
                rows={1}
                className="w-full bg-transparent px-4 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none resize-none leading-relaxed"
                style={{ height: "40px", maxHeight: "120px" }}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              className="bg-primary hover:bg-primary/90 text-background rounded-xl h-10 w-10 p-0 shrink-0 disabled:opacity-40"
            >
              {isSending
                ? <span className="w-3.5 h-3.5 border-2 border-background/40 border-t-background rounded-full animate-spin" />
                : <Send className="w-3.5 h-3.5" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminChat() {
  const qc = useQueryClient();
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  const { data: sessionsData } = useQuery({
    queryKey: ["admin-chat-sessions"],
    queryFn: fetchSessions,
    refetchInterval: 3000,
  });

  const { data: messagesData } = useQuery({
    queryKey: ["admin-chat-messages", activeSessionId],
    queryFn: () => fetchMessages(activeSessionId!),
    enabled: !!activeSessionId,
    refetchInterval: 2000,
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: number; message: string }) => sendReply(id, message),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-chat-messages", activeSessionId] });
      qc.invalidateQueries({ queryKey: ["admin-chat-sessions"] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: (id: number) => closeSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-chat-sessions"] });
      setActiveSessionId(null);
      setMobileView("list");
    },
  });

  const sessions = sessionsData?.sessions ?? [];
  const messages = messagesData?.messages ?? [];
  const activeSession = sessions.find(s => s.id === activeSessionId) ?? null;

  // Auto-select first session
  useEffect(() => {
    if (!activeSessionId && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  const selectSession = (id: number) => {
    setActiveSessionId(id);
    setMobileView("chat");
  };

  const totalUnread = sessions.reduce((n, s) => n + (s.unreadCount ?? 0), 0);

  return (
    <div className="space-y-4 pb-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-white flex items-center gap-2">
            Live Chat
            {totalUnread > 0 && (
              <span className="text-xs bg-primary text-background font-bold px-2 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Respond to member support messages in real time.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          <Circle className="w-2 h-2 fill-green-400 text-green-400" /> Live updates
        </div>
      </div>

      {/* Chat container — fixed height, works within the existing admin layout */}
      <div className="flex border border-white/5 rounded-sm overflow-hidden bg-card" style={{ height: "calc(100vh - 260px)", minHeight: "480px" }}>

        {/* Sessions list */}
        <div className={`
          flex-col border-r border-white/5 bg-background/20
          w-full sm:w-72 lg:w-80 shrink-0
          ${mobileView === "chat" ? "hidden sm:flex" : "flex"}
        `}>
          <div className="px-4 py-3 border-b border-white/5 shrink-0 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Conversations
            </p>
            <span className="text-xs text-muted-foreground">{sessions.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center gap-3 px-6">
                <MessageCircle className="w-10 h-10 text-primary/20" />
                <p className="text-muted-foreground text-sm">No conversations yet.</p>
                <p className="text-muted-foreground/60 text-xs">
                  When members open a chat, they'll appear here.
                </p>
              </div>
            ) : (
              sessions.map(s => (
                <SessionRow
                  key={s.id}
                  session={s}
                  active={s.id === activeSessionId}
                  onClick={() => selectSession(s.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div className={`
          flex-1 min-w-0
          ${mobileView === "list" ? "hidden sm:flex" : "flex"}
        `}>
          <AnimatePresence mode="wait">
            {activeSession ? (
              <motion.div
                key={activeSession.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="w-full h-full flex flex-col"
              >
                <ChatPanel
                  session={activeSession}
                  messages={messages}
                  onBack={mobileView === "chat" ? () => setMobileView("list") : undefined}
                  onClose={() => closeMutation.mutate(activeSession.id)}
                  onSend={text => replyMutation.mutate({ id: activeSession.id, message: text })}
                  isSending={replyMutation.isPending}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <MessageCircle className="w-7 h-7 text-primary/40" />
                </div>
                <div>
                  <p className="text-white font-medium">Select a conversation</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Choose from the list to view messages and reply.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
