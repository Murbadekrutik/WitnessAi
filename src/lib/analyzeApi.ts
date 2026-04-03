const RAW_API_URL = "https://8000-firebase-witnessai-1774625148473.cluster-ys234awlzbhwoxmkkse6qo3fz6.cloudworkstations.dev/api/analyze";
const API_URL = `https://corsproxy.io/?url=${encodeURIComponent(RAW_API_URL)}`;

export interface AnalysisResult {
  severity: "DANGER" | "CAUTION" | "SAFE";
  message: string;
  legal_reference?: string;
}

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

export const analyzeText = async (text: string): Promise<AnalysisResult | null> => {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, session_id: getSessionId() }),
    });

    if (!response.ok) {
      console.error("Analysis API error:", response.status);
      return null;
    }

    const data = await response.json();
    return {
      severity: data.severity || data.risk_level || "SAFE",
      message: data.message || data.advice || data.analysis || "",
      legal_reference: data.legal_reference || data.article || undefined,
    };
  } catch (err) {
    console.error("Analysis API failed:", err);
    return null;
  }
};
