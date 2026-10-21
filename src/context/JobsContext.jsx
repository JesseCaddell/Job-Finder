import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useApp } from "./AppContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { backfillTracks, deleteJob, loadJobs, loadSettings, subscribeJobs, upsertJob } from "../lib/data.js";
import { DEFAULT_LOW_SCORE_THRESHOLD } from "../lib/defaults.js";

const JobsContext = createContext(null);

/* The board's jobs and the writes that change them, shared by the Board and
   Archive pages. Loads once on mount (tagging any untagged jobs, as the legacy
   app did), keeps itself in step with other devices in shared mode, and applies
   every change to local state and the data layer together. */
export function JobsProvider({ children }) {
    const { account } = useApp();
    const toast = useToast();
    const [jobs, setJobs] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [lowScoreThreshold, setLowScoreThreshold] = useState(DEFAULT_LOW_SCORE_THRESHOLD);

    useEffect(() => {
        let alive = true;
        (async () => {
            const loadedJobs = await backfillTracks(await loadJobs());
            const settings = await loadSettings();
            if (!alive) return;
            setJobs(loadedJobs);
            setLowScoreThreshold(settings.low_score_threshold ?? DEFAULT_LOW_SCORE_THRESHOLD);
            setLoaded(true);
        })();
        const unsubscribe = subscribeJobs(change => {
            setJobs(prev => change.type === "delete"
                ? prev.filter(j => j.id !== change.id)
                : prev.some(j => j.id === change.job.id)
                    ? prev.map(j => j.id === change.job.id ? change.job : j)
                    : [change.job, ...prev]);
        });
        return () => { alive = false; unsubscribe(); };
    }, []);

    // Replace-or-prepend `job` in local state (new jobs go to the top).
    const mergeJob = useCallback(job => {
        setJobs(prev => prev.some(j => j.id === job.id) ? prev.map(j => j.id === job.id ? job : j) : [job, ...prev]);
    }, []);

    const saveJob = useCallback(async job => {
        mergeJob(job);
        const { error } = await upsertJob(job);
        if (error) toast("Sync error — check console");
        return { error };
    }, [mergeJob, toast]);

    // Saves each job in turn, then updates local state once.
    const saveJobs = useCallback(async list => {
        for (const job of list) await upsertJob(job);
        const byId = new Map(list.map(j => [j.id, j]));
        setJobs(prev => prev.map(j => byId.get(j.id) || j));
    }, []);

    const removeJob = useCallback(async id => {
        const { error } = await deleteJob(id);
        if (error) toast("Sync error — check console");
        setJobs(prev => prev.filter(j => j.id !== id));
    }, [toast]);

    const removeJobs = useCallback(async ids => {
        for (const id of ids) await deleteJob(id);
        const gone = new Set(ids);
        setJobs(prev => prev.filter(j => !gone.has(j.id)));
    }, []);

    return (
        <JobsContext.Provider value={{
            jobs, setJobs, loaded, lowScoreThreshold, who: account?.name || "",
            saveJob, saveJobs, removeJob, removeJobs
        }}>
            {children}
        </JobsContext.Provider>
    );
}

export function useJobs() {
    const ctx = useContext(JobsContext);
    if (!ctx) throw new Error("useJobs must be used inside <JobsProvider>");
    return ctx;
}
