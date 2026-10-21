import { ArrowUpRight, RotateCcw, Sparkles } from "lucide-react";
import Checkbox from "../../components/Checkbox.jsx";
import { classifyTrack, TRACK_LABEL } from "../../lib/tracks.js";

const TRACK_TAG = { dev: "tag-blue", pm: "tag-purple", unsure: "tag-neutral" };

export default function ArchivedJobCard({ job: j, selected, onSelect, actions, onOpen }) {
    const track = j.track || classifyTrack(j.title);
    const note = j.feedback?.summary || j.why;

    return (
        <article className={"archived-card" + (selected ? " selected" : "")}>
            <div className="archived-header">
                <Checkbox checked={selected} onChange={onSelect} label={`Select ${j.title || "job"}`} />
                <div className="archived-identity">
                    <h3>
                        {j.url
                            ? <a href={j.url} target="_blank" rel="noopener noreferrer">{j.title || "Untitled role"}</a>
                            : (j.title || "Untitled role")}
                    </h3>
                    <p className="archived-company">{j.company || "—"}</p>
                    <p className="archived-loc">{j.loc || "Location not specified"}</p>
                </div>
                {j.fit != null && (
                    <div className="archived-fit">
                        <span className="serif">{j.fit}</span>
                        <small>/100 FIT</small>
                    </div>
                )}
            </div>

            <div className="archived-tags">
                <span className={"tag " + TRACK_TAG[track]}>{TRACK_LABEL[track].toUpperCase()}</span>
                {(j.tags || []).map(t => <span className="tag tag-neutral" key={t}>{t}</span>)}
            </div>

            {note && (
                <div className="why-score">
                    <p className="why-heading"><Sparkles size={15} /> Why this score?</p>
                    <p>{note}</p>
                </div>
            )}

            <div className="archived-meta">
                {[j.src && j.src.toUpperCase(), `Date added: ${new Date(j.added).toLocaleDateString()}`].filter(Boolean).join(" · ")}
                <span className="tag tag-neutral">Archived</span>
            </div>

            <hr />
            <div className="archived-actions">
                <button type="button" className="btn btn-outline" onClick={() => actions.restoreToNew([j.id])}>
                    <RotateCcw size={16} /> Restore to New
                </button>
                <button type="button" className="btn btn-outline" onClick={() => onOpen(j.id)}>
                    <ArrowUpRight size={16} /> Details
                </button>
                <span className="spacer" />
                <button type="button" className="job-link destructive" onClick={() => actions.deleteJob(j.id)}>Delete permanently…</button>
            </div>
        </article>
    );
}
