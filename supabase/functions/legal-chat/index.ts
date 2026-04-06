import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are WitnessAI Legal Assistant — an expert on Indian constitutional law, fundamental rights, criminal procedure (CrPC/BNSS), and citizen protections.

Your role:
- Answer questions about Indian laws, constitutional articles, legal rights, and procedures
- Help users understand their rights during police encounters, arrests, interrogations, and custody
- Cover topics like: fundamental rights (Articles 14-32), criminal procedure, bail, FIR, arrest guidelines, D.K. Basu guidelines, right to silence, search & seizure, etc.

FORMATTING RULES (follow strictly):
1. Start every answer with a one-line **bold summary** of the key takeaway.
2. Use **headings** (##) to break the answer into clear sections like "📜 What the Law Says", "🛡️ Your Rights", "⚖️ Key Legal Provisions", "💡 What You Should Do", "⚠️ Important Notes".
3. Use **bullet points** for lists — never write long paragraphs.
4. Always cite the specific **Article, Section, or case law** in bold (e.g., **Article 21**, **Section 41D CrPC**).
5. Use a "📖 **Key References**" section at the end listing all cited articles/sections.
6. Keep language **simple and jargon-free** — explain as if the reader is a 10th-grade student.
7. End with a short ⚠️ disclaimer: "This is general legal information. For your specific situation, consult a qualified lawyer."
8. Use emojis sparingly for section headers to improve scannability.
9. Keep answers **concise but complete** — prefer structured brevity over long explanations.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("legal-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
