import { useState, useRef, useCallback, useEffect } from "react";

interface UseSpeechRecognitionOptions {
  onResult: (text: string) => void;
  lang?: string;
  sentenceDelay?: number; // ms to wait before treating accumulated text as a complete sentence
}

const normalizeTranscript = (text: string) => text.trim().replace(/\s+/g, " ");

const mergeTranscript = (current: string, next: string) => {
  const normalizedCurrent = normalizeTranscript(current);
  const normalizedNext = normalizeTranscript(next);

  if (!normalizedCurrent) return normalizedNext;
  if (!normalizedNext) return normalizedCurrent;
  if (normalizedCurrent === normalizedNext) return normalizedCurrent;
  if (normalizedNext.startsWith(normalizedCurrent)) return normalizedNext;
  if (normalizedCurrent.startsWith(normalizedNext)) return normalizedCurrent;

  const currentWords = normalizedCurrent.split(" ");
  const nextWords = normalizedNext.split(" ");
  const maxOverlap = Math.min(currentWords.length, nextWords.length);

  for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
    if (
      currentWords.slice(-overlap).join(" ") ===
      nextWords.slice(0, overlap).join(" ")
    ) {
      return [...currentWords, ...nextWords.slice(overlap)].join(" ");
    }
  }

  return `${normalizedCurrent} ${normalizedNext}`;
};

export const useSpeechRecognition = ({ onResult, lang = "en-IN", sentenceDelay = 2000 }: UseSpeechRecognitionOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldRestartRef = useRef(false);
  const accumulatedTextRef = useRef("");
  const flushTimerRef = useRef<number | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const flushAccumulated = useCallback(() => {
    const text = normalizeTranscript(accumulatedTextRef.current);
    if (text) {
      onResultRef.current(text);
    }
    accumulatedTextRef.current = "";
    flushTimerRef.current = null;
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const start = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const interimChunks: string[] = [];

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = normalizeTranscript(result[0].transcript);
        if (!transcript) continue;

        if (result.isFinal) {
          accumulatedTextRef.current = mergeTranscript(accumulatedTextRef.current, transcript);
        } else {
          interimChunks.push(transcript);
        }
      }

      setInterimText(interimChunks.join(" ").trim());

      if (accumulatedTextRef.current) {
        if (flushTimerRef.current) {
          window.clearTimeout(flushTimerRef.current);
        }
        flushTimerRef.current = window.setTimeout(flushAccumulated, sentenceDelay);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setIsListening(false);
        shouldRestartRef.current = false;
      }
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        try {
          recognition.start();
        } catch {
          // Already started
        }
      } else {
        if (flushTimerRef.current) {
          window.clearTimeout(flushTimerRef.current);
        }
        flushAccumulated();
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    shouldRestartRef.current = true;
    accumulatedTextRef.current = "";

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      console.error("Failed to start speech recognition");
    }
  }, [lang, sentenceDelay, flushAccumulated]);

  const stop = useCallback(() => {
    shouldRestartRef.current = false;
    setInterimText("");

    if (flushTimerRef.current) {
      window.clearTimeout(flushTimerRef.current);
    }
    flushAccumulated();

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, [flushAccumulated]);

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        window.clearTimeout(flushTimerRef.current);
      }
    };
  }, []);

  return { isListening, isSupported, interimText, start, stop };
};
