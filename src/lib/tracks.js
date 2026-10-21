/* ─── Resume tracks (PM vs Dev) ───
   Each job gets a track when it enters the board (the feed tags it; manual
   adds are tagged on save). Scoring then uses the active resume for that
   track. Kept in sync with classifyTrack() in netlify/functions/fetch-jobs.js. */
const DEV_TITLE_RE = /\b(software|developer|devops|sre|site reliability|full[- ]?stack|front[- ]?end|back[- ]?end|engineer|programmer|sdet|qa|automation|platform|architect)\b/i;
const PM_TITLE_RE  = /\b(project|product|program|scrum|agile|delivery|release|coordinator|analyst|consultant|operations|techops|owner|manager|implementation)\b/i;

export function classifyTrack(title) {
    const dev = DEV_TITLE_RE.test(title || ""), pm = PM_TITLE_RE.test(title || "");
    if (dev && pm) return "unsure";
    return dev ? "dev" : "pm";
}

export const TRACK_LABEL = { pm: "PM", dev: "Dev", unsure: "PM/Dev" };

// The active resume for a track is the most recent upload tagged with it.
export function activeResume(settings, track) {
    const vs = (settings?.resume_versions || []).filter(v => v.track === track);
    return vs.length ? vs[vs.length - 1] : null;
}

const STOPWORDS = new Set("the and for with you our your will are this that from have has not but all can who they their about into more other such than also able work team role job".split(" "));

function termSet(text) {
    const out = new Set();
    for (const w of (String(text || "").toLowerCase().match(/[a-z][a-z0-9+#]{2,}/g) || []))
        if (!STOPWORDS.has(w)) out.add(w);
    return out;
}

// How many distinct terms in the job posting also appear in the resume.
function keywordOverlap(jobText, resumeText) {
    const r = termSet(resumeText); let n = 0;
    for (const t of termSet(jobText)) if (r.has(t)) n++;
    return n;
}

// Decides which resume scores a job: its track's active resume. "unsure"
// titles go to whichever resume overlaps the posting more (ties → PM).
// Falls back to the other track's resume, then to the legacy pasted text.
export function pickResume(settings, j) {
    let track = j.track || classifyTrack(j.title);
    const pm = activeResume(settings, "pm"), dev = activeResume(settings, "dev");
    let note = "";
    if (track === "unsure") {
        if (pm && dev) {
            const jobText = ((j.title || "") + " ").repeat(3) + (j.notes || "");
            track = keywordOverlap(jobText, dev.text) > keywordOverlap(jobText, pm.text) ? "dev" : "pm";
            note = `Title fits both tracks — used your ${TRACK_LABEL[track]} resume (closer keyword match)`;
        } else track = (dev && !pm) ? "dev" : "pm";
    }
    let version = track === "dev" ? dev : pm;
    if (!version) {
        const other = track === "dev" ? pm : dev;
        if (other) { version = other; note = `No ${TRACK_LABEL[track]} resume uploaded — used your ${track === "dev" ? "PM" : "Dev"} resume`; }
    }
    return { track, version, text: version?.text || settings.resume_text || settings.resume || "", note };
}
