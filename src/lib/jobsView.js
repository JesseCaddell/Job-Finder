import { isProtectedStatus } from "./stages.js";
import { classifyTrack } from "./tracks.js";

/* Which jobs a board/archive view shows. Mirrors the legacy visibleJobs():
   `archived` picks the board or the archive, then stage, tag and search narrow
   it, then the sort applies. */
export function filterJobs(jobs, { archived = false, stage = null, tag = null, track = null, q = "", sort = "added" }) {
    let list = jobs.filter(j => !!j.archived === archived);
    if (stage) list = list.filter(j => j.status === stage);
    if (track) list = list.filter(j => (j.track || classifyTrack(j.title)) === track);
    if (tag) list = list.filter(j => (j.tags || []).map(t => t.toLowerCase()).includes(tag));
    if (q) {
        const needle = q.toLowerCase();
        list = list.filter(j => [j.title, j.company, j.loc, j.notes, (j.tags || []).join(" ")].join(" ").toLowerCase().includes(needle));
    }
    return list.sort((a, b) => {
        if (sort === "fit") return (b.fit ?? -1) - (a.fit ?? -1);
        if (sort === "company") return (a.company || "").localeCompare(b.company || "");
        if (sort === "title") return (a.title || "").localeCompare(b.title || "");
        return b.added - a.added;
    });
}

export const SORT_OPTIONS = [
    { value: "added", label: "Newest added" },
    { value: "fit", label: "Best fit" },
    { value: "company", label: "Company A–Z" },
    { value: "title", label: "Title A–Z" }
];

// The most common tags across all jobs, for the Archive tag filter.
export function topTags(jobs, n = 12) {
    const all = {};
    jobs.forEach(j => (j.tags || []).forEach(t => { const k = t.toLowerCase(); all[k] = (all[k] || 0) + 1; }));
    return Object.keys(all).sort((a, b) => all[b] - all[a]).slice(0, n).map(tag => ({ tag, count: all[tag] }));
}

// An unscored job with no description can't be scored meaningfully — the
// posting text wasn't captured (inaccessible listing) or was never pasted in.
export const needsReview = j => j.fit == null && !(j.notes || "").trim();

export { isProtectedStatus };
