import { useCallback, useRef, useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { useJobs } from "../../context/JobsContext.jsx";
import { useToast } from "../../components/Toast.jsx";
import { addToCalendar } from "../../lib/calendar.js";
import { aiConfigured, AI_OFF_MSG, draftImprovements, scoreAdditionalResume, scoreJob } from "../../lib/scoring.js";
import { isProtectedStatus, stageMeta } from "../../lib/stages.js";
import { classifyTrack, TRACK_LABEL } from "../../lib/tracks.js";

const sleep = ms => new Promise(r => setTimeout(r, ms));
const OLD_POSTING_MS = 30 * 24 * 60 * 60 * 1000;

/* Everything a person can do to jobs on the board — per-job actions (status,
   score, track, archive, delete) and the Feed tools bulk actions. Ported from
   the legacy script with the same rules: cleanup only archives (never
   deletes), and never touches a job categorized past "new". */
export default function useJobActions() {
    const { account } = useApp();
    const { jobs, saveJob, saveJobs, removeJob, lowScoreThreshold, who } = useJobs();
    const toast = useToast();

    // Async loops need the latest list, not the one captured when they started.
    const jobsRef = useRef(jobs);
    jobsRef.current = jobs;
    const find = id => jobsRef.current.find(j => j.id === id);

    const [scoringId, setScoringId] = useState(null);
    const [scoreAll, setScoreAll] = useState(null);   // null, or { i, n } while running
    const stopRef = useRef(false);

    const scoreOne = useCallback(async id => {
        const j = find(id);
        if (!j) return false;
        if (!aiConfigured()) { toast(AI_OFF_MSG); return false; }
        setScoringId(id);
        toast("Scoring fit…");
        try {
            const { job, note } = await scoreJob(j, who);
            await saveJob(job);
            toast("Scored " + job.fit + "/100 — " + (note || "open Details to see the full breakdown"));
            return true;
        } catch (e) {
            toast("Scoring unavailable — deploy the score-fit function and set ANTHROPIC_API_KEY in Netlify");
            console.warn("Score fit failed:", e);
            return false;
        } finally {
            setScoringId(null);
        }
    }, [who, saveJob, toast]);

    const draft = useCallback(async id => {
        const j = find(id);
        if (!j) return;
        if (!aiConfigured()) { toast(AI_OFF_MSG); return; }
        toast("Drafting improvements…");
        try {
            await saveJob(await draftImprovements(j));
            toast("Improvements drafted");
        } catch (e) {
            toast("Couldn't draft improvements — check the improve-resume function is deployed");
            console.warn("Draft improvements failed:", e);
        }
    }, [saveJob, toast]);

    const scoreWithNewResume = useCallback(async (id, file) => {
        const j = find(id);
        if (!j) return;
        toast("Reading new resume…");
        try {
            const { job, note } = await scoreAdditionalResume(j, file, account?.id, who);
            await saveJob(job);
            toast("Scored " + job.fit + "/100 — " + (note || "open Details to see the full breakdown"));
        } catch (e) {
            toast("Couldn't score with the new resume: " + e.message);
            console.warn(e);
        }
    }, [account, who, saveJob, toast]);

    const setStatus = useCallback(async (id, status) => {
        const j = find(id);
        if (!j) return;
        await saveJob({ ...j, status, history: [...(j.history || []), { s: status, t: Date.now(), by: who }] });
        // The board shows one stage at a time, so a status change can make the
        // card vanish from view — say where it went.
        toast(`Moved to ${stageMeta(status).label}`);
    }, [who, saveJob, toast]);

    const toggleTrack = useCallback(async id => {
        const j = find(id);
        if (!j) return;
        const track = (j.track || classifyTrack(j.title)) === "dev" ? "pm" : "dev";
        await saveJob({ ...j, track });
        toast(`Marked ${TRACK_LABEL[track]} — the next score will use your ${TRACK_LABEL[track]} resume`);
    }, [saveJob, toast]);

    const setArchived = useCallback(async (id, archived) => {
        const j = find(id);
        if (j) await saveJob({ ...j, archived });
    }, [saveJob]);

    const deleteJob = useCallback(async (id, message) => {
        const j = find(id);
        if (!window.confirm(message || `Permanently delete "${j?.title || "this role"}"? This cannot be undone.`)) return false;
        await removeJob(id);
        toast("Deleted");
        return true;
    }, [removeJob, toast]);

    const calendar = useCallback(id => {
        const j = find(id);
        const msg = j && addToCalendar(j);
        if (msg) toast(msg);
    }, [toast]);

    /* ─── Feed tools ─── */

    // While a Score-all run is going, the same button becomes "Stop": it sets
    // stopRef, which the loop checks between jobs (the job in flight finishes).
    const scoreAllUnscored = useCallback(async () => {
        if (scoreAll) { stopRef.current = true; toast("Stopping after the current job…"); return; }
        const targets = jobsRef.current.filter(j => !j.archived && j.fit == null);
        if (!targets.length) { toast("Nothing to score — every job already has a fit score"); return; }
        if (!aiConfigured()) { toast(AI_OFF_MSG); return; }
        if (!window.confirm(`Score ${targets.length} unscored job${targets.length === 1 ? "" : "s"}? This calls the AI ${targets.length} time${targets.length === 1 ? "" : "s"}.`)) return;
        stopRef.current = false;
        let done = 0;
        try {
            for (let i = 0; i < targets.length && !stopRef.current; i++) {
                setScoreAll({ i: i + 1, n: targets.length });
                toast(`Scoring ${i + 1}/${targets.length}…`);
                await scoreOne(targets[i].id);
                done++;
                await sleep(350);
            }
        } finally {
            setScoreAll(null);
        }
        toast(stopRef.current ? `Stopped — scored ${done} of ${targets.length}` : `Scored ${targets.length} job${targets.length === 1 ? "" : "s"}`);
    }, [scoreAll, scoreOne, toast]);

    // Wipes the score (and anything derived from it) on un-categorized "new"
    // jobs so "Score all" will pick them up again — e.g. after editing the profile.
    const clearNewScores = useCallback(async () => {
        const targets = jobsRef.current.filter(j => !j.archived && j.status === "new" && j.fit != null);
        if (!targets.length) { toast("No scored jobs on New"); return; }
        if (!window.confirm(`Clear the score on ${targets.length} New job${targets.length === 1 ? "" : "s"}? The scores and feedback are deleted, not archived. Then use Score all to rescore.`)) return;
        await saveJobs(targets.map(j => ({
            ...j, fit: null, why: "", feedback: null, scoredAt: null, resumeId: null, resumeFilename: null, improvements: null
        })));
        toast(`Cleared ${targets.length} score${targets.length === 1 ? "" : "s"} — run Score all to rescore`);
    }, [saveJobs, toast]);

    const archiveAll = useCallback(async (targets, message) => {
        if (!window.confirm(message)) return false;
        await saveJobs(targets.map(j => ({ ...j, archived: true })));
        return true;
    }, [saveJobs]);

    const removeLowScores = useCallback(async () => {
        const targets = jobsRef.current.filter(j => !j.archived && j.fit != null && j.fit < lowScoreThreshold && !isProtectedStatus(j));
        if (!targets.length) { toast("No low-scoring jobs to remove"); return; }
        if (await archiveAll(targets, `Archive ${targets.length} job${targets.length === 1 ? "" : "s"} scoring below ${lowScoreThreshold}?`))
            toast(`Archived ${targets.length} low-scoring job${targets.length === 1 ? "" : "s"}`);
    }, [lowScoreThreshold, archiveAll, toast]);

    // Shared by "Remove Sr / Senior roles" and "Remove by title keyword" — archives
    // (never permanently deletes) so the pull-feed dedupe still sees the job, and
    // never touches a job categorized past "new".
    const removeMatchingTitles = useCallback(async (label, matches) => {
        const targets = jobsRef.current.filter(j => !j.archived && !isProtectedStatus(j) && matches(j.title || ""));
        if (!targets.length) { toast(`No jobs match ${label}`); return false; }
        if (await archiveAll(targets, `Archive ${targets.length} job${targets.length === 1 ? "" : "s"} matching ${label}?`)) {
            toast(`Archived ${targets.length} job${targets.length === 1 ? "" : "s"}`);
            return true;
        }
        return false;
    }, [archiveAll, toast]);

    const removeSeniorRoles = useCallback(
        () => removeMatchingTitles("Sr./Senior", title => /\b(sr\.?|senior)\b/i.test(title)), [removeMatchingTitles]);

    const removeByTitleKeyword = useCallback(async input => {
        const kws = input.split(",").map(k => k.trim().toLowerCase()).filter(Boolean);
        if (!kws.length) { toast("Enter at least one keyword"); return false; }
        return removeMatchingTitles(kws.join(", "), title => kws.some(k => title.toLowerCase().includes(k)));
    }, [removeMatchingTitles, toast]);

    const archiveOldPostings = useCallback(async () => {
        const cutoff = Date.now() - OLD_POSTING_MS;
        const targets = jobsRef.current.filter(j => !j.archived && j.status === "new" && j.added < cutoff);
        if (!targets.length) { toast("No untouched postings older than 30 days"); return; }
        if (await archiveAll(targets, `Archive ${targets.length} untouched posting${targets.length === 1 ? "" : "s"} added more than 30 days ago?`))
            toast(`Archived ${targets.length} old posting${targets.length === 1 ? "" : "s"}`);
    }, [archiveAll, toast]);

    return {
        scoringId, scoreAll, scoreOne, draft, scoreWithNewResume,
        setStatus, toggleTrack, setArchived, deleteJob, calendar,
        scoreAllUnscored, clearNewScores, removeLowScores, removeSeniorRoles, removeByTitleKeyword, archiveOldPostings
    };
}
