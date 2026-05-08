/**
 * HistoryPanel.tsx — Redesigned session history slide-in panel
 *
 * Supports search, type filters, and rich session cards for both
 * chat and recording sessions.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { X, Plus, Search, MessageSquare, Mic, Trash2, ExternalLink, Download } from "lucide-react";
import { motion } from "framer-motion";
import {
  listSessions,
  searchSessions,
  deleteSession,
  type ChatSession,
  type SessionType,
} from "@/services/sessionService";
import { exportSessionAsPDF } from "@/services/exportService";
import { Button } from "@/components/ui/button";

interface HistoryPanelProps {
  currentSessionId: string | null;
  /**
   * When set, the panel is locked to this session type:
   * - filter tabs are hidden
   * - listing always filters to this type
   * - copy adapts ("conversations" vs "recorded interactions")
   */
  lockedType?: SessionType;
  /** Called when user wants to continue a past CHAT session. */
  onContinueChat?: (session: ChatSession) => void;
  /** Called when user wants to view the full timeline of any session. */
  onViewSession: (session: ChatSession) => void;
  /** Creates a fresh chat session. Only shown in chat context. */
  onNewChat?: () => void;
  onClose: () => void;
}

type FilterType = "all" | SessionType;

const FILTERS: { label: string; value: FilterType }[] = [
  { label: "All",       value: "all"       },
  { label: "Chat",      value: "chat"      },
  { label: "Recording", value: "recording" },
];

const HistoryPanel = ({
  currentSessionId,
  lockedType,
  onContinueChat,
  onViewSession,
  onNewChat,
  onClose,
}: HistoryPanelProps) => {
  const [sessions, setSessions]     = useState<ChatSession[]>([]);
  const [query, setQuery]           = useState("");
  // Seed the filter from lockedType so the initial load is already scoped.
  const [filter, setFilter]         = useState<FilterType>(lockedType ?? "all");
  const [loading, setLoading]       = useState(true);
  const [hoveredId, setHoveredId]   = useState<string | null>(null);
  const debounceRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const load = useCallback(async (q: string, f: FilterType) => {
    setLoading(true);
    // lockedType always overrides the tab filter — the UI cannot bypass the context.
    const typeArg = lockedType ?? (f === "all" ? undefined : f);
    const results = q.trim()
      ? await searchSessions(q, typeArg)
      : await listSessions().then((all) =>
          typeArg ? all.filter((s) => s.type === typeArg) : all,
        );
    setSessions(results);
    setLoading(false);
  }, [lockedType]);

  useEffect(() => {
    load(query, filter);
  }, [filter, currentSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce search input
  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(value, filter), 300);
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteSession(id);
    await load(query, filter);
  };

  // ── Formatting ────────────────────────────────────────────────────────────

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const countLabel = (s: ChatSession) => {
    if (s.type === "chat") {
      const n = s.messages?.filter((m) => m.role === "user").length ?? 0;
      return `${n} question${n !== 1 ? "s" : ""}`;
    }
    const n = s.entries?.length ?? 0;
    return `${n} transcript entr${n !== 1 ? "ies" : "y"}`;
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const TypeBadge = ({ type }: { type: SessionType }) =>
    type === "chat" ? (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-md">
        <MessageSquare className="w-2.5 h-2.5" /> Chat
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded-md">
        <Mic className="w-2.5 h-2.5" /> Recording
      </span>
    );

  const AlertBadge = ({ session }: { session: ChatSession }) => {
    if (!session.alertCount) return null;
    if (session.alertCount.danger > 0)
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-md">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
          {session.alertCount.danger} Danger
        </span>
      );
    if (session.alertCount.caution > 0)
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded-md">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
          {session.alertCount.caution} Caution
        </span>
      );
    return null;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 320 }}
      className="absolute inset-y-0 right-0 w-80 bg-card border-l border-border flex flex-col z-20 shadow-2xl"
      role="complementary"
      aria-label={lockedType === "recording" ? "Recording history" : lockedType === "chat" ? "Chat history" : "Session history"}
    >
      {/* ── Panel header ──────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-heading font-bold text-base text-foreground tracking-tight">
            History
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1.5 h-auto text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground/60 mb-3">
          {lockedType === "chat"
            ? "Your legal conversations"
            : lockedType === "recording"
            ? "Your recorded interactions"
            : "Your saved sessions"}
        </p>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={
              lockedType === "recording"
                ? "Search transcripts and alerts..."
                : "Search conversations or transcripts..."
            }
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all"
          />
          {query && (
            <button
              onClick={() => handleQueryChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter chips — hidden when the panel is locked to one type */}
        {!lockedType && (
          <div className="flex gap-1.5">
            {FILTERS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => { setFilter(value); load(query, value); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 ${
                  filter === value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── New session button ─────────────────────────────────────────────── */}
      {onNewChat && (
        <div className="px-3 pt-3 pb-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { onNewChat(); onClose(); }}
            className="w-full justify-start gap-2 text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> New conversation
          </Button>
        </div>
      )}

      {/* ── Session list ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1.5 mt-1">
        {loading && (
          <div className="flex justify-center pt-8">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center pb-10">
            <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center mb-3">
              {lockedType === "recording"
                ? <Mic className="w-5 h-5 text-muted-foreground/30" />
                : <MessageSquare className="w-5 h-5 text-muted-foreground/30" />}
            </div>
            <p className="text-xs font-medium text-muted-foreground/60 mb-1">
              {query ? "No matching sessions" : "No sessions yet"}
            </p>
            <p className="text-[11px] text-muted-foreground/35 leading-relaxed text-center">
              {query
                ? "Try a different search term."
                : lockedType === "recording"
                ? "Stop a recording to save it here."
                : "Your conversations will appear here."}
            </p>
          </div>
        )}

        {!loading &&
          sessions.map((s) => {
            const isActive = s.id === currentSessionId;
            const isHovered = s.id === hoveredId;

            return (
              <div
                key={s.id}
                onMouseEnter={() => setHoveredId(s.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`group rounded-xl border transition-all duration-150 overflow-hidden cursor-pointer ${
                  isActive
                    ? "border-primary/25 bg-primary/8"
                    : "border-border hover:border-border/80 hover:bg-muted/30"
                }`}
                onClick={() => { onViewSession(s); onClose(); }}
              >
                {/* Card body */}
                <div className="px-3 pt-3 pb-2">
                  {/* Badges row — TypeBadge hidden when panel is locked (redundant info) */}
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    {!lockedType && <TypeBadge type={s.type} />}
                    <AlertBadge session={s} />
                  </div>

                  {/* Title */}
                  <p className="text-xs font-semibold text-foreground leading-snug truncate mb-1">
                    {s.title}
                  </p>

                  {/* Summary / preview */}
                  {s.summary && (
                    <p className="text-[11px] text-muted-foreground/70 leading-relaxed line-clamp-2 mb-2">
                      {s.summary}
                    </p>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground/45">
                      {formatDate(s.updatedAt)}
                    </span>
                    <span className="text-[10px] text-muted-foreground/45">
                      {countLabel(s)}
                    </span>
                  </div>
                </div>

                {/* Hover action bar */}
                <div
                  className={`border-t border-border/50 px-2 py-1.5 flex gap-1 transition-all duration-200 ${
                    isHovered ? "opacity-100 max-h-10" : "opacity-0 max-h-0"
                  }`}
                >
                  {/* Continue — only for chat sessions in chat context */}
                  {s.type === "chat" && onContinueChat && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onContinueChat(s);
                        onClose();
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" /> Continue
                    </button>
                  )}

                  {/* View — always available */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewSession(s);
                      onClose();
                    }}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> View
                  </button>

                  {/* Export */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportSessionAsPDF(s);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                  >
                    <Download className="w-3 h-3" /> Export
                  </button>

                  {/* Delete */}
                  <button
                    onClick={(e) => handleDelete(e, s.id)}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[10px] font-medium text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <p className="px-4 py-3 text-[10px] text-muted-foreground/30 text-center border-t border-border shrink-0">
        Saved locally on this device
      </p>
    </motion.div>
  );
};

export default HistoryPanel;
