import { feedConfigured } from "./config.js";
import { loadSettings, upsertJob } from "./data.js";
import { DEFAULT_LOCATION_KEYWORDS, DEFAULT_TITLE_KEYWORDS } from "./defaults.js";
import { newId } from "./format.js";
import { isProtectedStatus } from "./stages.js";
import { classifyTrack } from "./tracks.js";

const FEED_ENDPOINT = "/.netlify/functions/fetch-jobs";

export const NO_FEED_MSG = "No feed sources configured — set GREENHOUSE_BOARDS, LEVER_COMPANIES, etc. in Netlify (see .env.example)";
export { feedConfigured };

// The pull is split into one request per source group (and, for the board-list
// groups, one per slice of boards via meta.next) so no single call runs long
// or returns a huge payload. Mirrors the groups in fetch-jobs.js.
const FEED_GROUPS = ["greenhouse", "lever", "ashby", "usajobs", "adzuna", "hn"];

async function fetchFeedGroup(group, filters) {
    const jobs = []; let offset = 0, truncated = 0;
    while (offset !== null) {
        const res = await fetch(FEED_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...filters, sources: [group], offset })
        });
        if (!res.ok) throw new Error(`${group} HTTP ${res.status}`);
        const data = await res.json();
        jobs.push(...(data.jobs || []));
        truncated += data.meta?.truncated || 0;
        offset = data.meta?.next ?? null;
    }
    return { jobs, truncated };
}

/* Pulls every source group, then merges the results into `jobs`: new postings
   are added, and a repost (newer posted date) of an untouched job is revived.
   Jobs already categorized past "new" are never reset. Writes through
   upsertJob and returns { jobs: next list, added, revived, truncated, failed }.
   Throws when every group fails. Logic is ported from the legacy pullFeed(). */
export async function pullFeed(jobs) {
    const settings = await loadSettings();
    const titleKeywords    = settings.title_keywords?.length    ? settings.title_keywords    : DEFAULT_TITLE_KEYWORDS;
    const locationKeywords = settings.location_keywords?.length ? settings.location_keywords : DEFAULT_LOCATION_KEYWORDS;

    const failed = []; let truncated = 0;
    const results = await Promise.all(FEED_GROUPS.map(g =>
        fetchFeedGroup(g, { titleKeywords, locationKeywords })
            .catch(e => { failed.push(g); console.warn("[feed]", e); return { jobs: [], truncated: 0 }; })));
    const list = results.flatMap(r => { truncated += r.truncated; return r.jobs; });
    if (failed.length === FEED_GROUPS.length) throw new Error("all feed groups failed");

    let next = [...jobs];
    const byKey = new Map(next.map(j => [j.url || (j.title + j.company), j]));
    let added = 0, revived = 0;

    for (const it of list) {
        const key = it.url || (it.title + it.company);
        const existing = byKey.get(key);
        if (existing) {
            // Same posting, unless the source reports a newer posted date —
            // that's a repost, so bring it back for another look. Never reset a
            // job you've already categorized past "new": a repost of the same
            // listing shouldn't wipe your tracked progress.
            const newPosted = it.postedAt ? new Date(it.postedAt).getTime() : null;
            const oldPosted = existing.postedAt ? new Date(existing.postedAt).getTime() : null;
            if (newPosted && oldPosted && newPosted > oldPosted && !isProtectedStatus(existing)) {
                const history = [...(existing.history || [])];
                if (existing.fit != null) {
                    history.push({
                        type: "score", t: Date.now(), by: "Auto feed",
                        fit: existing.fit, why: existing.why, feedback: existing.feedback,
                        resumeId: existing.resumeId, resumeFilename: existing.resumeFilename, scoredAt: existing.scoredAt
                    });
                }
                history.push({ s: "new", t: Date.now(), by: "Auto feed" });
                const updated = {
                    ...existing, postedAt: it.postedAt, archived: false, status: "new",
                    fit: null, why: "", feedback: null, improvements: null, history
                };
                await upsertJob(updated);
                next = next.map(j => j.id === updated.id ? updated : j);
                byKey.set(key, updated);
                revived++;
            }
            continue;
        }
        const j = {
            id: newId(), added: Date.now(), by: "Auto feed",
            status: "new", fit: null, why: "", postedAt: it.postedAt || null,
            track: it.track || classifyTrack(it.title || ""),
            history: [{ s: "new", t: Date.now(), by: "Auto feed" }],
            title:   it.title || "",
            company: it.company || "",
            loc:     it.location || it.loc || "",
            src:     it.source || "Auto feed",
            url:     it.url || "",
            tags:    it.tags || [],
            notes:   it.description || it.notes || ""
        };
        next.unshift(j);
        byKey.set(key, j);
        await upsertJob(j);
        added++;
    }
    return { jobs: next, added, revived, truncated, failed };
}

export function feedSummary({ added, revived, truncated, failed }) {
    const parts = []; if (added) parts.push(`${added} new`); if (revived) parts.push(`${revived} reposted`);
    const notes = []; if (truncated) notes.push(`${truncated} more matched but were cut off`); if (failed.length) notes.push(`failed: ${failed.join(", ")}`);
    return (parts.length ? `Added ${parts.join(", ")} roles` : "Feed is up to date") + (notes.length ? ` (${notes.join("; ")})` : "");
}
