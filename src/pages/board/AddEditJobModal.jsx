import { useState } from "react";
import LegacyModal from "../../components/legacy/LegacyModal.jsx";
import { useToast } from "../../components/Toast.jsx";
import { useJobs } from "../../context/JobsContext.jsx";
import { domain, newId } from "../../lib/format.js";
import { classifyTrack } from "../../lib/tracks.js";

const SOURCES = ["LinkedIn", "Welcome to the Jungle", "Handshake", "USAJOBS", "Company site", "Auto feed", "Referral", "Other"];

// Prefill company/source from a pasted posting URL.
function guessFromUrl(url, current) {
    const d = domain(url);
    const next = {};
    if (d && !current.company) {
        const guess = d.split(".")[0];
        next.company = guess.charAt(0).toUpperCase() + guess.slice(1);
    }
    if (/linkedin/.test(d)) next.src = "LinkedIn";
    else if (/welcometothejungle|wttj/.test(d)) next.src = "Welcome to the Jungle";
    else if (/joinhandshake/.test(d)) next.src = "Handshake";
    else if (/usajobs/.test(d)) next.src = "USAJOBS";
    else if (d) next.src = "Company site";
    return next;
}

/* Add a job, or edit one when `job` is given. Old look on purpose (see legacy.css). */
export default function AddEditJobModal({ job, onClose }) {
    const { saveJob, who } = useJobs();
    const toast = useToast();
    const [f, setF] = useState(job
        ? { url: job.url || "", title: job.title || "", company: job.company || "", loc: job.loc || "", src: job.src || "Other", tags: (job.tags || []).join(", "), notes: job.notes || "" }
        : { url: "", title: "", company: "", loc: "", src: "LinkedIn", tags: "", notes: "" });
    const set = k => e => setF(prev => ({ ...prev, [k]: e.target.value }));

    const save = async () => {
        const data = {
            url: f.url.trim(), title: f.title.trim(), company: f.company.trim(), loc: f.loc.trim(),
            src: f.src, tags: f.tags.split(",").map(t => t.trim()).filter(Boolean), notes: f.notes.trim()
        };
        if (!data.title && !data.url) { toast("Add at least a title or a link"); return; }

        if (job) {
            const titleChanged = data.title !== job.title;
            const updated = { ...job, ...data };
            if (titleChanged || !updated.track) updated.track = classifyTrack(updated.title);
            await saveJob(updated);
            toast("Saved");
        } else {
            await saveJob({
                id: newId(), added: Date.now(), by: who,
                status: "new", fit: null, why: "",
                history: [{ s: "new", t: Date.now(), by: who }],
                track: classifyTrack(data.title),
                ...data
            });
            toast("Added to your board");
        }
        onClose();
    };

    return (
        <LegacyModal title={job ? "Edit job" : "Add a job"} onClose={onClose}>
            <div className="lg-field">
                <label>Link to the posting</label>
                <input
                    value={f.url} onChange={set("url")} autoFocus={!job}
                    onBlur={() => { const u = f.url.trim(); if (u) setF(prev => ({ ...prev, ...guessFromUrl(u, prev) })); }}
                    placeholder="Paste a URL — we'll prefill what we can"
                />
            </div>
            <div className="lg-row2">
                <div className="lg-field"><label>Role title</label><input value={f.title} onChange={set("title")} placeholder="Technical Project Manager" /></div>
                <div className="lg-field"><label>Company</label><input value={f.company} onChange={set("company")} placeholder="Acme Co." /></div>
            </div>
            <div className="lg-row2">
                <div className="lg-field"><label>Location</label><input value={f.loc} onChange={set("loc")} placeholder="Seattle, WA / Remote" /></div>
                <div className="lg-field"><label>Source</label>
                    <select value={f.src} onChange={set("src")}>
                        {SOURCES.map(s => <option key={s}>{s}</option>)}
                    </select>
                </div>
            </div>
            <div className="lg-field">
                <label>Tags <span style={{ fontWeight: 400, color: "var(--ink-faint)" }}>(comma separated)</span></label>
                <input value={f.tags} onChange={set("tags")} placeholder="remote, product owner, hybrid, senior" />
            </div>
            <div className="lg-field">
                <label>Notes / job description <span style={{ fontWeight: 400, color: "var(--ink-faint)" }}>(paste the JD for better AI scoring)</span></label>
                <textarea value={f.notes} onChange={set("notes")} placeholder="Paste the description, or jot why this caught your eye…" />
            </div>
            <div className="lg-mfoot">
                <button type="button" className="lg-btn ghost sm" onClick={onClose}>Cancel</button>
                <button type="button" className="lg-btn sm" onClick={save}>Save to board</button>
            </div>
        </LegacyModal>
    );
}
