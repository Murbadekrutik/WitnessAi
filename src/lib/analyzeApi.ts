import type { AnalysisResult } from "@/lib/analysisTypes";
import { analyzeTextLocally } from "@/lib/localAnalysis";

const API_URL = "https://8000-firebase-witnessai-1774625148473.cluster-ys234awlzbhwoxmkkse6qo3fz6.cloudworkstations.dev/api/analyze";
const REQUEST_TIMEOUT_MS = 1500;

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

const normalizeAnalysisResult = (data: Record<string, unknown>): AnalysisResult | null => {
  const rawSeverity = typeof data.severity === "string"
    ? data.severity
    : typeof data.risk_level === "string"
      ? data.risk_level
      : "SAFE";
  const severity = rawSeverity.toUpperCase();
  const message = typeof data.message === "string"
    ? data.message
    : typeof data.advice === "string"
      ? data.advice
      : typeof data.analysis === "string"
        ? data.analysis
        : "";
  const legalReference = typeof data.legal_reference === "string"
    ? data.legal_reference
    : typeof data.article === "string"
      ? data.article
      : undefined;

  if (!message.trim()) {
    return null;
  }

  return {
    severity: severity === "DANGER" || severity === "CAUTION" || severity === "SAFE" ? severity : "SAFE",
    message: message.trim(),
    legal_reference: legalReference,
  };
};

export const analyzeText = async (text: string): Promise<AnalysisResult> => {
  const fallbackAnalysis = analyzeTextLocally(text);
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, session_id: getSessionId() }),
      signal: controller.signal,
    });

    if (!response.ok || response.redirected) {
      console.error("Analysis API error:", response.status, response.redirected ? "redirected" : "");
      return fallbackAnalysis;
    }

    const data = await response.json() as Record<string, unknown>;
    return normalizeAnalysisResult(data) ?? fallbackAnalysis;
  } catch (err) {
    console.error("Analysis API failed:", err);
    return fallbackAnalysis;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};
