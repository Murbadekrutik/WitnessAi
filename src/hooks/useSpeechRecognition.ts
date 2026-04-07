import { useState, useRef, useCallback, useEffect } from "react";

interface UseSpeechRecognitionOptions {
  onResult: (text: string) => void;
  lang?: string;
  sentenceDelay?: number; // ms to wait before treating accumulated text as a complete sentence
}

export const useSpeechRecognition = ({ onResult, lang = "en-IN", sentenceDelay = 2000 }: UseSpeechRecognitionOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldRestartRef = useRef(false);

  // Sentence accumulation refs
  const accumulatedTextRef = useRef("");
  const flushTimerRef = useRef<number | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const flushAccumulated = useCallback(() => {
    const text = accumulatedTextRef.current.trim();
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
      const finalChunks: string[] = [];
      const interimChunks: string[] = [];

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        if (!transcript) continue;

        if (result.isFinal) {
          finalChunks.push(transcript);
        } else {
          interimChunks.push(transcript);
        }
      }

      const finalText = finalChunks.join(" ").trim();
      const interim = interimChunks.join(" ").trim();

      setInterimText(interim);

      if (finalText) {
        // Accumulate final chunks instead of emitting immediately
        accumulatedTextRef.current = accumulatedTextRef.current
          ? `${accumulatedTextRef.current} ${finalText}`
          : finalText;

        // Reset the flush timer — wait for more words
        if (flushTimerRef.current) {
          window.clearTimeout(flushTimerRef.current);
        }
        flushTimerRef.current = window.setTimeout(flushAccumulated, sentenceDelay);

        setInterimText("");
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
        // Flush any remaining text when stopping
        if (flushTimerRef.current) {
          window.clearTimeout(flushTimerRef.current);
        }
        flushAccumulated();
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    shouldRestartRef.current = true;

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

    // Flush remaining accumulated text
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        window.clearTimeout(flushTimerRef.current);
      }
    };
  }, []);

  return { isListening, isSupported, interimText, start, stop };
};
