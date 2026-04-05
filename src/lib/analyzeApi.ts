import type { AnalysisResult } from "@/lib/analysisTypes";
import { analyzeTextLocally } from "@/lib/localAnalysis";
import { supabase } from "@/integrations/supabase/client";

const REQUEST_TIMEOUT_MS = 15000;

let sessionId: string | null = null;

const getSessionId = () => {
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  return sessionId;
};

export const resetSession = () => {
  sessionId = null;
};

export const analyzeText = async (text: string): Promise<AnalysisResult> => {
  const fallbackAnalysis = analyzeTextLocally(text);
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const { data, error } = await supabase.functions.invoke("legal-analysis", {
      body: { text, session_id: getSessionId() },
    });

    if (error) {
      console.error("Legal analysis edge function error:", error);
      return fallbackAnalysis;
    }

    if (!data || !data.severity || !data.message) {
      return fallbackAnalysis;
    }

    const severity = (data.severity as string).toUpperCase();
    return {
      severity: severity === "DANGER" || severity === "CAUTION" ? severity : "SAFE",
      message: data.message,
      legal_reference: data.legal_reference,
    };
  } catch (err) {
    console.error("Legal analysis failed:", err);
    return fallbackAnalysis;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};
