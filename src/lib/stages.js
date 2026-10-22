export const STAGES = [
    { key: "new",       label: "New",       color: "#c8751b" },
    { key: "applied",   label: "Applied",   color: "#426b93" },
    { key: "interview", label: "Interview", color: "#786498" },
    { key: "offer",     label: "Offer",     color: "#39735c" },
    { key: "denied",    label: "Denied",    color: "#a34e47" }
];
export const stageMeta = k => STAGES.find(s => s.key === k) || STAGES[0];

// Jobs you've categorized past "new" should never be swept up by score-based
// cleanup (per-job Remove button, "Remove low scores", archive purge, or the
// feed's repost-revival) — only untouched "new" postings are fair game.
export const isProtectedStatus = j =>
    j.status === "applied" || j.status === "interview" || j.status === "offer" || j.status === "denied";

// Every time the "Applied" stage was set counts as one application attempt
// (reapplying after a Denied shows up as a second entry) — drives the card badge.
export const attemptCount = j => (j.history || []).filter(h => h.s === "applied").length;
