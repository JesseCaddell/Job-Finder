import { useRef } from "react";
import LegacyModal from "../../components/legacy/LegacyModal.jsx";
import { useToast } from "../../components/Toast.jsx";
import { useApp } from "../../context/AppContext.jsx";
import { useJobs } from "../../context/JobsContext.jsx";
import { stageMeta } from "../../lib/stages.js";

const RESUME_ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function AiPanel({ j, who, onDraft, onCopy }) {
    const verdict = j.feedback?.verdict || (j.fit >= 75 ? "Strong match" : j.fit >= 50 ? "Worth applying" : "Reach / weak match");
    const when = j.scoredAt ? new Date(j.scoredAt).toLocaleDateString() : "";
    const byline = [who, when ? "scored " + when : ""].filter(Boolean).join(" · ");
    return (
        <div className="lg-ai-panel">
            <div className="lg-ai-head">
                <div className="lg-ai-score">{j.fit}<small>/100</small></div>
                <div>
                    <div className="lg-ai-verdict">{verdict}</div>
                    {byline && <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 2 }}>{byline}</div>}
                </div>
            </div>
            <div className="lg-ai-body">
                {j.feedback?.strengths && <div className="lg-ai-section"><b>Strengths</b>{j.feedback.strengths}</div>}
                {j.feedback?.gaps && <div className="lg-ai-section"><b>Gaps / watch-outs</b>{j.feedback.gaps}</div>}
                {j.feedback?.recommendation && <div className="lg-ai-section"><b>Recommendation</b>{j.feedback.recommendation}</div>}
                {!j.feedback && j.why && <div className="lg-ai-section"><b>Note</b>{j.why}</div>}
                {j.resumeFilename && <div className="lg-ai-section"><b>Scored against</b>{j.resumeFilename}</div>}
                {j.improvements?.text ? (
                    <div className="lg-ai-section">
                        <b>Draft improvements</b>
                        <div style={{ whiteSpace: "pre-wrap" }}>{j.improvements.text}</div>
                        <button type="button" className="lg-miniact" style={{ marginTop: 6 }} onClick={onCopy}>Copy to clipboard</button>
                    </div>
                ) : j.fit >= 60 && (
                    <div className="lg-ai-section">
                        <button type="button" className="lg-btn ghost sm" onClick={onDraft}>✦ Draft improvements</button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* The role's full record: posting link, tags, AI feedback, notes, history, and
   the heavier actions (re-score, score another resume, edit, delete). Old look
   on purpose (see legacy.css). Tags live here rather than on the board card. */
export default function DetailsModal({ jobId, actions, onEdit, onClose }) {
    const { jobs } = useJobs();
    const { account } = useApp();
    const toast = useToast();
    const fileInput = useRef(null);
    const j = jobs.find(x => x.id === jobId);
    if (!j) return null;

    const history = (j.history || []).slice().reverse();

    return (
        <LegacyModal title={j.title || "Role"} onClose={onClose}>
            <div className="lg-meta" style={{ marginBottom: 14 }}>
                {j.company || "—"} · {j.loc || "—"} {j.src ? "· " + j.src : ""}
            </div>
            {j.url && <a className="lg-btn ghost sm" href={j.url} target="_blank" rel="noopener noreferrer">Open posting ↗</a>}
            {j.tags?.length > 0 && <div className="lg-tags">{j.tags.map(t => <span className="lg-tag" key={t}>{t}</span>)}</div>}
            {j.fit != null && (
                <AiPanel
                    j={j} who={account?.name || ""}
                    onDraft={() => actions.draft(j.id)}
                    onCopy={() => { navigator.clipboard.writeText(j.improvements.text); toast("Copied to clipboard"); }}
                />
            )}
            {j.notes && (
                <div style={{ marginTop: 16 }}>
                    <div className="lg-label">Notes</div>
                    <div style={{ fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{j.notes}</div>
                </div>
            )}
            <div style={{ marginTop: 18 }}>
                <div className="lg-label">History</div>
                {history.length ? history.map((h, i) => (
                    <div className="lg-hist" key={i}>
                        <i style={{ background: h.type === "score" ? "var(--ink-faint)" : stageMeta(h.s).color }} />
                        <span>
                            {h.type === "score"
                                ? <><b>Scored {h.fit}/100</b>{h.resumeFilename ? " against " + h.resumeFilename : ""}</>
                                : <b>{stageMeta(h.s).label}</b>}
                            {" — "}{h.by || "?"} · {new Date(h.t).toLocaleDateString()}
                        </span>
                    </div>
                )) : <div style={{ fontSize: 13, color: "var(--ink-faint)" }}>No history yet.</div>}
            </div>
            <input
                ref={fileInput} type="file" accept={RESUME_ACCEPT} style={{ display: "none" }}
                onChange={e => { const f = e.target.files[0]; e.target.value = ""; if (f) actions.scoreWithNewResume(j.id, f); }}
            />
            <div className="lg-mfoot" style={{ marginTop: 20 }}>
                <button type="button" className="lg-btn ghost sm" onClick={() => { onClose(); actions.scoreOne(j.id); }}>✦ Re-score fit</button>
                {j.fit != null && <button type="button" className="lg-btn ghost sm" onClick={() => fileInput.current.click()}>✦ Score additional resume</button>}
                <button type="button" className="lg-btn ghost sm" onClick={() => { onClose(); onEdit(j); }}>Edit</button>
                <button
                    type="button" className="lg-btn ghost sm" style={{ color: "var(--denied)" }}
                    onClick={async () => { if (await actions.deleteJob(j.id, "Delete this role from the board?")) onClose(); }}
                >Delete</button>
            </div>
        </LegacyModal>
    );
}
