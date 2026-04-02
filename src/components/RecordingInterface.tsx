import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Shield, AlertTriangle, ArrowLeft, MicVocal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import RightsPanel from "./RightsPanel";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface TranscriptEntry {
  id: number;
  timestamp: string;
  text: string;
  flagged: boolean;
  flagReason?: string;
}

const DANGEROUS_PATTERNS = [
  { pattern: /where were you/i, reason: "You are NOT required to provide your location history." },
  { pattern: /did you (do|commit|steal|kill|hit)/i, reason: "You have the right to remain silent. Do NOT answer." },
  { pattern: /confess|admit|accept/i, reason: "⚠️ DANGER: You cannot be compelled to confess. Article 20(3)." },
  { pattern: /sign (this|here|the document)/i, reason: "Do NOT sign without reading. Ask for a copy first." },
  { pattern: /who (else |was )?with you/i, reason: "You are not obligated to name others." },
  { pattern: /tell (me|us) (the truth|everything|what happened)/i, reason: "You have the right to remain silent under Article 20(3)." },
  { pattern: /you (better|must|have to) (answer|tell|speak|talk)/i, reason: "This is coercion. You are NOT compelled to speak." },
];
interface RecordingInterfaceProps {
  onBack: () => void;
}

const RecordingInterface = ({ onBack }: RecordingInterfaceProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [activeAlert, setActiveAlert] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const checkDangerous = (text: string) => {
    for (const { pattern, reason } of DANGEROUS_PATTERNS) {
      if (pattern.test(text)) return reason;
    }
    return null;
  };

  const startRecording = () => {
    setIsRecording(true);
    setTranscript([]);
    setElapsed(0);

    timeoutRefs.current = SIMULATED_TRANSCRIPT.map((item, i) =>
      setTimeout(() => {
        const flagReason = checkDangerous(item.text);
        const entry: TranscriptEntry = {
          id: i,
          timestamp: formatTime(item.delay / 1000),
          text: item.text,
          flagged: !!flagReason,
          flagReason: flagReason || undefined,
        };
        setTranscript((prev) => [...prev, entry]);
        if (flagReason) {
          setActiveAlert(flagReason);
          setTimeout(() => setActiveAlert(null), 4000);
        }
      }, item.delay)
    );
  };

  const stopRecording = () => {
    setIsRecording(false);
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
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
                <p className="text-xs text-muted-foreground/60 mt-2">
                  Demo mode: simulated interrogation transcript
                </p>
              </div>
            )}
            {transcript.length === 0 && isRecording && (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse-record" />
                  <span className="text-sm">Listening...</span>
                </div>
              </div>
            )}
            {transcript.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-lg border ${
                  entry.flagged
                    ? "border-danger/40 bg-danger/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
                    {entry.timestamp}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{entry.text}</p>
                    {entry.flagged && entry.flagReason && (
                      <div className="mt-2 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-danger shrink-0 mt-0.5" />
                        <p className="text-xs font-medium text-danger">{entry.flagReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            <div ref={transcriptEndRef} />
          </div>

          {/* Record button */}
          <div className="p-4 border-t border-border bg-card">
            <div className="flex justify-center">
              {!isRecording ? (
                <Button variant="hero" size="lg" className="px-10 py-6" onClick={startRecording}>
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
