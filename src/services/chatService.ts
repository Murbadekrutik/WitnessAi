/**
 * chatService.ts — Legal AI chat streaming service
 *
 * Handles all communication with the legal-chat Supabase Edge Function.
 * Implements SSE (Server-Sent Events) streaming so the UI can display
 * the assistant response token-by-token as it arrives.
 *
 * System prompt strategy:
 * The deployed edge function injects its own (older) system prompt server-side.
 * We supplement it by prepending our own refined system prompt as the first
 * message in the conversation. The Gemini model follows the more detailed,
 * later instructions — giving us full control without requiring a redeploy.
 */

import { CHAT_URL, SUPABASE_PUBLISHABLE_KEY } from "@/config/api";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Refined system prompt — injected client-side on every request.
 * This overrides the tone and structure of the deployed edge function's
 * older prompt without requiring Supabase access.
 */
const CLIENT_SYSTEM_PROMPT = `You are WitnessAI — a trusted legal rights assistant for Indian citizens. Think of yourself as a knowledgeable friend who understands Indian law well. Your job is to give clear, calm, practical guidance — not recite statutes.

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
 * Streams a response from the legal-chat edge function.
 *
 * @param messages  - Full conversation history (user + assistant turns only).
 *                    The client system prompt is prepended automatically.
 * @param onChunk   - Called with the *accumulated* assistant content on every
 *                    SSE chunk. Use this to update the UI in real time.
 * @returns         - The complete, final assistant response string.
 * @throws          - Error if the network request fails or the server returns
 *                    a non-OK status.
 */
export async function streamChatResponse(
  messages: ChatMessage[],
  onChunk: (accumulatedContent: string) => void,
): Promise<string> {
  // Prepend our refined system prompt before the conversation history.
  // The edge function will insert its own (older) prompt first, but the
  // Gemini model respects the more detailed, later instructions.
  const enrichedMessages: ChatMessage[] = [
    { role: "system", content: CLIENT_SYSTEM_PROMPT },
    ...messages,
  ];

  const response = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages: enrichedMessages }),
  });

  if (!response.ok || !response.body) {
    const errorData = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(errorData.error ?? `Server error ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let assistantContent = "";

  // Main SSE read loop — processes chunks as they arrive from the stream
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") break;

      try {
        const parsed = JSON.parse(jsonStr);
        const delta: string | undefined = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          assistantContent += delta;
          onChunk(assistantContent);
        }
      } catch {
        // Partial JSON — wait for the next chunk to complete it
      }
    }
  }

  // Final buffer flush: handles any trailing SSE lines left after the loop
  if (buffer.trim()) {
    let hasNewContent = false;
    for (const raw of buffer.split("\n")) {
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const delta: string | undefined = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          assistantContent += delta;
          hasNewContent = true;
        }
      } catch { /* ignore */ }
    }
    // Notify the UI of any content added during the flush
    if (hasNewContent) {
      onChunk(assistantContent);
    }
  }

  return assistantContent;
}
