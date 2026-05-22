// Cloud sync via Supabase — local-first approach.
// localStorage is primary (fast, offline). Supabase syncs in background.

import { supabase } from "./supabase";
import type { Progress } from "./srs";

// ── Auth ──────────────────────────────────────────────────────
export async function signInWithGoogle() {
  if (!supabase) return;
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getUser() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function onAuthChange(cb: (user: unknown) => void) {
  if (!supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => cb(session?.user ?? null)
  );
  return () => subscription.unsubscribe();
}

// ── Progress sync ────────────────────────────────────────────
export async function loadFromCloud(): Promise<Progress | null> {
  if (!supabase) return null;
  const user = await getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_progress")
    .select("progress")
    .eq("user_id", user.id)
    .single();

  if (error || !data) return null;
  return data.progress as Progress;
}

export async function saveToCloud(progress: Progress): Promise<void> {
  if (!supabase) return;
  const user = await getUser();
  if (!user) return;

  await supabase.from("user_progress").upsert({
    user_id: user.id,
    progress,
    updated_at: new Date().toISOString(),
  });
}
