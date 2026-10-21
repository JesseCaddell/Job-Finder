import { aiConfigured, aiHeaders, AI_OFF_MSG, CONFIG } from "./config.js";
import { loadSettings, saveSettings } from "./data.js";
import { DEFAULT_PROFILE } from "./defaults.js";
import { extractResumeText, uploadResumeVersion } from "./resumes.js";
import { classifyTrack, pickResume } from "./tracks.js";

/* AI fit scoring, ported from the legacy script. Scoring calls
   /.netlify/functions/score-fit (a proxy that holds the Anthropic key) and is
   manual-only: nothing here runs unless the person clicks a button.

   Each function returns the updated job rather than mutating it; the caller
   saves it (JobsContext.saveJob). */
export { aiConfigured, AI_OFF_MSG };

/* `override` ({ id, filename, text, track }) forces a specific resume (used by
   "Score additional resume"); otherwise the job's track picks one (pickResume).
   Resolves { job, note } where `note` explains an automatic resume choice. */
export async function scoreJob(j, who, override) {
    const settings = await loadSettings();
    const profile = settings.profile || DEFAULT_PROFILE;
    const picked = pickResume(settings, j);
    const resumeText = override?.text || picked.text;
    const resume = resumeText.slice(0, 4000);
    const resumeId = override?.id ?? picked.version?.id ?? null;
    const resumeFilename = override?.filename ?? picked.version?.filename ?? null;
    const track = override?.track || picked.track;

    const res = await fetch(CONFIG.scoringUrl, {
        method: "POST",
        headers: await aiHeaders(),
        body: JSON.stringify({
            profile, resume,
            title: j.title, company: j.company, loc: j.loc,
            notes: (j.notes || "").slice(0, 10000)
        })
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const out = await res.json();

    // Keep the prior score attached to whichever resume produced it, instead of
    // silently overwriting it.
    const history = [...(j.history || [])];
    if (j.fit != null) {
        history.push({
            type: "score", t: Date.now(), by: who,
            fit: j.fit, why: j.why, feedback: j.feedback,
            resumeId: j.resumeId, resumeFilename: j.resumeFilename, scoredAt: j.scoredAt
        });
    }

    // Merge any suggested tags
    const tags = [...(j.tags || [])];
    (out.tags || []).forEach(t => {
        t = String(t).toLowerCase().trim();
        if (t && !tags.map(x => x.toLowerCase()).includes(t)) tags.push(t);
    });

    const job = {
        ...j,
        fit: Math.max(0, Math.min(100, parseInt(out.fit) || 0)),
        why: out.summary || out.why || "",   // backwards compat
        feedback: out.feedback || null,
        scoredAt: new Date().toISOString(),
        resumeId, resumeFilename,
        track,                // an "unsure" job now records which resume won
        improvements: null,   // stale relative to the new score
        history, tags
    };
    return { job, note: !override && picked.note ? picked.note : "" };
}

/* AI resume suggestions for jobs scoring 60+. Improves the same resume that
   scored the job, else the track's pick. */
export async function draftImprovements(j) {
    const settings = await loadSettings();
    const profile = settings.profile || DEFAULT_PROFILE;
    const scoredWith = (settings.resume_versions || []).find(v => v.id === j.resumeId);
    const resume = (scoredWith?.text || pickResume(settings, j).text).slice(0, 4000);
    const res = await fetch(CONFIG.improveUrl, {
        method: "POST",
        headers: await aiHeaders(),
        body: JSON.stringify({
            profile, resume,
            title: j.title, company: j.company, loc: j.loc,
            notes: (j.notes || "").slice(0, 10000),
            gaps: j.feedback?.gaps || ""
        })
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const out = await res.json();
    return { ...j, improvements: { text: out.improvements || "", generatedAt: new Date().toISOString() } };
}

/* Upload a new resume version, then rescore this job against it. */
export async function scoreAdditionalResume(j, file, userId, who) {
    const track = (j.track || classifyTrack(j.title)) === "dev" ? "dev" : "pm";
    const text = await extractResumeText(file);
    if (!text.trim()) throw new Error("No text found in file");

    const version = await uploadResumeVersion(file, text, track, userId);
    const settings = await loadSettings();
    const versions = (settings.resume_versions || []).concat(version);
    await saveSettings({ resume: text, resume_text: text, resume_versions: versions });

    return scoreJob(j, who, { id: version.id, filename: version.filename, text, track });
}
