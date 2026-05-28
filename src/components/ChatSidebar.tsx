/**
 * ChatSidebar.tsx — Session history panel
 *
 * Slides in from the right as an overlay. Shows all saved conversations,
 * lets the user switch between them or start a new one.
 */

import { useEffect, useState, useCallback } from "react";
import { X, Plus, Trash2, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { listSessions, deleteSession, type ChatSession } from "@/services/sessionService";
import { Button } from "@/components/ui/button";

interface ChatSidebarProps {
  currentSessionId: string | null;
  onSelectSession: (session: ChatSession) => void;
  onNewChat: () => void;
  onClose: () => void;
}

const ChatSidebar = ({
  currentSessionId,
  onSelectSession,
  onNewChat,
  onClose,
}: ChatSidebarProps) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  const refresh = useCallback(async () => {
    const all = await listSessions();
    setSessions(all.filter((s) => s.type === "chat"));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, currentSessionId]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteSession(id);
    await refresh();
    if (id === currentSessionId) onNewChat();
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 320 }}
      className="absolute inset-y-0 right-0 w-72 bg-card border-l border-border flex flex-col z-20 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border shrink-0">
        <span className="font-heading font-semibold text-sm text-foreground">
          Chat History
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

      {/* New chat button */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onNewChat();
            onClose();
          }}
          className="w-full justify-start gap-2 text-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          New conversation
        </Button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center pb-8">
            <MessageSquare className="w-8 h-8 text-muted-foreground/20 mb-3" />
            <p className="text-xs text-muted-foreground/50 leading-relaxed">
              Your conversations will appear here after your first question.
            </p>
          </div>
        ) : (
          sessions.map((s) => {
            const isActive = s.id === currentSessionId;
            const questionCount = s.messages?.filter((m) => m.role === "user").length ?? 0;
            return (
              <button
                key={s.id}
                onClick={() => {
                  onSelectSession(s);
                  onClose();
                }}
                className={`group w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 flex items-start gap-2.5 ${
                  isActive
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50 border border-transparent"
                }`}
              >
                <MessageSquare
                  className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                    isActive ? "text-primary" : "text-muted-foreground/50"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-medium truncate leading-relaxed ${
                      isActive ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {s.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                    {formatDate(s.updatedAt)}
                    {questionCount > 0 && ` · ${questionCount} question${questionCount !== 1 ? "s" : ""}`}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDelete(e, s.id)}
                  title="Delete conversation"
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-danger/10 shrink-0 mt-0.5"
                >
                  <Trash2 className="w-3 h-3 text-danger/50 hover:text-danger" />
                </button>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <p className="px-4 pb-4 pt-2 text-[10px] text-muted-foreground/30 text-center leading-relaxed border-t border-border shrink-0">
        Saved locally on this device
      </p>
    </motion.div>
  );
};

export default ChatSidebar;
