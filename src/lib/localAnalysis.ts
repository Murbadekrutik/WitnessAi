import type { AnalysisResult } from "@/lib/analysisTypes";

interface LocalAnalysisRule extends AnalysisResult {
  pattern: RegExp;
}

const SAFE_ANALYSIS: AnalysisResult = {
  severity: "SAFE",
  message: "No immediate rights concern detected. Stay calm and remember you can request legal counsel at any time.",
};

/**
 * Local keyword-pattern rules — fire before the Supabase AI analysis arrives.
 *
 * Tone rules:
 * - message    → calm, rights-informing, never commanding
 * - suggested_response → natural spoken language a real person would say
 */
const LOCAL_ANALYSIS_RULES: LocalAnalysisRule[] = [
  {
    severity: "DANGER",
    pattern: /\b(confess|admit|accept it|say you did it)\b/i,
    message:
      "Under Article 20(3), you cannot be forced to say anything that may incriminate you. Any statement made under pressure may not be legally valid.",
    legal_reference: "Article 20(3)",
    suggested_response: "I'd rather not say anything without speaking to a lawyer first.",
  },
  {
    severity: "DANGER",
    pattern: /\b(did you|have you)\s+(do|commit|steal|kill|hit|take)\b/i,
    message:
      "You are not required to answer questions that could incriminate you. Your right to silence is protected under Article 20(3) of the Constitution.",
    legal_reference: "Article 20(3)",
    suggested_response: "I'd prefer not to answer that — could I have a lawyer with me first?",
  },
  {
    severity: "DANGER",
    pattern:
      /\b(sign|signature)\b.*\b(document|paper|statement|here|this)\b|\bsign (this|here|the document|the statement)\b/i,
    message:
      "You have the right to read any document fully and consult a lawyer before signing. You cannot be required to sign something under pressure.",
    legal_reference: "Article 22(1)",
    suggested_response: "I'd like to have my lawyer look at this before I sign anything.",
  },
  {
    severity: "DANGER",
    pattern: /\b(who else|who was with you|name the others)\b/i,
    message:
      "You are not legally required to name or identify other people during questioning. Doing so voluntarily could affect both you and others.",
    legal_reference: "Article 20(3)",
    suggested_response: "I'd rather not answer that.",
  },
  {
    severity: "DANGER",
    pattern:
      /\b(tell me|tell us)\s+(the truth|everything|what happened)\b|\byou (better|must|have to) (answer|talk|speak)\b/i,
    message:
      "You cannot be compelled to speak under pressure. Any statement obtained through coercion may not be admissible and can be challenged in court.",
    legal_reference: "Article 20(3)",
    suggested_response: "I'd like to stop here and speak with a lawyer before we continue.",
  },
  {
    severity: "DANGER",
    pattern: /\b(don'?t|do not)\s+need\s+(a\s+)?lawyer\b|\bno lawyer\b/i,
    message:
      "Regardless of what you are told, you have the constitutional right to legal counsel at any stage — including before you say anything.",
    legal_reference: "Article 22(1)",
    suggested_response: "I do have the right to a lawyer, and I'd like one present before we go any further.",
  },
  {
    severity: "CAUTION",
    pattern: /\b(get|step)\s+out of (the )?(car|vehicle)\b|\bexit the vehicle\b/i,
    message:
      "You may comply calmly with this instruction. It is reasonable to ask whether you are formally detained and under what authority.",
    legal_reference: "Article 21",
    suggested_response: "Of course. Could you tell me — am I being detained right now?",
  },
  {
    severity: "CAUTION",
    pattern:
      /\b(check|search|look through|inspect)\b.*\b(car|vehicle|bag|phone|home|house|room|pocket|belongings|trunk)\b|\bopen the trunk\b|\bunlock your phone\b/i,
    message:
      "You have the right to know the legal basis for any search. Asking calmly whether they have a warrant does not count as resistance.",
    legal_reference: "Article 21",
    suggested_response: "Officer, could you tell me the legal reason for this search?",
  },
  {
    severity: "CAUTION",
    pattern:
      /\bwhere were you\b|\bwhere are you coming from\b|\bwhere have you been\b|\bwhat were you doing\b|\bwhy were you there\b/i,
    message:
      "You are not legally required to disclose your movements unless formally charged. You may choose to remain silent to protect your rights.",
    legal_reference: "Article 20(3)",
    suggested_response: "I'd rather not answer that right now.",
  },
  {
    severity: "CAUTION",
    pattern: /\bjust answer\b|\banswer my question\b|\bcooperate\b|\bjust a few questions\b/i,
    message:
      "You have the right to know whether you are free to leave or being formally detained, and to request a lawyer before answering any questions.",
    legal_reference: "Article 22(1)",
    suggested_response: "Am I free to go? If not, I'd like to speak with a lawyer before saying anything.",
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
    suggested_response: matchingRule.suggested_response,
  };
};

export const shouldShowAlert = <T extends { severity: AnalysisResult["severity"] }>(
  analysis: T | null | undefined,
): analysis is T & { severity: "DANGER" | "CAUTION" } =>
  analysis?.severity === "DANGER" || analysis?.severity === "CAUTION";