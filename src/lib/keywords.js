import { DEV_TITLE_RE, PM_TITLE_RE } from "./tracks.js";

/* The Feed preferences page groups title keywords as Product or Engineering.
   Groups are derived from the keyword text with the same word lists that tag a
   job's PM/Dev resume track, so the saved allowlist stays a flat list of
   strings (the shape fetch-jobs.js and the legacy board already read). */
export const KEYWORD_GROUPS = [
    { key: "product",     label: "Product",     tag: "tag-purple" },
    { key: "engineering", label: "Engineering", tag: "tag-blue" },
    { key: "other",       label: "Other",       tag: "tag-neutral" }
];

export const groupMeta = key => KEYWORD_GROUPS.find(g => g.key === key) || KEYWORD_GROUPS[2];

export function keywordGroup(text) {
    const dev = DEV_TITLE_RE.test(text), pm = PM_TITLE_RE.test(text);
    if (dev && pm) return /\b(engineer|developer|programmer|architect)\b/i.test(text) ? "engineering" : "product";
    if (dev) return "engineering";
    if (pm) return "product";
    return "other";
}

/* Lower-cased and de-duplicated, like the legacy "add keyword" input. */
export function normalizeKeyword(raw) {
    return String(raw || "").trim().toLowerCase();
}
