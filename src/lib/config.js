import { createClient } from "@supabase/supabase-js";

/* CONFIG is loaded from /.netlify/functions/get-config at boot.
   Nothing sensitive lives in the source — keys stay in Netlify env vars. */
export let CONFIG = {
    supabase: { url: "", anonKey: "" },
    scoringUrl: "/.netlify/functions/score-fit",
    improveUrl: "/.netlify/functions/improve-resume"
};

/* Set after loadConfig() resolves. ES live bindings: importers see the
   updated value without re-importing. */
export let SB = null;
export let SHARED_MODE = false;

let loading = null;

/* Local mode runs when get-config can't be reached or Supabase env vars are
   blank. Memoized so every caller awaits the same request. */
export function loadConfig() {
    if (!loading) loading = fetchConfig();
    return loading;
}

async function fetchConfig() {
    try {
        const res = await fetch("/.netlify/functions/get-config");
        if (!res.ok) {
            console.warn("[config] get-config returned", res.status, "— running in local mode");
            return;
        }
        const remote = await res.json();
        CONFIG = { ...CONFIG, ...remote };

        if (!CONFIG.supabase.url || !CONFIG.supabase.anonKey) {
            console.warn("[config] SUPABASE_URL or SUPABASE_ANON_KEY not set in Netlify env vars — running in local mode.");
            return;
        }

        SB = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey, {
            auth: { persistSession: true, autoRefreshToken: true }
        });
        SHARED_MODE = true;
        console.info("[config] Shared mode active — Supabase connected.");
    } catch (e) {
        console.warn("[config] Could not reach get-config — running in local mode.", e.message);
    }
}

/* Headers for the AI functions — in shared mode they require the
   Supabase session token so strangers can't spend the Anthropic key. */
export async function aiHeaders() {
    const h = { "Content-Type": "application/json" };
    if (SHARED_MODE) {
        const { data: { session } } = await SB.auth.getSession();
        if (session?.access_token) h.Authorization = "Bearer " + session.access_token;
    }
    return h;
}

/* get-config reports which optional features have credentials. Only an
   explicit false blocks — if config couldn't load, let the call try. */
export const AI_OFF_MSG = "AI scoring isn't configured — set ANTHROPIC_API_KEY in Netlify and redeploy";
export const aiConfigured = () => CONFIG.features?.scoring !== false;
export const feedConfigured = () => CONFIG.features?.feed !== false;
