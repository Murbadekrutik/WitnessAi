/**
 * ChatInterface.tsx — Legal AI chat with persistent session history + SessionDetail view
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Send, Bot, User, ArrowLeft, Shield, Sparkles, Copy, Check, History, WifiOff, KeyRound, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { streamChatResponse, type ChatMessage } from "@/services/chatService";
import {
  createSession, saveSession, deriveTitle, type ChatSession,
} from "@/services/sessionService";
import HistoryPanel from "@/components/HistoryPanel";
import SessionDetail from "@/components/SessionDetail";

interface ChatInterfaceProps { onBack: () => void; }

const SUGGESTIONS = [
  "Do I have to answer police questions if I'm stopped?",
  "Can police search my phone without a warrant?",
  "What does Article 21 protect me from?",
  "How do I file an FIR if police refuse to register it?",
  "What are D.K. Basu guidelines and why do they matter?",
  "Can I refuse to sign a blank paper or confession?",
];

const PROSE_CLASSES = [
  "prose prose-sm prose-invert max-w-none",
  "[&_p]:my-2 [&_p]:leading-relaxed [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
  "[&_h2]:font-heading [&_h2]:font-bold [&_h2]:text-sm [&_h2]:text-foreground [&_h2]:mt-4 [&_h2]:mb-2",
  "[&_h3]:font-heading [&_h3]:font-semibold [&_h3]:text-xs [&_h3]:uppercase [&_h3]:tracking-wider [&_h3]:text-muted-foreground [&_h3]:mt-3 [&_h3]:mb-1.5",
  "[&_ul]:my-2.5 [&_ul]:pl-4 [&_ul]:space-y-1.5 [&_li]:my-0 [&_li]:leading-relaxed",
  "[&_ol]:my-2.5 [&_ol]:pl-4 [&_ol]:space-y-1.5",
  "[&_strong]:text-foreground [&_strong]:font-semibold",
  "[&_em]:italic [&_em]:text-muted-foreground/80 [&_em]:text-[0.8rem]",
  "[&_code]:text-xs [&_code]:bg-muted/60 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono",
  "[&_hr]:border-border [&_hr]:my-4",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground/75 [&_blockquote_p]:my-0",
].join(" ");

const ChatInterface = ({ onBack }: ChatInterfaceProps) => {
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [input, setInput]                 = useState("");
  const [isLoading, setIsLoading]         = useState(false);
  const [copiedIdx, setCopiedIdx]         = useState<number | null>(null);
  const [showHistory, setShowHistory]     = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [detailSession, setDetailSession] = useState<ChatSession | null>(null);
  const [backendDown, setBackendDown]     = useState(false);
  const [missingApiKey, setMissingApiKey] = useState(false);
  const [rateLimited, setRateLimited]     = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { createSession().then(setCurrentSession); }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const persistSession = useCallback(async (msgs: ChatMessage[], session: ChatSession) => {
    const visible = msgs.filter((m) => m.role !== "system");
    const updated: ChatSession = {
      ...session,
      messages: visible,
      title: deriveTitle(visible),
      updatedAt: Date.now(),
    };
    await saveSession(updated);
    setCurrentSession(updated);
  }, []);

  const handleCopy = useCallback((content: string, idx: number) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    scrollToBottom();

    let finalMessages = updatedMessages;
    try {
      const finalContent = await streamChatResponse(updatedMessages, (accumulated) => {
        const withAssistant: ChatMessage[] = [
          ...updatedMessages,
          { role: "assistant", content: accumulated },
        ];
        setMessages(withAssistant);
        finalMessages = withAssistant;
        scrollToBottom();
      });

      if (!finalContent) {
        const withFallback: ChatMessage[] = [
          ...updatedMessages,
          { role: "assistant", content: "I wasn't able to generate a response. Please try again." },
        ];
        setMessages(withFallback);
        finalMessages = withFallback;
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "";
      const isNoKey      = errMsg.startsWith("NO_API_KEY:");
      const isRateLimit  = errMsg.startsWith("RATE_LIMIT:");
      const isNetworkError = !isNoKey && !isRateLimit && err instanceof TypeError && errMsg.toLowerCase().includes("fetch");

      if (isNoKey)     setMissingApiKey(true);
      else if (isRateLimit) {
        setRateLimited(true);
        // Auto-clear after 65 s so user knows when to retry
        setTimeout(() => setRateLimited(false), 65_000);
      }
      else if (isNetworkError) setBackendDown(true);

      const userFacingMsg = isNoKey
        ? "No Gemini API key found. Add VITE_GEMINI_API_KEY to your .env file and restart the dev server. See the banner above for instructions."
        : isRateLimit
          ? "Rate limit reached — please wait about 60 seconds then try again."
          : isNetworkError
            ? "The AI backend is currently unreachable. Please check your internet connection and try again."
            : `Connection error — ${errMsg || "Unknown error"}. Please try again.`;

      const withError: ChatMessage[] = [
        ...updatedMessages,
        { role: "assistant", content: userFacingMsg },
      ];
      setMessages(withError);
      finalMessages = withError;
    } finally {
      setIsLoading(false);
      scrollToBottom();
      if (currentSession) persistSession(finalMessages, currentSession);
    }
  }, [messages, isLoading, currentSession, persistSession, scrollToBottom]);

  const startNewChat = useCallback(async () => {
    const session = await createSession();
    setCurrentSession(session);
    setMessages([]);
    setInput("");
    setShowHistory(false);
  }, []);

  const handleContinueChat = useCallback((session: ChatSession) => {
    setCurrentSession(session);
    setMessages(session.messages ?? []);
    setShowHistory(false);
    setTimeout(scrollToBottom, 100);
  }, [scrollToBottom]);

  const visibleMessages = messages.filter((m) => m.role !== "system");

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Rate-limited banner ───────────────────────────────────────────── */}
      {rateLimited && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-secondary/80 border-b border-border text-xs text-muted-foreground shrink-0">
          <Clock className="w-3.5 h-3.5 shrink-0 text-warning" />
          <span>
            <strong className="text-warning">Rate limit reached.</strong>{" "}
            The Gemini free tier allows 15 requests/minute. Please wait ~60 seconds, then try again.
          </span>
        </div>
      )}

      {/* ── Missing API key banner ───────────────────────────────────────── */}
      {missingApiKey && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-primary/10 border-b border-primary/30 text-xs text-primary shrink-0">
          <KeyRound className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            <strong>Gemini API key not configured.</strong>{" "}Follow these steps:
            {" "}1.{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-80"
            >
              Get a free key at aistudio.google.com
            </a>
            {" "}2. Open <code className="bg-primary/20 px-1 rounded">.env</code> in the project root and add:
            {" "}<code className="bg-primary/20 px-1 rounded">VITE_GEMINI_API_KEY=AIza...</code>
            {" "}3. Restart the dev server (<code className="bg-primary/20 px-1 rounded">npm run dev</code>).
          </span>
        </div>
      )}

      {/* ── Backend-down banner ──────────────────────────────────────────── */}
      {backendDown && !missingApiKey && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-warning/10 border-b border-warning/30 text-xs text-warning shrink-0">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>AI backend offline</strong> — The Supabase project appears to be paused.
            {" "}Visit{" "}
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              supabase.com/dashboard
            </a>
            {" "}to unpause it.
          </span>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="relative flex items-center px-4 py-3.5 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}
          className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
        </Button>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-heading font-semibold text-foreground text-sm tracking-tight">
            Legal AI Assistant
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowHistory((v) => !v)}
          className="ml-auto text-muted-foreground hover:text-foreground" title="Session history">
          <History className="w-4 h-4" />
        </Button>
      </header>

      {/* ── Messages + overlays ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

          {/* Empty state */}
          {visibleMessages.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="flex flex-col items-center pt-10 pb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h2 className="font-heading text-xl font-bold text-foreground mb-2 tracking-tight">
                Know Your Rights
              </h2>
              <p className="text-sm text-muted-foreground text-center max-w-sm mb-1.5 leading-relaxed">
                Ask about Indian constitutional rights, police procedures, FIR&nbsp;filing,
                bail, and custody rights.
              </p>
              <p className="text-xs text-muted-foreground/45 text-center mb-8">
                Based on Indian law · Not legal advice
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => sendMessage(s)}
                    className="text-left text-sm px-4 py-3 rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/20 text-muted-foreground hover:text-foreground transition-all duration-150">
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Conversation */}
          <AnimatePresence initial={false}>
            {visibleMessages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className={`flex gap-3 items-end ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mb-0.5">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div className={`relative group rounded-2xl px-4 py-3 max-w-[82%] text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm leading-relaxed"
                    : "bg-card border border-border text-foreground rounded-bl-sm"
                }`}>
                  {msg.role === "assistant" ? (
                    <>
                      <div className={PROSE_CLASSES}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                        {isLoading && i === visibleMessages.length - 1 && (
                          <span className="inline-block w-0.5 h-[0.9em] bg-primary/60 ml-0.5 align-middle animate-pulse" />
                        )}
                      </div>
                      {!isLoading && (
                        <button onClick={() => handleCopy(msg.content, i)} title="Copy"
                          className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1.5 rounded-lg hover:bg-muted/80">
                          {copiedIdx === i
                            ? <Check className="w-3 h-3 text-safe" />
                            : <Copy className="w-3 h-3 text-muted-foreground" />}
                        </button>
                      )}
                    </>
                  ) : <p>{msg.content}</p>}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0 mb-0.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isLoading && visibleMessages[visibleMessages.length - 1]?.role === "user" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 items-end">
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="rounded-2xl rounded-bl-sm px-4 py-3.5 bg-card border border-border">
                <div className="flex items-center gap-1 text-primary">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* SessionDetail overlay */}
        <AnimatePresence>
          {detailSession && (
            <SessionDetail
              session={detailSession}
              onClose={() => setDetailSession(null)}
            />
          )}
        </AnimatePresence>

        {/* History panel + backdrop */}
        <AnimatePresence>
          {showHistory && !detailSession && (
            <>
              <motion.div key="backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10"
                onClick={() => setShowHistory(false)} />
              <HistoryPanel
                currentSessionId={currentSession?.id ?? null}
                lockedType="chat"
                onContinueChat={handleContinueChat}
                onViewSession={(s) => { setDetailSession(s); setShowHistory(false); }}
                onNewChat={startNewChat}
                onClose={() => setShowHistory(false)}
              />
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ── Input ──────────────────────────────────────────────────────── */}
      <div className="border-t border-border bg-card px-4 py-4 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="max-w-2xl mx-auto flex gap-2.5 items-end">
          <textarea ref={inputRef} value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Ask about your rights..." rows={1} disabled={isLoading}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all duration-150 min-h-[46px] max-h-32" />
          <Button type="submit" size="lg" className="rounded-xl px-4 h-[46px] shrink-0"
            disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-center text-[11px] text-muted-foreground/35 mt-2.5 max-w-2xl mx-auto leading-relaxed">
          General legal information based on Indian law · Not a substitute for legal advice.
        </p>
      </div>
    </div>
  );
};

export default ChatInterface;
