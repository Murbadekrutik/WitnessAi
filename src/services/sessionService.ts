/**
 * sessionService.ts — Unified session persistence (chat + recording)
 *
 * All sessions stored in IndexedDB `witnessai_db`, object store `sessions`.
 * Schema is backward-compatible — old records without `type` default to "chat".
 */

import type { ChatMessage } from "@/services/chatService";

export type SessionType = "chat" | "recording";
export type AlertSeverity = "DANGER" | "CAUTION" | "SAFE";

/** A single transcript line from a recording session with its rights analysis. */
export interface RecordingEntry {
  id: number;
  timestamp: string;       // "00:15"
  text: string;
  severity?: AlertSeverity;
  alertMessage?: string;
  legalReference?: string;
  suggestedResponse?: string;
}

/** Unified session record — covers both chat and recording sessions. */
export interface ChatSession {
  id: string;
  type: SessionType;         // legacy records without this field default to "chat"
  title: string;
  summary?: string;          // short auto-generated description
  createdAt: number;
  updatedAt: number;
  duration?: number;         // recording duration in seconds

  // Chat sessions
  messages?: ChatMessage[];

  // Recording sessions
  entries?: RecordingEntry[];
  alertCount?: { danger: number; caution: number };
}

// ── IndexedDB plumbing ──────────────────────────────────────────────────────

const DB_NAME = "witnessai_db";
const STORE   = "sessions";
const VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: "id" });
        s.createIndex("updatedAt", "updatedAt");
      }
    };
  });
}

function txStore(db: IDBDatabase, mode: IDBTransactionMode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

// ── CRUD ────────────────────────────────────────────────────────────────────

/** Create and persist a new empty CHAT session. */
export async function createSession(): Promise<ChatSession> {
  const session: ChatSession = {
    id: crypto.randomUUID(),
    type: "chat",
    title: "New conversation",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  };
  const db = await openDB();
  await new Promise<void>((res, rej) => {
    const req = txStore(db, "readwrite").add(session);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
  return session;
}

/** Create and persist a new RECORDING session. */
export async function createRecordingSession(data: {
  title: string;
  entries: RecordingEntry[];
  duration: number;
  alertCount: { danger: number; caution: number };
}): Promise<ChatSession> {
  const session: ChatSession = {
    id: crypto.randomUUID(),
    type: "recording",
    title: data.title,
    summary: buildRecordingSummary(data.entries, data.alertCount),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    duration: data.duration,
    entries: data.entries,
    alertCount: data.alertCount,
  };
  const db = await openDB();
  await new Promise<void>((res, rej) => {
    const req = txStore(db, "readwrite").add(session);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
  return session;
}

/** Overwrite a session record. */
export async function saveSession(session: ChatSession): Promise<void> {
  const db = await openDB();
  await new Promise<void>((res, rej) => {
    const req = txStore(db, "readwrite").put({ ...session, updatedAt: Date.now() });
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}

/** Return all sessions sorted by most recently updated first. */
export async function listSessions(): Promise<ChatSession[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = txStore(db, "readonly").getAll();
    req.onsuccess = () =>
      resolve(
        (req.result as ChatSession[])
          .map(normalise)
          .sort((a, b) => b.updatedAt - a.updatedAt),
      );
    req.onerror = () => reject(req.error);
  });
}

/** Load a single session. Returns null if not found. */
export async function loadSession(id: string): Promise<ChatSession | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = txStore(db, "readonly").get(id);
    req.onsuccess = () => resolve(req.result ? normalise(req.result as ChatSession) : null);
    req.onerror = () => reject(req.error);
  });
}

/** Permanently delete a session. */
export async function deleteSession(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((res, rej) => {
    const req = txStore(db, "readwrite").delete(id);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}

// ── Search ───────────────────────────────────────────────────────────────────

/** Client-side full-text search across title, summary, messages, and transcript. */
export async function searchSessions(
  query: string,
  typeFilter?: SessionType,
): Promise<ChatSession[]> {
  const all = await listSessions();
  const q = query.toLowerCase().trim();

  return all.filter((s) => {
    if (typeFilter && s.type !== typeFilter) return false;
    if (!q) return true;

    const fields = [
      s.title,
      s.summary ?? "",
      ...(s.messages?.map((m) => m.content) ?? []),
      ...(s.entries?.map((e) => [e.text, e.alertMessage ?? "", e.suggestedResponse ?? ""].join(" ")) ?? []),
    ];
    return fields.some((f) => f.toLowerCase().includes(q));
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Derive a display title from the first user message of a chat session. */
export function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New conversation";
  const t = first.content.trim();
  return t.length > 58 ? t.slice(0, 58) + "…" : t;
}

/** Ensure legacy records (no `type` field) behave correctly. */
function normalise(s: ChatSession): ChatSession {
  return { ...s, type: s.type ?? "chat" };
}

function buildRecordingSummary(
  entries: RecordingEntry[],
  alertCount: { danger: number; caution: number },
): string {
  const totalAlerts = alertCount.danger + alertCount.caution;
  if (totalAlerts === 0) return `${entries.length} transcript entr${entries.length === 1 ? "y" : "ies"} — no rights alerts detected.`;
  const parts: string[] = [];
  if (alertCount.danger > 0) parts.push(`${alertCount.danger} danger alert${alertCount.danger > 1 ? "s" : ""}`);
  if (alertCount.caution > 0) parts.push(`${alertCount.caution} caution alert${alertCount.caution > 1 ? "s" : ""}`);
  return `${entries.length} transcript entr${entries.length === 1 ? "y" : "ies"} — ${parts.join(" and ")} detected.`;
}

/** Nicely format elapsed seconds as Xm Ys. */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
