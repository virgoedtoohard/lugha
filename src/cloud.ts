// Accounts, progress sync and reviewer content — backed by Supabase.
// The app still works fully offline / as a guest when config.js is left empty.

import type { ContentOverride, Progress } from "./types.js";

interface LughaConfig { supabaseUrl?: string; supabaseAnonKey?: string }
declare global {
  interface Window { LUGHA_CONFIG?: LughaConfig; supabase?: { createClient: (url: string, key: string) => any } }
}

export interface CloudUser { id: string; email: string; name: string; role: "learner" | "reviewer" | "admin" }

const SUPABASE_SRC = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
let client: any = null;
let user: CloudUser | null = null;
const authListeners = new Set<(u: CloudUser | null) => void>();

export function isConfigured(): boolean {
  const c = window.LUGHA_CONFIG;
  return !!(c?.supabaseUrl && c?.supabaseAnonKey);
}

export function isReady(): boolean { return !!client; }
export function currentUser(): CloudUser | null { return user; }
export function onAuthChange(fn: (u: CloudUser | null) => void): void { authListeners.add(fn); }

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load " + src));
    document.head.appendChild(s);
  });
}

export async function initCloud(): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    if (!window.supabase) await loadScript(SUPABASE_SRC);
    const cfg = window.LUGHA_CONFIG!;
    client = window.supabase!.createClient(cfg.supabaseUrl!, cfg.supabaseAnonKey!);
    const { data } = await client.auth.getSession();
    await setUserFromSession(data?.session);
    client.auth.onAuthStateChange((_evt: string, session: any) => { void setUserFromSession(session); });
    return true;
  } catch (e) {
    console.warn("[lugha] cloud unavailable, continuing offline", e);
    client = null;
    return false;
  }
}

async function setUserFromSession(session: any): Promise<void> {
  const prevId = user?.id ?? null;
  if (!session?.user) {
    user = null;
  } else {
    const u = session.user;
    let role: CloudUser["role"] = "learner";
    let name = u.user_metadata?.display_name ?? u.email?.split("@")[0] ?? "Learner";
    const { data } = await client.from("profiles").select("display_name, role").eq("id", u.id).maybeSingle();
    if (data) { role = data.role ?? role; name = data.display_name || name; }
    user = { id: u.id, email: u.email ?? "", name, role };
  }
  if ((user?.id ?? null) !== prevId || user) authListeners.forEach((fn) => fn(user));
}

function need(): void { if (!client) throw new Error("Accounts aren't set up yet — add your Supabase keys to config.js."); }

export async function signUp(email: string, password: string, displayName: string): Promise<string> {
  need();
  const { data, error } = await client.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
  if (error) throw error;
  return data.session ? "signed-in" : "check-email";
}

export async function signIn(email: string, password: string): Promise<void> {
  need();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  if (client) await client.auth.signOut();
}

// ---------- Progress sync ----------
export async function pullProgress(): Promise<Progress | null> {
  if (!client || !user) return null;
  const { data, error } = await client.from("progress").select("data").eq("user_id", user.id).maybeSingle();
  if (error) { console.warn(error); return null; }
  return (data?.data as Progress) ?? null;
}

let pushTimer: number | undefined;
export function pushProgressSoon(p: Progress): void {
  if (!client || !user) return;
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => { void pushProgress(p); }, 1500);
}

export async function pushProgress(p: Progress): Promise<void> {
  if (!client || !user) return;
  const { error } = await client.from("progress").upsert({ user_id: user.id, data: p, updated_at: new Date().toISOString() });
  if (error) console.warn("[lugha] sync failed", error);
}

// ---------- Reviewer content ----------
export async function fetchOverrides(): Promise<ContentOverride[] | null> {
  if (!client) return null;
  const { data, error } = await client.from("content_overrides").select("*");
  if (error) { console.warn(error); return null; }
  return data as ContentOverride[];
}

export async function saveOverride(o: ContentOverride): Promise<void> {
  need();
  const { error } = await client.from("content_overrides").upsert({ ...o, reviewed_by: user?.id, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function uploadAudio(itemId: string, blob: Blob): Promise<string> {
  need();
  const ext = blob.type.includes("mpeg") ? "mp3" : blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "m4a" : "webm";
  const path = `${itemId}-${Date.now()}.${ext}`;
  const { error } = await client.storage.from("audio").upload(path, blob, { contentType: blob.type || "audio/webm", upsert: true });
  if (error) throw error;
  return client.storage.from("audio").getPublicUrl(path).data.publicUrl as string;
}
