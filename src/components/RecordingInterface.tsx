import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic, MicOff, Shield, AlertTriangle, ArrowLeft,
  MicVocal, ShieldCheck, ShieldAlert, CheckCircle2, Eye, Download, History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import RightsPanel from "./RightsPanel";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { analyzeText, resetSession } from "@/lib/analyzeApi";
import type { AnalysisResult } from "@/lib/analysisTypes";
import { analyzeTextLocally, shouldShowAlert } from "@/lib/localAnalysis";
import { createRecordingSession, type ChatSession, type RecordingEntry } from "@/services/sessionService";
import { exportSessionAsPDF } from "@/services/exportService";
import SessionDetail from "@/components/SessionDetail";
import HistoryPanel from "@/components/HistoryPanel";

type AlertSeverity = "DANGER" | "CAUTION" | "SAFE";

interface TranscriptEntry {
  id: number;
  timestamp: string;
  text: string;
  flagged: boolean;
  flagReason?: string;
  severity?: AlertSeverity;
  analysis?: AnalysisResult | null;
  analyzing?: boolean;
}

interface ActiveAlert {
  message: string;
  severity: AlertSeverity;
  /** Optional calm phrase the user can say aloud to assert their rights. */
  suggested_response?: string;
}

interface RecordingInterfaceProps {
  onBack: () => void;
}

/** Returns Tailwind classes for a transcript entry based on severity. */
const transcriptEntryClass = (severity?: AlertSeverity, flagged?: boolean): string => {
  if (severity === "DANGER" || (flagged && !severity)) return "border-danger/30 bg-danger/5";
  if (severity === "CAUTION") return "border-warning/30 bg-warning/5";
  if (severity === "SAFE") return "border-safe/25 bg-safe/5";
  return "border-border bg-card";
};

const RecordingInterface = ({ onBack }: RecordingInterfaceProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [savedSession, setSavedSession] = useState<ChatSession | null>(null);
  const [detailSession, setDetailSession] = useState<ChatSession | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const elapsedRef = useRef(0);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const entryIdRef = useRef(0);
  const alertTimeoutRef = useRef<number | null>(null);
  const alertDebounceRef = useRef<number | null>(null);
  const pendingAlertRef = useRef<{ message: string; severity: AlertSeverity; suggested_response?: string } | null>(null);

  // ── Alert logic ────────────────────────────────────────────────────────────
  const showAlert = useCallback(
    (message: string, severity: AlertSeverity = "DANGER", suggested_response?: string) => {
      // Debounce so we wait for the full sentence before showing an alert
      pendingAlertRef.current = { message, severity, suggested_response };

      if (alertDebounceRef.current) window.clearTimeout(alertDebounceRef.current);

      alertDebounceRef.current = window.setTimeout(() => {
        const pending = pendingAlertRef.current;
        if (!pending) return;
        pendingAlertRef.current = null;

        if (alertTimeoutRef.current) window.clearTimeout(alertTimeoutRef.current);

        setActiveAlert({
          message: pending.message,
          severity: pending.severity,
          suggested_response: pending.suggested_response,
        });

        if (navigator.vibrate) {
          const pattern =
            pending.severity === "DANGER"  ? [200, 100, 200, 100, 300] :
            pending.severity === "CAUTION" ? [150, 80, 150] : [100];
          navigator.vibrate(pattern);
        }

        alertTimeoutRef.current = window.setTimeout(() => {
          setActiveAlert(null);
          alertTimeoutRef.current = null;
        }, pending.severity === "CAUTION" ? 3000 : 5000);
      }, 1500);
    },
    [],
  );

  // ── Speech result handler ──────────────────────────────────────────────────
  const handleSpeechResult = useCallback((text: string) => {
    const immediateAnalysis = analyzeTextLocally(text);
    const flaggedImmediately = shouldShowAlert(immediateAnalysis);
    const id = entryIdRef.current++;

    const entry: TranscriptEntry = {
      id,
      timestamp: formatTime(elapsed),
      text,
      flagged: flaggedImmediately,
      flagReason: flaggedImmediately ? immediateAnalysis.message : undefined,
      severity: immediateAnalysis.severity,
      analysis: immediateAnalysis,
      analyzing: false,
    };
    setTranscript((prev) => [...prev, entry]);

    if (flaggedImmediately)
      showAlert(immediateAnalysis.message, immediateAnalysis.severity, immediateAnalysis.suggested_response);

    // Upgrade with AI analysis when it arrives
    analyzeText(text).then((resolvedAnalysis: AnalysisResult) => {
      const shouldAlertFromResolved = shouldShowAlert(resolvedAnalysis);
      setTranscript((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                analysis: resolvedAnalysis,
                severity: resolvedAnalysis.severity,
                analyzing: false,
                flagged: shouldAlertFromResolved,
                flagReason: shouldAlertFromResolved ? resolvedAnalysis.message : undefined,
              }
            : e,
        ),
      );

      if (
        shouldAlertFromResolved &&
        (resolvedAnalysis.severity !== immediateAnalysis.severity ||
          resolvedAnalysis.message !== immediateAnalysis.message)
      ) {
        showAlert(
          resolvedAnalysis.message,
          resolvedAnalysis.severity,
          resolvedAnalysis.suggested_response,
        );
      }
    });
  }, [elapsed, showAlert]);

  const { isListening, isSupported, interimText, start: startListening, stop: stopListening } =
    useSpeechRecognition({ onResult: handleSpeechResult });

  // ── Side effects ───────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) window.clearTimeout(alertTimeoutRef.current);
      if (alertDebounceRef.current) window.clearTimeout(alertDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const startRecording = () => {
    if (alertTimeoutRef.current) {
      window.clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
    setActiveAlert(null);
    setIsRecording(true);
    setTranscript([]);
    setElapsed(0);
    setSavedSession(null);
    entryIdRef.current = 0;
    resetSession();
    startListening();
  };

  const stopRecording = async () => {
    if (alertTimeoutRef.current) {
      window.clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
    setActiveAlert(null);
    setIsRecording(false);
    stopListening();

    // Auto-save the recording session to IndexedDB
    const currentTranscript = transcriptRef.current;
    const currentElapsed = elapsedRef.current;
    if (currentTranscript.length === 0) return;

    const entries: RecordingEntry[] = currentTranscript.map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      text: e.text,
      severity: e.severity,
      alertMessage: e.analysis?.message,
      legalReference: e.analysis?.legal_reference,
      suggestedResponse: e.analysis?.suggested_response,
    }));

    const dangerCount  = entries.filter((e) => e.severity === "DANGER").length;
    const cautionCount = entries.filter((e) => e.severity === "CAUTION").length;
    const raw = currentTranscript[0]?.text ?? "";
    const title = (raw.length > 55 ? raw.slice(0, 55) + "…" : raw) ||
      `Recording — ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

    try {
      const session = await createRecordingSession({
        title,
        entries,
        duration: currentElapsed,
        alertCount: { danger: dangerCount, caution: cautionCount },
      });
      setSavedSession(session);
    } catch (err) {
      console.error("Failed to save recording session:", err);
    }
  };

  // ── Derived alert styling ──────────────────────────────────────────────────
  const appBorderClass = activeAlert
    ? activeAlert.severity === "DANGER"  ? "border-danger/70 blink-danger"
    : activeAlert.severity === "CAUTION" ? "border-warning/70 blink-caution"
    : "border-safe/70 blink-safe"
    : "border-transparent";

  const alertPanelClass = activeAlert
    ? activeAlert.severity === "DANGER"  ? "bg-danger/10 border-danger/30"
    : activeAlert.severity === "CAUTION" ? "bg-warning/10 border-warning/30"
    : "bg-safe/10 border-safe/30"
    : "bg-card border-border";

  const alertTextClass = activeAlert
    ? activeAlert.severity === "DANGER"  ? "text-danger"
    : activeAlert.severity === "CAUTION" ? "text-warning"
    : "text-safe"
    : "text-foreground";

  // Clean, professional titles — no emojis
  const alertTitle = activeAlert
    ? activeAlert.severity === "DANGER"  ? "Rights Alert"
    : activeAlert.severity === "CAUTION" ? "Caution"
    : "Safe to Proceed"
    : "";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* SessionDetail overlay */}
      <AnimatePresence>
        {detailSession && (
          <SessionDetail
            session={detailSession}
            onClose={() => setDetailSession(null)}
          />
        )}
      </AnimatePresence>

      {/* Recording history panel + backdrop */}
      <AnimatePresence>
        {showHistory && !detailSession && (
          <>
            <motion.div
              key="rec-history-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10"
              onClick={() => setShowHistory(false)}
            />
            <HistoryPanel
              currentSessionId={savedSession?.id ?? null}
              lockedType="recording"
              onViewSession={(s) => { setDetailSession(s); setShowHistory(false); }}
              onClose={() => setShowHistory(false)}
            />
          </>
        )}
      </AnimatePresence>
      {/* Full-screen severity border */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-50 border-[5px] ${appBorderClass}`}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center px-4 py-3.5 border-b border-border bg-card shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
        </Button>

        <div className="flex items-center gap-3 ml-auto">
          {/* Live recording badge */}
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-danger/10 border border-danger/20">
              <span className="w-2 h-2 rounded-full bg-danger animate-pulse-record" />
              <span className="text-xs font-mono text-danger font-semibold tracking-wide">
                {formatTime(elapsed)}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-heading font-semibold text-foreground text-sm tracking-tight">
              WitnessAI
            </span>
          </div>
          {/* Recording history button — disabled while live recording */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory((v) => !v)}
            disabled={isRecording}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            title="Recording history"
          >
            <History className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* ── Alert panel ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeAlert && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className={`mx-4 mt-3 rounded-xl border p-4 ${alertPanelClass}`}
          >
            <div className="flex items-start gap-3">
              {activeAlert.severity === "DANGER" && (
                <ShieldAlert className={`w-5 h-5 shrink-0 mt-0.5 ${alertTextClass}`} />
              )}
              {activeAlert.severity === "CAUTION" && (
                <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${alertTextClass}`} />
              )}
              {activeAlert.severity === "SAFE" && (
                <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${alertTextClass}`} />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${alertTextClass}`}>
                  {alertTitle}
                </p>
                <p className="text-sm text-foreground leading-relaxed">{activeAlert.message}</p>

                {/* Suggested response phrase — calm, rights-based */}
                {activeAlert.suggested_response && (
                  <div className="mt-3 pt-2.5 border-t border-white/10">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      You may say
                    </p>
                    <p className={`text-xs leading-relaxed italic border-l-2 pl-2.5 ${alertTextClass} opacity-80`}>
                      &ldquo;{activeAlert.suggested_response}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">

        {/* Transcript column */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">

            {/* State: idle, no transcript */}
            {transcript.length === 0 && !isRecording && (
              <div className="flex flex-col items-center justify-center h-full py-10 px-4 text-center">
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-5">
                  <Mic className="w-8 h-8 text-muted-foreground/25" />
                </div>

                <h3 className="font-heading font-semibold text-sm text-foreground mb-1.5">
                  Ready to Record
                </h3>
                <p className="text-xs text-muted-foreground/65 max-w-xs mb-7 leading-relaxed">
                  Your microphone will capture speech in real time and silently alert you
                  if a question could violate your constitutional rights.
                </p>

                {/* 3-step guide */}
                <div className="w-full max-w-xs space-y-2.5 mb-7">
                  {[
                    { step: "1", text: "Press Start Recording below" },
                    { step: "2", text: "Hold device near the conversation" },
                    { step: "3", text: "Watch for alerts at the screen border" },
                  ].map(({ step, text }) => (
                    <div
                      key={step}
                      className="flex items-center gap-3 text-left px-4 py-3 rounded-xl bg-card border border-border"
                    >
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                        {step}
                      </span>
                      <p className="text-xs text-muted-foreground">{text}</p>
                    </div>
                  ))}
                </div>

                {/* Disclaimer */}
                <p className="text-[11px] text-muted-foreground/40 max-w-xs leading-relaxed">
                  General legal information based on Indian law.
                  <br />
                  For critical situations, contact a licensed advocate.
                </p>

                {!isSupported && (
                  <p className="text-xs text-danger mt-5 font-medium">
                    Speech recognition is not supported. Please use Chrome or Edge.
                  </p>
                )}
              </div>
            )}

            {/* State: recording, no speech yet */}
            {transcript.length === 0 && isRecording && (
              <div className="flex items-center justify-center h-full py-16">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse-record" />
                  <span className="text-sm">Listening — speak now</span>
                </div>
              </div>
            )}

            {/* Transcript entries */}
            {transcript.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`p-3.5 rounded-xl border ${transcriptEntryClass(entry.severity, entry.flagged)}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0 mt-0.5 tabular-nums">
                    {entry.timestamp}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-relaxed">{entry.text}</p>

                    {entry.analyzing && (
                      <p className="text-[11px] text-muted-foreground/50 mt-1.5 animate-pulse">
                        Analysing…
                      </p>
                    )}

                    {entry.analysis && (
                      <div className="mt-2 flex items-start gap-2">
                        {entry.severity === "DANGER" && (
                          <ShieldAlert className="w-3 h-3 text-danger shrink-0 mt-0.5" />
                        )}
                        {entry.severity === "CAUTION" && (
                          <AlertTriangle className="w-3 h-3 text-warning shrink-0 mt-0.5" />
                        )}
                        {entry.severity === "SAFE" && (
                          <ShieldCheck className="w-3 h-3 text-safe shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            entry.severity === "DANGER"  ? "text-danger"
                            : entry.severity === "CAUTION" ? "text-warning"
                            : "text-safe"
                          }`}>
                            {entry.severity}
                          </span>
                          <p className={`text-xs leading-relaxed mt-0.5 ${
                            entry.severity === "DANGER"  ? "text-danger"
                            : entry.severity === "CAUTION" ? "text-warning"
                            : "text-safe"
                          }`}>
                            {entry.analysis.message}
                          </p>
                          {entry.analysis.legal_reference && (
                            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                              Ref:&nbsp;{entry.analysis.legal_reference}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Live interim transcription */}
            {interimText && (
              <div className="p-3.5 rounded-xl border border-border/40 bg-background/40">
                <div className="flex items-center gap-2.5">
                  <MicVocal className="w-3.5 h-3.5 text-primary shrink-0 animate-pulse" />
                  <p className="text-sm text-muted-foreground/65 italic">{interimText}</p>
                </div>
              </div>
            )}

            <div ref={transcriptEndRef} />
          </div>

          {/* ── Session saved banner ──────────────────────────────────────── */}
          <AnimatePresence>
            {savedSession && !isRecording && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                className="mx-4 mb-3 rounded-xl border border-safe/25 bg-safe/5 px-4 py-3 flex items-center gap-3"
              >
                <CheckCircle2 className="w-4 h-4 text-safe shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">Session saved</p>
                  <p className="text-[11px] text-muted-foreground/60 truncate">{savedSession.title}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDetailSession(savedSession)}
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0 h-8 px-2.5"
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportSessionAsPDF(savedSession)}
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0 h-8 px-2.5"
                >
                  <Download className="w-3.5 h-3.5" /> Export
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Record / Stop control ─────────────────────────────────────── */}
          <div className="p-4 border-t border-border bg-card shrink-0">
            <div className="flex justify-center">
              {!isRecording ? (
                <Button
                  variant="hero"
                  size="lg"
                  className="px-10 py-6"
                  onClick={startRecording}
                  disabled={!isSupported}
                >
                  <Mic className="w-5 h-5" />
                  Start Recording
                </Button>
              ) : (
                /* Pulsing ring on the stop button to reinforce "live" state */
                <div className="relative inline-flex">
                  <span className="absolute inset-0 rounded-md bg-danger/25 animate-ping opacity-60" />
                  <Button
                    variant="danger"
                    size="lg"
                    className="relative px-10 py-6"
                    onClick={stopRecording}
                  >
                    <MicOff className="w-5 h-5" />
                    Stop Recording
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rights sidebar */}
        <aside className="w-full lg:w-[300px] border-t lg:border-t-0 lg:border-l border-border bg-card/50 p-4 overflow-y-auto">
          <RightsPanel />
        </aside>
      </div>
    </div>
  );
};

export default RecordingInterface;
