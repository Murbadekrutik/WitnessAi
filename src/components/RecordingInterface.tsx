import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Shield, AlertTriangle, ArrowLeft, MicVocal, ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import RightsPanel from "./RightsPanel";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { analyzeText, resetSession } from "@/lib/analyzeApi";
import type { AnalysisResult } from "@/lib/analysisTypes";
import { analyzeTextLocally, shouldShowAlert } from "@/lib/localAnalysis";

interface TranscriptEntry {
  id: number;
  timestamp: string;
  text: string;
  flagged: boolean;
  flagReason?: string;
  severity?: "DANGER" | "CAUTION" | "SAFE";
  analysis?: AnalysisResult | null;
  analyzing?: boolean;
}

interface RecordingInterfaceProps {
  onBack: () => void;
}

const RecordingInterface = ({ onBack }: RecordingInterfaceProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [activeAlert, setActiveAlert] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const entryIdRef = useRef(0);
  const alertTimeoutRef = useRef<number | null>(null);

  const showAlert = useCallback((message: string, severity: "DANGER" | "CAUTION" = "DANGER") => {
    if (alertTimeoutRef.current) {
      window.clearTimeout(alertTimeoutRef.current);
    }

    setActiveAlert(message);
    alertTimeoutRef.current = window.setTimeout(() => {
      setActiveAlert(null);
      alertTimeoutRef.current = null;
    }, severity === "CAUTION" ? 3000 : 5000);
  }, []);

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

    if (flaggedImmediately) {
      showAlert(immediateAnalysis.message, immediateAnalysis.severity);
    }

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
            : e
        )
      );

      if (
        shouldAlertFromResolved &&
        (resolvedAnalysis.severity !== immediateAnalysis.severity ||
          resolvedAnalysis.message !== immediateAnalysis.message)
      ) {
        showAlert(resolvedAnalysis.message, resolvedAnalysis.severity);
      }
    });
  }, [elapsed, showAlert]);

  const { isListening, isSupported, interimText, start: startListening, stop: stopListening } =
    useSpeechRecognition({ onResult: handleSpeechResult });

  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        window.clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

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
    entryIdRef.current = 0;
    resetSession();
    startListening();
  };

  const stopRecording = () => {
    if (alertTimeoutRef.current) {
      window.clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }

    setActiveAlert(null);
    setIsRecording(false);
    stopListening();
  };


  return (
    <div className={`min-h-screen flex flex-col border-4 transition-colors ${
      activeAlert ? (
        transcript.some(e => e.severity === "DANGER" && e.flagged) ? "blink-danger" :
        transcript.some(e => e.severity === "CAUTION" && e.flagged) ? "blink-caution" : "blink-safe"
      ) : "border-transparent"
    }`}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-3">
          {isRecording && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse-record" />
              <span className="text-sm font-mono text-danger font-medium">{formatTime(elapsed)}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-primary" />
            <span className="font-heading font-semibold text-foreground">WitnessAI</span>
          </div>
        </div>
      </header>

      {/* Alert overlay */}
      <AnimatePresence>
        {activeAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-4 mt-3 p-4 rounded-lg bg-danger/10 border border-danger/40 pulse-danger"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-danger">⚠️ RIGHTS ALERT</p>
                <p className="text-sm text-foreground mt-1">{activeAlert}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Transcript */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {transcript.length === 0 && !isRecording && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Mic className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Press the button below to start a recording session</p>
                {!isSupported && (
                  <p className="text-xs text-danger mt-2">
                    ⚠️ Your browser doesn't support Speech Recognition. Use Chrome or Edge.
                  </p>
                )}
                <p className="text-xs text-muted-foreground/60 mt-2">
                  Uses your microphone to transcribe speech in real time
                </p>
              </div>
            )}
            {transcript.length === 0 && isRecording && (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse-record" />
                  <span className="text-sm">Listening... speak now</span>
                </div>
              </div>
            )}
            {transcript.map((entry) => {
              const severityStyles = {
                DANGER: "border-danger/40 bg-danger/5",
                CAUTION: "border-warning/40 bg-warning/5",
                SAFE: "border-safe/40 bg-safe/5",
              };
              const borderClass = entry.severity
                ? severityStyles[entry.severity]
                : entry.flagged
                  ? "border-danger/40 bg-danger/5"
                  : "border-border bg-card";

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg border ${borderClass}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
                      {entry.timestamp}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{entry.text}</p>

                      {/* Analyzing spinner */}
                      {entry.analyzing && (
                        <p className="text-xs text-muted-foreground mt-1.5 animate-pulse">
                          🔍 Analyzing...
                        </p>
                      )}

                      {/* AI Analysis result */}
                      {entry.analysis && (
                        <div className="mt-2 flex items-start gap-1.5">
                          {entry.severity === "DANGER" && (
                            <ShieldAlert className="w-3.5 h-3.5 text-danger shrink-0 mt-0.5" />
                          )}
                          {entry.severity === "CAUTION" && (
                            <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                          )}
                          {entry.severity === "SAFE" && (
                            <ShieldCheck className="w-3.5 h-3.5 text-safe shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                              entry.severity === "DANGER" ? "text-danger"
                                : entry.severity === "CAUTION" ? "text-warning"
                                : "text-safe"
                            }`}>
                              {entry.severity}
                            </span>
                            <p className={`text-xs font-medium ${
                              entry.severity === "DANGER" ? "text-danger"
                                : entry.severity === "CAUTION" ? "text-warning"
                                : "text-safe"
                            }`}>
                              {entry.analysis.message}
                            </p>
                            {entry.analysis.legal_reference && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                📖 {entry.analysis.legal_reference}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {/* Interim (live) transcription */}
            {interimText && (
              <div className="p-3 rounded-lg border border-border/50 bg-card/50">
                <div className="flex items-start gap-2">
                  <MicVocal className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5 animate-pulse" />
                  <p className="text-sm text-muted-foreground italic">{interimText}</p>
                </div>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Record button */}
          <div className="p-4 border-t border-border bg-card">
            <div className="flex justify-center">
              {!isRecording ? (
                <Button variant="hero" size="lg" className="px-10 py-6" onClick={startRecording} disabled={!isSupported}>
                  <Mic className="w-5 h-5" />
                  Start Recording
                </Button>
              ) : (
                <Button variant="danger" size="lg" className="px-10 py-6" onClick={stopRecording}>
                  <MicOff className="w-5 h-5" />
                  Stop Recording
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Rights sidebar */}
        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border bg-card p-4">
          <RightsPanel />
        </aside>
      </div>
    </div>
  );
};

export default RecordingInterface;
