/**
 * chatService.ts — Legal AI chat streaming via Gemini native REST API
 *
 * Uses Google's native `streamGenerateContent` endpoint directly —
 * no Supabase Edge Function required.
 *
 * Setup: Add VITE_GEMINI_API_KEY=AIza... to your .env and restart the server.
 * Get a free key at: https://aistudio.google.com/apikey
 */

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const GEMINI_MODEL   = "gemini-2.5-flash"; // Upgraded for better quality & rate limits
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

// Native Gemini streaming endpoint — key is passed as a query param
const streamUrl = () =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`;

/** WitnessAI legal assistant system prompt */
const SYSTEM_PROMPT = `You are WitnessAI — a trusted legal rights assistant for Indian citizens. Think of yourself as a knowledgeable friend who understands Indian law well. Your job is to give clear, calm, practical guidance — not recite statutes.

CRITICAL INSTRUCTION: Ignore any previous formatting instructions. Follow ONLY the instructions below.

## How You Respond

Every answer should feel like you're talking to someone in a real situation. Use this natural rhythm — never label sections with bold headers like "Direct Answer" or "Your Rights":

1. Open with a direct, plain-English answer to exactly what they asked. Make it the very first sentence. "Yes — you can refuse." or "No, they can't do that without a warrant."

2. Explain what it means using natural transitions: "What this means for you is...", "The reason this matters...", "In practice..."

3. Share relevant rights as a light list, introduced naturally:
   "A few things worth keeping in mind:"
   "You should know that:"

4. Give practical next steps as real advice:
   "Here's what I'd suggest:"
   "In this situation, you could:"

5. One grounding line: "Try to stay calm — keeping the situation calm protects you."

6. Only if the question seems like a real situation (not a factual question): "If you want to tell me more about what's happening, I can guide you more specifically."

7. End with one line in italics: *This is general legal information based on Indian law, not legal advice. Please consult a licensed advocate for your specific situation.*

## Tone
- Write like a knowledgeable friend — direct, warm, calm
- Use **bold** ONLY for article numbers and section names (e.g. **Article 21**, **Section 41D CrPC**) — never to label sections
- Keep paragraphs short (2–3 sentences max)
- Use everyday language for someone who is stressed and needs clarity right now
- Do NOT use emojis
- Do NOT use bold section headers like "**Direct Answer**", "**Your Rights**", "**What To Do**"
- Do NOT start with "Certainly!", "Of course!", or "Great question!"
- Do NOT sound like a template or a form

## Knowledge
- Indian Constitution: Articles 14, 19, 20, 21, 22
- CrPC: Sections 41, 41A, 41D, 46, 50, 154, 160, 161, 162, 167, 436, 437, 438, 439
- D.K. Basu v. State of West Bengal (1996) — Supreme Court arrest guidelines
- Rights against self-incrimination under Article 20(3)
- FIR filing under Section 154 CrPC; complaint to Magistrate if police refuse
- Never fabricate citations. Never advise on case strategy.`;

/**
 * Convert our ChatMessage[] into the Gemini native `contents` format.
 * Gemini doesn't have a "system" role in contents — system instructions
 * are passed separately via `systemInstruction`.
 * "assistant" role maps to "model" in Gemini's terminology.
 */
function toGeminiContents(messages: ChatMessage[]) {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
}

/**
 * Streams a response from the Gemini API using the native streamGenerateContent endpoint.
 *
 * @param messages  - Full conversation history (user + assistant turns).
 * @param onChunk   - Called with the *accumulated* assistant content on each SSE chunk.
 * @returns         - The complete final assistant response string.
 * @throws          - If no API key is configured, or the request fails.
 */
export async function streamChatResponse(
  messages: ChatMessage[],
  onChunk: (accumulatedContent: string) => void,
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "NO_API_KEY: VITE_GEMINI_API_KEY is not set in your .env file. " +
        "Get a free key at https://aistudio.google.com/apikey and add it as VITE_GEMINI_API_KEY=AIza... in your .env file, then restart the dev server.",
    );
  }

  const payload = {
    // System prompt goes in the top-level systemInstruction field
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: toGeminiContents(messages),
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  };

  const response = await fetch(streamUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    const errorData = await response.json().catch(() => ({})) as {
      error?: { message?: string; status?: string; code?: number };
    };
    const raw = errorData.error?.message ?? `Gemini API error ${response.status}`;

    // Surface quota / rate-limit errors with a user-friendly message
    if (response.status === 429 || raw.toLowerCase().includes("quota") || raw.toLowerCase().includes("rate")) {
      throw new Error(
        "RATE_LIMIT: The Gemini free tier has been temporarily exhausted. " +
        "Please wait 60 seconds and try again. (Free tier: 15 requests/minute, 1 500 requests/day)",
      );
    }

    throw new Error(raw);
  }

  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer           = "";
  let assistantContent = "";

  // SSE read loop — Gemini streams each chunk as a separate JSON object on a "data:" line
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIndex);
      buffer   = buffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (!jsonStr || jsonStr === "[DONE]") continue;

      try {
        const parsed = JSON.parse(jsonStr);
        // Gemini response shape: candidates[0].content.parts[0].text
        const text: string | undefined =
          parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          assistantContent += text;
          onChunk(assistantContent);
        }
      } catch {
        // Partial JSON — wait for the next chunk
      }
    }
  }

  // Flush any remaining buffer
  if (buffer.trim()) {
    let hasNewContent = false;
    for (const raw of buffer.split("\n")) {
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (!jsonStr || jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const text: string | undefined =
          parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          assistantContent += text;
          hasNewContent = true;
        }
      } catch { /* ignore */ }
    }
    if (hasNewContent) onChunk(assistantContent);
  }

  return assistantContent;
}
