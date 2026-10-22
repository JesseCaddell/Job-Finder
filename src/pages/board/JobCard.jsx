import { ArrowUpRight, ChevronDown, CircleAlert, Sparkles } from "lucide-react";
import Checkbox from "../../components/Checkbox.jsx";
import { timeAgoLong } from "../../lib/format.js";
import { needsReview } from "../../lib/jobsView.js";
import { attemptCount, STAGES } from "../../lib/stages.js";
import { classifyTrack, TRACK_LABEL } from "../../lib/tracks.js";

const TRACK_TAG = { dev: "tag-blue", pm: "tag-purple", unsure: "tag-neutral" };

export default function JobCard({ job: j, selected, onSelect, lowScoreThreshold, scoring, actions, onOpen }) {
    const track = j.track || classifyTrack(j.title);
    const review = needsReview(j);
    const note = j.feedback?.summary || j.why;
    const attempts = attemptCount(j);
    const canRemove = j.fit != null && j.fit < lowScoreThreshold;

    return (
        <article className="job-card">
            <div className="job-header">
                <Checkbox checked={selected} onChange={onSelect} label={`Select ${j.title || "job"}`} />
                <div className="job-identity">
                    <h3>
                        {j.url
                            ? <a href={j.url} target="_blank" rel="noopener noreferrer">{j.title || "Untitled role"}</a>
                            : (j.title || "Untitled role")}
                    </h3>
                    <div className="job-company">
                        <strong>{j.company || "—"}</strong>
                        <button
                            type="button" className={"tag " + TRACK_TAG[track]}
                            onClick={() => actions.toggleTrack(j.id)}
                            title="Which resume scores this job — click to switch"
                        >{TRACK_LABEL[track].toUpperCase()}</button>
                    </div>
                    <p className="job-loc">{j.loc || "Location not specified"}</p>
                </div>
                {j.fit != null ? (
                    <div className="fit-score">
                        <div><span className="serif">{j.fit}</span><small>/100</small></div>
                        <span className="fit-label">FIT SCORE</span>
                    </div>
                ) : review ? (
                    <span className="tag tag-accent">Needs review</span>
                ) : (
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => actions.scoreOne(j.id)} disabled={scoring}>
                        <Sparkles size={15} /> {scoring ? "Scoring…" : "Score fit"}
                    </button>
                )}
            </div>

            {j.tags?.length > 0 && (
                <div className="job-tags">
                    {j.tags.map(t => <span className="tag tag-neutral" key={t}>{t}</span>)}
                </div>
            )}

            {review && (
                <div className="fit-note warn">
                    <CircleAlert size={15} />
                    <p>Cannot score without job details: the posting is inaccessible. Review the original listing before scoring.</p>
                </div>
            )}
            {!review && note && (
                <div className="fit-note">
                    <Sparkles size={15} />
                    <p>{note}</p>
                </div>
            )}

            <div className="job-controls">
                <div className="job-actions">
                    <span className="select-wrap">
                        <select
                            className="stage-select" value={j.status} aria-label={`Stage for ${j.title || "job"}`}
                            onChange={e => actions.setStatus(j.id, e.target.value)}
                        >
                            {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                        <ChevronDown size={16} />
                    </span>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => onOpen(j.id)}>
                        <ArrowUpRight size={16} /> Details
                    </button>
                    {j.status === "interview" && (
                        <button type="button" className="job-link" onClick={() => actions.calendar(j.id)}>＋ Calendar</button>
                    )}
                    {attempts > 0 && (
                        <button type="button" className="job-link" onClick={() => onOpen(j.id)} title="Application history">↻ {attempts}× applied</button>
                    )}
                    {canRemove && (
                        <button type="button" className="job-link" onClick={() => actions.setArchived(j.id, true)}>Remove / archive</button>
                    )}
                    <button type="button" className="job-link destructive" onClick={() => actions.deleteJob(j.id)}>Delete…</button>
                </div>
                <span className="job-meta">
                    {[j.src && j.src.toUpperCase(), `Added ${timeAgoLong(j.added)}`, j.by && `by ${j.by}`].filter(Boolean).join(" · ")}
                </span>
            </div>
        </article>
    );
}
