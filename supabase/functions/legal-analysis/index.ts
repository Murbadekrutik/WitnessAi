import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LEGAL_SYSTEM_PROMPT = `You are WitnessAI, an expert in Indian constitutional law and citizen rights.
Analyze conversation text for legal risks to the person being questioned.

For each input, respond ONLY in this JSON format:
{
  "risk_level": "SAFE | CAUTION | DANGER",
  "risk_reason": "simple explanation of why this is risky",
  "applicable_right": "name of the Indian legal right that protects them",
  "legal_article": "Article/Section number (e.g. Article 20(3) Constitution of India)",
  "what_to_say": "exact words the person should say right now",
  "pressure_tactic": "yes/no — is the questioner using psychological pressure?",
  "alert_required": true or false
}

Rules:
- DANGER = direct threat to rights (forced confession, signing documents, self-incrimination)
- CAUTION = potentially risky (movement questions, search requests, pressure to cooperate)
- SAFE = neutral conversation, no legal risk detected
- Always consider Indian Constitution Articles 20, 21, 22 and CrPC provisions
- If you detect a pressure tactic pattern (repeated questions, intimidation, urgency), flag it
- "what_to_say" should be a calm, polite phrase the person can use immediately
- Respond ONLY with valid JSON. No explanation outside the JSON.`;

// In-memory session store (per-function instance)
const sessions = new Map<string, Array<{ role: string; content: string }>>();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { text, session_id } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build conversation history for session context
    const sessionKey = session_id || "default";
    if (!sessions.has(sessionKey)) {
      sessions.set(sessionKey, []);
    }
    const history = sessions.get(sessionKey)!;
    history.push({ role: "user", content: `Analyze this statement: "${text}"` });

    // Keep last 20 messages to stay within context limits
    const recentHistory = history.slice(-20);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: LEGAL_SYSTEM_PROMPT },
            ...recentHistory,
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    let content = aiResponse.choices?.[0]?.message?.content || "";

    // Store assistant response in session
    history.push({ role: "assistant", content });

    // Parse JSON from response (strip markdown fences if present)
    content = content.trim();
    if (content.startsWith("```")) {
      content = content.split("```")[1];
      if (content.startsWith("json")) content = content.slice(4);
    }

    let parsed;
    try {
      parsed = JSON.parse(content.trim());
    } catch {
      // Fallback
      parsed = {
        risk_level: "SAFE",
        risk_reason: "Could not analyze",
        applicable_right: "Right to remain silent",
        legal_article: "Article 20(3)",
        what_to_say: "I would like to consult my lawyer before answering.",
        pressure_tactic: "no",
        alert_required: false,
      };
    }

    // Normalize to match frontend AnalysisResult shape
    const severity =
      parsed.risk_level === "DANGER" || parsed.risk_level === "CAUTION"
        ? parsed.risk_level
        : "SAFE";

    const message = parsed.what_to_say || parsed.risk_reason || "";
    const result = {
      severity,
      message,
      legal_reference: parsed.legal_article,
      risk_reason: parsed.risk_reason,
      applicable_right: parsed.applicable_right,
      pressure_tactic: parsed.pressure_tactic,
      alert_required: parsed.alert_required,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("legal-analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
