import type { AnalysisResult } from "@/lib/analysisTypes";

interface LocalAnalysisRule extends AnalysisResult {
  pattern: RegExp;
}

const SAFE_ANALYSIS: AnalysisResult = {
  severity: "SAFE",
  message: "No immediate rights warning detected. Stay calm and ask for a lawyer if questioning escalates.",
};

const LOCAL_ANALYSIS_RULES: LocalAnalysisRule[] = [
  {
    severity: "DANGER",
    pattern: /\b(confess|admit|accept it|say you did it)\b/i,
    message: "Do not confess or admit guilt. You have the right to remain silent.",
    legal_reference: "Article 20(3)",
  },
  {
    severity: "DANGER",
    pattern: /\b(did you|have you)\s+(do|commit|steal|kill|hit|take)\b/i,
    message: "Questions about guilt can incriminate you. You can remain silent and ask for a lawyer.",
    legal_reference: "Article 20(3)",
  },
  {
    severity: "DANGER",
    pattern: /\b(sign|signature)\b.*\b(document|paper|statement|here|this)\b|\bsign (this|here|the document|the statement)\b/i,
    message: "Do not sign anything you do not understand. Ask for counsel and a copy first.",
    legal_reference: "Article 22(1)",
  },
  {
    severity: "DANGER",
    pattern: /\b(who else|who was with you|name the others)\b/i,
    message: "You are not required to name others during questioning.",
    legal_reference: "Article 20(3)",
  },
  {
    severity: "DANGER",
    pattern: /\b(tell me|tell us)\s+(the truth|everything|what happened)\b|\byou (better|must|have to) (answer|talk|speak)\b/i,
    message: "Coercive questioning is a warning sign. You can remain silent and request a lawyer.",
    legal_reference: "Article 20(3)",
  },
  {
    severity: "DANGER",
    pattern: /\b(don'?t|do not)\s+need\s+(a\s+)?lawyer\b|\bno lawyer\b/i,
    message: "You can ask for a lawyer before answering questions.",
    legal_reference: "Article 22(1)",
  },
  {
    severity: "CAUTION",
    pattern: /\b(get|step)\s+out of (the )?(car|vehicle)\b|\bexit the vehicle\b/i,
    message: "Stay calm, ask whether you are being detained, and avoid volunteering extra information.",
    legal_reference: "Article 21",
  },
  {
    severity: "CAUTION",
    pattern: /\b(check|search|look through|inspect)\b.*\b(car|vehicle|bag|phone|home|house|room|pocket|belongings|trunk)\b|\bopen the trunk\b|\bunlock your phone\b/i,
    message: "Do not consent to a search unless required by law. Ask the legal basis for the search.",
    legal_reference: "Article 21",
  },
  {
    severity: "CAUTION",
    pattern: /\bwhere were you\b|\bwhere are you coming from\b|\bwhere have you been\b|\bwhat were you doing\b|\bwhy were you there\b/i,
    message: "Questions about your movements can be incriminating. You may choose to remain silent.",
    legal_reference: "Article 20(3)",
  },
  {
    severity: "CAUTION",
    pattern: /\bjust answer\b|\banswer my question\b|\bcooperate\b|\bjust a few questions\b/i,
    message: "You can ask if you are free to leave and request a lawyer before answering questions.",
    legal_reference: "Article 22(1)",
  },
];

export const analyzeTextLocally = (text: string): AnalysisResult => {
  const normalizedText = text.replace(/\s+/g, " ").trim();

  if (!normalizedText) {
    return SAFE_ANALYSIS;
  }

  const matchingRule = LOCAL_ANALYSIS_RULES.find(({ pattern }) => pattern.test(normalizedText));

  if (!matchingRule) {
    return SAFE_ANALYSIS;
  }

  return {
    severity: matchingRule.severity,
    message: matchingRule.message,
    legal_reference: matchingRule.legal_reference,
  };
};

export const shouldShowAlert = <T extends { severity: AnalysisResult["severity"] }>(
  analysis: T | null | undefined,
): analysis is T & { severity: "DANGER" | "CAUTION" } =>
  analysis?.severity === "DANGER" || analysis?.severity === "CAUTION";