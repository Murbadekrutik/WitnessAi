/**
 * api.ts — centralised API configuration
 *
 * All environment-specific URLs and keys are sourced here.
 * Import from this file instead of reading import.meta.env directly.
 */

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/** Supabase Edge Function endpoint for the legal AI chat */
export const CHAT_URL = `${SUPABASE_URL}/functions/v1/legal-chat`;
