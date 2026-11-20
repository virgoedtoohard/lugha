// Accounts, progress sync and reviewer content — backed by Supabase.
// The app still works fully offline / as a guest when config.js is left empty.
const SUPABASE_SRC = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
let client = null;
let user = null;
const authListeners = new Set();
export function isConfigured() {
    const c = window.LUGHA_CONFIG;
    return !!(c?.supabaseUrl && c?.supabaseAnonKey);
}
export function isReady() { return !!client; }
export function currentUser() { return user; }
export function onAuthChange(fn) { authListeners.add(fn); }
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Could not load " + src));
        document.head.appendChild(s);
    });
}
export async function initCloud() {
    if (!isConfigured())
        return false;
    try {
        if (!window.supabase)
            await loadScript(SUPABASE_SRC);
        const cfg = window.LUGHA_CONFIG;
        client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
        const { data } = await client.auth.getSession();
        await setUserFromSession(data?.session);
        client.auth.onAuthStateChange((_evt, session) => { void setUserFromSession(session); });
        return true;
    }
    catch (e) {
        console.warn("[lugha] cloud unavailable, continuing offline", e);
        client = null;
        return false;
    }
}
async function setUserFromSession(session) {
    const prevId = user?.id ?? null;
    if (!session?.user) {
        user = null;
    }
    else {
        const u = session.user;
        let role = "learner";
        let name = u.user_metadata?.display_name ?? u.email?.split("@")[0] ?? "Learner";
        const { data } = await client.from("profiles").select("display_name, role").eq("id", u.id).maybeSingle();
        if (data) {
            role = data.role ?? role;
            name = data.display_name || name;
        }
        user = { id: u.id, email: u.email ?? "", name, role };
    }
    if ((user?.id ?? null) !== prevId || user)
        authListeners.forEach((fn) => fn(user));
}
function need() { if (!client)
    throw new Error("Accounts aren't set up yet — add your Supabase keys to config.js."); }
export async function signUp(email, password, displayName) {
    need();
    const { data, error } = await client.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
    if (error)
        throw error;
    return data.session ? "signed-in" : "check-email";
}
export async function signIn(email, password) {
    need();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error)
        throw error;
}
export async function signOut() {
    if (client)
        await client.auth.signOut();
}
// ---------- Progress sync ----------
export async function pullProgress() {
    if (!client || !user)
        return null;
    const { data, error } = await client.from("progress").select("data").eq("user_id", user.id).maybeSingle();
    if (error) {
        console.warn(error);
        return null;
    }
    return data?.data ?? null;
}
let pushTimer;
export function pushProgressSoon(p) {
    if (!client || !user)
        return;
    window.clearTimeout(pushTimer);
    pushTimer = window.setTimeout(() => { void pushProgress(p); }, 1500);
}
export async function pushProgress(p) {
    if (!client || !user)
        return;
    const { error } = await client.from("progress").upsert({ user_id: user.id, data: p, updated_at: new Date().toISOString() });
    if (error)
        console.warn("[lugha] sync failed", error);
}
// ---------- Reviewer content ----------
export async function fetchOverrides() {
    if (!client)
        return null;
    const { data, error } = await client.from("content_overrides").select("*");
    if (error) {
        console.warn(error);
        return null;
    }
    return data;
}
export async function saveOverride(o) {
    need();
    const { error } = await client.from("content_overrides").upsert({ ...o, reviewed_by: user?.id, updated_at: new Date().toISOString() });
    if (error)
        throw error;
}
export async function uploadAudio(itemId, blob) {
    need();
    const ext = blob.type.includes("mpeg") ? "mp3" : blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "m4a" : "webm";
    const path = `${itemId}-${Date.now()}.${ext}`;
    const { error } = await client.storage.from("audio").upload(path, blob, { contentType: blob.type || "audio/webm", upsert: true });
    if (error)
        throw error;
    return client.storage.from("audio").getPublicUrl(path).data.publicUrl;
}
