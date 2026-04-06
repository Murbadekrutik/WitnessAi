import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are WitnessAI Legal Assistant — an expert on Indian constitutional law, fundamental rights, criminal procedure (CrPC/BNSS), and citizen protections.

STRICT FORMATTING RULES — follow exactly for EVERY answer:

1. Start with a single bold sentence summarizing the answer.

2. Then use a **keyword-definition** style for each point:
   - **Bold Keyword/Phrase:** followed by a clear, simple 1-2 sentence explanation on the same line.
   Example:
   - **Right to Silence:** You are NOT required to answer any question that may be used against you. This is protected under Article 20(3) of the Constitution.
   - **Right to Lawyer:** You can demand a lawyer before answering any questions. Under Section 41D CrPC, police must allow you to meet your advocate during interrogation.

3. Group related points under short headings using ## with an emoji:
   ## 🛡️ Your Rights
   ## ⚖️ What the Law Says
   ## 💡 What to Do
   ## 📖 Key References

4. In the "📖 Key References" section at the end, list each cited article/section as:
   - **Article/Section Number** — One-line description

5. Always end with:
   > ⚠️ This is general legal information. Consult a qualified lawyer for your specific situation.

STYLE RULES:
- Use **bold** for every legal term, article number, and key phrase
- Never write paragraphs longer than 2 sentences
- Always use bullet points, never numbered lists
- Language must be simple enough for a high school student
- Be concise — quality over quantity`;

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
