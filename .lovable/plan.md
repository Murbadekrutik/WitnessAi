

# WitnessAI — Current Status & Recommended Next Step

## Where You Are Now

Based on the guide's 10-day roadmap, here's what's been completed and what's pending:

| Guide Step | Status | Notes |
|---|---|---|
| **Day 1: UI Design** | Done | Landing page (HeroSection), RecordingInterface with transcript panel, alert overlay, and RightsPanel sidebar — all built in React |
| **Day 2: Project Structure** | Done | React + Vite + TypeScript project is set up and running |
| **Day 3: Speech Engine** | Partially Done | Using browser's built-in Web Speech API (SpeechRecognition). Works but is less accurate than AssemblyAI. No AssemblyAI integration yet |
| **Day 4: Legal AI Brain** | Partially Done | Local regex-based pattern matching works (localAnalysis.ts with DANGER/CAUTION rules). Remote API endpoint exists but returns auth errors — no working Gemini 2.5 Pro integration |
| **Day 5: Legal Rights Database** | Partially Done | RightsPanel has 6 hardcoded rights. Guide recommends 50+ rights built via NotebookLM research |
| **Day 6: Alerts System** | Done | Full-screen blinking border (red/yellow/green), alert overlay panel, vibration feedback — all working |
| **Day 7: Frontend-Backend Connection** | Not Done | No Python backend exists. Everything runs client-side |
| **Day 8: Testing** | Not Done |
| **Day 9: Deployment** | Not Done |
| **Day 10: Launch** | Not Done |

### Summary
You have a solid React frontend with: landing page, live speech transcription (browser API), local pattern-matching alerts with blinking borders and vibration, and a rights reference panel. The major gaps are: no AI-powered legal analysis (Gemini), no real-time streaming STT (AssemblyAI), and a limited rights database.

---

## Recommended Next Step: Connect Gemini 2.5 Pro as the Legal AI Brain

This is **Day 4** from the guide and the highest-impact upgrade you can make right now. Your local regex rules only catch ~10 specific phrases. Gemini 2.5 Pro would understand *any* phrasing and provide intelligent, contextual legal analysis.

### What we'd build:

1. **Set up a Supabase Edge Function** (since Lovable can't run a Python backend) that proxies requests to Google's Gemini 2.5 Pro API with the legal system prompt from the guide
2. **Update `analyzeApi.ts`** to call this edge function instead of the failing external API
3. **Include the full legal system prompt** from the guide (risk_level, applicable_right, legal_article, what_to_say, pressure_tactic fields)
4. **Maintain session context** so Gemini can track conversation patterns across the full interrogation
5. **Keep the local regex fallback** for instant alerts while Gemini processes in the background

### What you'll need:
- A **Gemini API key** from aistudio.google.com (free, 1M tokens/day)
- A **Supabase connection** in Lovable (to create the Edge Function)

### Why this step first:
- The local regex only matches ~10 hardcoded phrases — any rephrasing bypasses it
- Gemini understands context ("They've asked about your location 4 times — pressure tactic")
- It's the core intelligence of the app — everything else (voice alerts, session storage, export) builds on top of good analysis

Shall I proceed with this plan, or would you prefer a different step from the guide (like expanding the rights database or adding session storage)?

