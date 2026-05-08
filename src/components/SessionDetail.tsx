/**
 * SessionDetail.tsx — Full-page timeline view for chat and recording sessions
 *
 * Shows a clean, readable timeline of the entire session.
 * For chat: alternating user/assistant bubbles.
 * For recording: timestamped entries with alert blocks and suggested responses.
 */

import { useRef, useEffect } from "react";
import {
  ArrowLeft, Download, MessageSquare, Mic, Clock, Calendar,
  AlertTriangle, AlertCircle, ShieldCheck, User, Bot,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { type ChatSession, type AlertSeverity, formatDuration } from "@/services/sessionService";
import { exportSessionAsPDF } from "@/services/exportService";

interface SessionDetailProps {
  session: ChatSession;
  onClose: () => void;
}

// ── Styling helpers ───────────────────────────────────────────────────────────

const PROSE_CLASSES = [
  "prose prose-sm prose-invert max-w-none",
  "[&_p]:my-1.5 [&_p]:leading-relaxed [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
  "[&_ul]:my-2 [&_ul]:pl-4 [&_ul]:space-y-1 [&_li]:my-0 [&_li]:leading-relaxed",
  "[&_ol]:my-2 [&_ol]:pl-4 [&_ol]:space-y-1",
  "[&_strong]:text-foreground [&_strong]:font-semibold",
  "[&_em]:italic [&_em]:text-muted-foreground/80 [&_em]:text-[0.8rem]",
  "[&_hr]:border-border [&_hr]:my-3",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground/75",
].join(" ");

const alertConfig: Record<
  AlertSeverity,
  { bg: string; border: string; text: string; icon: React.FC<{ className: string }> }
> = {
  DANGER: {
    bg: "bg-danger/5",
    border: "border-danger/30",
    text: "text-danger",
    icon: AlertTriangle,
  },
  CAUTION: {
    bg: "bg-warning/5",
    border: "border-warning/30",
    text: "text-warning",
    icon: AlertCircle,
  },
  SAFE: {
    bg: "bg-safe/5",
    border: "border-safe/20",
    text: "text-safe",
    icon: ShieldCheck,
  },
};

// ── Main component ───────────────────────────────────────────────────────────

const SessionDetail = ({ session, onClose }: SessionDetailProps) => {
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "auto" });
  }, [session.id]);

  const dateStr = new Date(session.createdAt).toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const isChat = session.type === "chat";
  const visibleMessages = session.messages?.filter((m) => m.role !== "system") ?? [];
  const entries = session.entries ?? [];

  return (
    <AnimatePresence>
      <motion.div
        key="session-detail"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.22 }}
        className="absolute inset-0 bg-background z-30 flex flex-col overflow-hidden"
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <header className="shrink-0 border-b border-border bg-card px-4 py-3.5 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Button>

          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-bold text-sm text-foreground truncate leading-tight">
              {session.title}
            </h1>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                <Calendar className="w-3 h-3" /> {dateStr}
              </span>
              {session.duration !== undefined && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                  <Clock className="w-3 h-3" /> {formatDuration(session.duration)}
                </span>
              )}
            </div>
          </div>

          {/* Type badge */}
          {isChat ? (
            <span className="shrink-0 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-blue-400 bg-blue-400/10 px-2 py-1 rounded-lg">
              <MessageSquare className="w-3 h-3" /> Chat
            </span>
          ) : (
            <span className="shrink-0 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-purple-400 bg-purple-400/10 px-2 py-1 rounded-lg">
              <Mic className="w-3 h-3" /> Recording
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => exportSessionAsPDF(session)}
            className="shrink-0 gap-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" /> Export PDF
          </Button>
        </header>

        {/* ── Scrollable content ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div ref={topRef} />
          <div className="max-w-2xl mx-auto px-4 py-6">

            {/* Summary box */}
            {session.summary && (
              <div className="mb-6 rounded-xl border border-border bg-card px-4 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1.5">
                  Session Summary
                </p>
                <p className="text-sm text-foreground leading-relaxed">{session.summary}</p>
              </div>
            )}

            {/* Alert count callout */}
            {session.alertCount && (session.alertCount.danger + session.alertCount.caution) > 0 && (
              <div className="mb-6 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
                <p className="text-xs text-foreground leading-relaxed">
                  {session.alertCount.danger > 0 && (
                    <span className="font-semibold text-danger">{session.alertCount.danger} DANGER alert{session.alertCount.danger !== 1 ? "s" : ""} </span>
                  )}
                  {session.alertCount.danger > 0 && session.alertCount.caution > 0 && "and "}
                  {session.alertCount.caution > 0 && (
                    <span className="font-semibold text-warning">{session.alertCount.caution} CAUTION alert{session.alertCount.caution !== 1 ? "s" : ""} </span>
                  )}
                  detected during this session.
                </p>
              </div>
            )}

            {/* Timeline header */}
            <div className="flex items-center gap-3 mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 shrink-0">
                Timeline
              </p>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* ── CHAT timeline ─────────────────────────────────────────────── */}
            {isChat && (
              <div className="space-y-5">
                {visibleMessages.length === 0 && (
                  <EmptyTimeline label="No messages in this session." />
                )}
                {visibleMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 items-end ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mb-0.5">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-3 max-w-[82%] text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm leading-relaxed"
                          : "bg-card border border-border text-foreground rounded-bl-sm"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className={PROSE_CLASSES}>
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0 mb-0.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── RECORDING timeline ────────────────────────────────────────── */}
            {!isChat && (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

                <div className="space-y-6 pl-7">
                  {entries.length === 0 && (
                    <EmptyTimeline label="No transcript entries in this session." />
                  )}
                  {entries.map((entry) => {
                    const hasAlert = !!entry.alertMessage;
                    const cfg = entry.severity ? alertConfig[entry.severity] : alertConfig.CAUTION;
                    const AlertIcon = cfg.icon;

                    return (
                      <div key={entry.id} className="relative">
                        {/* Timeline dot */}
                        <div
                          className={`absolute -left-7 top-1 w-[9px] h-[9px] rounded-full border-2 border-background ${
                            hasAlert && entry.severity === "DANGER"
                              ? "bg-danger"
                              : hasAlert
                              ? "bg-warning"
                              : "bg-border"
                          }`}
                        />

                        {/* Timestamp */}
                        <p className="text-[10px] font-mono text-muted-foreground/50 mb-1.5 tabular-nums">
                          {entry.timestamp}
                        </p>

                        {/* Transcript text */}
                        <p className="text-sm text-foreground leading-relaxed mb-3">
                          {entry.text}
                        </p>

                        {/* Alert block */}
                        {hasAlert && (
                          <div
                            className={`rounded-xl border px-4 py-3.5 ${cfg.bg} ${cfg.border} space-y-3`}
                          >
                            {/* Alert header */}
                            <div className="flex items-start gap-2">
                              <AlertIcon className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.text}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${cfg.text}`}>
                                  {entry.severity ?? "CAUTION"} — Rights Alert
                                </p>
                                <p className="text-sm text-foreground leading-relaxed">
                                  {entry.alertMessage}
                                </p>
                              </div>
                            </div>

                            {/* Suggested response */}
                            {entry.suggestedResponse && (
                              <div className="border-t border-white/10 pt-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1.5">
                                  You may say
                                </p>
                                <p
                                  className={`text-xs leading-relaxed italic border-l-2 pl-2.5 ${cfg.text} opacity-85`}
                                >
                                  &ldquo;{entry.suggestedResponse}&rdquo;
                                </p>
                              </div>
                            )}

                            {/* Legal reference */}
                            {entry.legalReference && (
                              <p className="text-[10px] text-muted-foreground/50 pt-1 border-t border-white/5">
                                Legal basis: {entry.legalReference}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom spacer */}
            <div className="h-16" />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

const EmptyTimeline = ({ label }: { label: string }) => (
  <p className="text-xs text-muted-foreground/40 text-center py-8">{label}</p>
);

export default SessionDetail;
