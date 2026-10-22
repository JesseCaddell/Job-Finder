/* ============================================================
   DATA LAYER — all reads/writes go through these functions.
   In local mode  → localStorage.
   In shared mode → Supabase tables.
   Field names are identical to the legacy app and to
   supabase-schema.sql: jobs map snake_case rows ↔ camelCase jobs in
   dbRowToJob / jobToDbRow below.
   ============================================================ */
import { SB, SHARED_MODE } from "./config.js";
import { store } from "./store.js";
import { freshLocalState } from "./defaults.js";
import { classifyTrack } from "./tracks.js";

/* ─── Local state (local mode only) ─── */
let S = null;

export function getLocalState() {
    if (!S) {
        S = store.get("pipeline_state");
        if (!S) { S = freshLocalState(); store.set("pipeline_state", S); }
    }
    return S;
}
export function saveLocalState() { store.set("pipeline_state", S); }
export function clearLocalState() { S = null; store.del("pipeline_state"); store.del("pipeline_session"); }

/* ─── Settings ─── */
export async function loadSettings() {
    if (SHARED_MODE) {
        const { data } = await SB.from("settings").select("*").eq("id", 1).single();
        return data || {};
    }
    return getLocalState();
}

export async function saveSettings(patch) {
    if (SHARED_MODE) {
        await SB.from("settings").upsert({ id: 1, ...patch });
    } else {
        Object.assign(getLocalState(), patch);
        saveLocalState();
    }
}

/* ─── Jobs ─── */
export function dbRowToJob(r) {
    return {
        id:       r.id,
        added:    new Date(r.created_at).getTime(),
        by:       r.added_by || "",
        status:   r.status || "new",
        fit:      r.fit,
        why:      r.why || "",
        feedback: r.feedback || null,
        scoredAt: r.scored_at || null,
        resumeId:       r.resume_id || null,
        resumeFilename: r.resume_filename || null,
        improvements:   r.improvements || null,
        archived:  !!r.archived,
        postedAt:  r.posted_at || null,
        track:     r.track || null,
        history:  r.history || [],
        title:    r.title || "",
        company:  r.company || "",
        loc:      r.loc || "",
        src:      r.src || "",
        url:      r.url || "",
        tags:     r.tags || [],
        notes:    r.notes || ""
    };
}

export function jobToDbRow(j) {
    return {
        id:        j.id,
        title:     j.title,
        company:   j.company,
        loc:       j.loc,
        src:       j.src,
        url:       j.url,
        tags:      j.tags || [],
        notes:     j.notes,
        status:    j.status,
        fit:       j.fit,
        why:       j.why,
        feedback:  j.feedback || null,
        scored_at: j.scoredAt || null,
        resume_id:       j.resumeId || null,
        resume_filename: j.resumeFilename || null,
        improvements:    j.improvements || null,
        archived:  !!j.archived,
        posted_at: j.postedAt || null,
        track:     j.track || null,
        added_by:  j.by,
        history:   j.history || []
    };
}

export async function loadJobs() {
    if (SHARED_MODE) {
        const { data, error } = await SB.from("jobs").select("*").order("created_at", { ascending: false });
        if (error) { console.error(error); return []; }
        return (data || []).map(dbRowToJob);
    }
    return [...(getLocalState().jobs || [])];
}

/* Returns { error } so callers can show their own message. */
export async function upsertJob(j) {
    if (SHARED_MODE) {
        const { error } = await SB.from("jobs").upsert(jobToDbRow(j));
        if (error) console.error("upsert failed:", error);
        return { error };
    }
    const s = getLocalState();
    const idx = s.jobs.findIndex(x => x.id === j.id);
    if (idx >= 0) s.jobs[idx] = j; else s.jobs.unshift(j);
    saveLocalState();
    return { error: null };
}

export async function deleteJob(id) {
    if (SHARED_MODE) {
        const { error } = await SB.from("jobs").delete().eq("id", id);
        if (error) console.error("delete failed:", error);
        return { error };
    }
    const s = getLocalState();
    s.jobs = s.jobs.filter(j => j.id !== id);
    saveLocalState();
    return { error: null };
}

// One-time catch-up for jobs saved before tracks existed: tag every job
// that has no track, in a single write. Returns the full list; a no-op once
// everything is tagged.
export async function backfillTracks(jobs) {
    const untagged = jobs.filter(j => !j.track);
    if (!untagged.length) return jobs;
    const tagged = untagged.map(j => ({ ...j, track: classifyTrack(j.title) }));
    const byId = new Map(tagged.map(j => [j.id, j]));
    const next = jobs.map(j => byId.get(j.id) || j);
    if (SHARED_MODE) {
        const { error } = await SB.from("jobs").upsert(tagged.map(jobToDbRow));
        if (error) console.error("track backfill failed:", error);
    } else {
        getLocalState().jobs = next;
        saveLocalState();
    }
    return next;
}

/* ─── Real-time subscription (shared mode only) ───
   onChange({ type: "upsert", job } | { type: "delete", id }). Returns an
   unsubscribe function. */
export function subscribeJobs(onChange) {
    if (!SHARED_MODE) return () => {};
    const channel = SB.channel("jobs-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, payload => {
            if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
                onChange({ type: "upsert", job: dbRowToJob(payload.new) });
            } else if (payload.eventType === "DELETE") {
                onChange({ type: "delete", id: payload.old.id });
            }
        })
        .subscribe();
    return () => { SB.removeChannel(channel); };
}
