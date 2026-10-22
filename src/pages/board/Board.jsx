import { useMemo, useState } from "react";
import { ChevronDown, RefreshCw, Search } from "lucide-react";
import Checkbox from "../../components/Checkbox.jsx";
import { useToast } from "../../components/Toast.jsx";
import { useApp } from "../../context/AppContext.jsx";
import { useJobs } from "../../context/JobsContext.jsx";
import { feedConfigured, feedSummary, NO_FEED_MSG, pullFeed } from "../../lib/feed.js";
import { filterJobs, SORT_OPTIONS } from "../../lib/jobsView.js";
import { STAGES, stageMeta } from "../../lib/stages.js";
import AddEditJobModal from "./AddEditJobModal.jsx";
import DetailsModal from "./DetailsModal.jsx";
import FeedTools from "./FeedTools.jsx";
import JobCard from "./JobCard.jsx";
import useJobActions from "./useJobActions.js";
import "./board.css";

// The board opens on New: the stage tabs are the per-stage destinations, so a
// status change visibly moves a job somewhere.
const DEFAULT_STAGE = "new";

export default function Board() {
    const { account } = useApp();
    const { jobs, setJobs, loaded, lowScoreThreshold } = useJobs();
    const toast = useToast();
    const actions = useJobActions();

    const [filter, setFilter] = useState({ stage: DEFAULT_STAGE, track: null, q: "", sort: "added" });
    const [selected, setSelected] = useState(() => new Set());
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState(null);     // job being edited
    const [detailId, setDetailId] = useState(null);
    const [pulling, setPulling] = useState(false);

    const patch = p => setFilter(f => ({ ...f, ...p }));
    const list = useMemo(() => filterJobs(jobs, filter), [jobs, filter]);

    const counts = useMemo(() => {
        const c = Object.fromEntries(STAGES.map(s => [s.key, 0]));
        jobs.filter(j => !j.archived).forEach(j => { c[j.status] = (c[j.status] || 0) + 1; });
        return c;
    }, [jobs]);

    const pull = async () => {
        if (!feedConfigured()) { toast(NO_FEED_MSG); return; }
        setPulling(true); toast("Pulling feed…");
        try {
            const result = await pullFeed(jobs);
            setJobs(result.jobs);
            toast(feedSummary(result));
        } catch (e) {
            console.warn(e);
            toast("Couldn't reach the feed endpoint");
        }
        setPulling(false);
    };

    const allSelected = list.length > 0 && list.every(j => selected.has(j.id));
    const toggleAll = on => setSelected(on ? new Set(list.map(j => j.id)) : new Set());
    const toggleOne = (id, on) => setSelected(prev => { const n = new Set(prev); on ? n.add(id) : n.delete(id); return n; });

    if (!loaded) return null;

    const stageLabel = filter.stage ? stageMeta(filter.stage).label.toLowerCase() + " " : "";
    const emptyMessage = !jobs.length
        ? "Paste a job link to get started — or pull the feed."
        : filter.stage && !filter.track && !filter.q
            ? `No ${stageMeta(filter.stage).label} roles right now — pick another stage above to see others.`
            : "No roles match this filter.";

    return (
        <div className="board board-centered">
            <div className="board-heading">
                <div className="page-heading">
                    <p className="eyebrow">YOUR NEXT CHAPTER</p>
                    <h1>A little closer to what’s next.</h1>
                    <p>Your board, {account?.name}. Discover a role, check the fit, then move it forward.</p>
                </div>
                <button type="button" className="btn btn-primary" onClick={pull} disabled={pulling}>
                    <RefreshCw size={16} /> {pulling ? "Pulling…" : "Pull feed now"}
                </button>
            </div>

            <div className="stage-tabs" role="tablist" aria-label="Pipeline stages">
                {STAGES.map(s => (
                    <button
                        type="button" role="tab" key={s.key} aria-selected={filter.stage === s.key}
                        className={"stage-tab" + (filter.stage === s.key ? " active" : "")}
                        onClick={() => patch({ stage: filter.stage === s.key ? null : s.key })}
                    >
                        <span className="stage-marker" style={{ background: s.color }} />
                        <span className="stage-count serif">{counts[s.key] || 0}</span>
                        <span className="stage-label">{s.label}</span>
                    </button>
                ))}
            </div>

            <div className="feed-workspace">
                <div className="feed-main">
                    <div className="feed-search">
                        <div className="input">
                            <Search size={16} className="input-icon" />
                            <input
                                value={filter.q} onChange={e => patch({ q: e.target.value })}
                                placeholder="Search title, company, location…" aria-label="Search jobs"
                            />
                        </div>
                        <span className="select-wrap sort">
                            <select value={filter.sort} onChange={e => patch({ sort: e.target.value })} aria-label="Sort jobs">
                                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <ChevronDown size={16} />
                        </span>
                    </div>

                    <div className="tag-filters">
                        <button
                            type="button" className={"btn btn-outline btn-sm" + (!filter.track ? " on" : "")}
                            onClick={() => patch({ track: null })}
                        >All tags</button>
                        <button type="button" className={"tag tag-blue filter-tag" + (filter.track === "dev" ? " on" : "")} onClick={() => patch({ track: filter.track === "dev" ? null : "dev" })}>DEV</button>
                        <button type="button" className={"tag tag-purple filter-tag" + (filter.track === "pm" ? " on" : "")} onClick={() => patch({ track: filter.track === "pm" ? null : "pm" })}>PM</button>
                        <span className="spacer" />
                        <span className="job-count">{list.length} {stageLabel}job{list.length === 1 ? "" : "s"}</span>
                    </div>

                    <div className="select-all">
                        <Checkbox checked={allSelected} onChange={toggleAll} label="Select all jobs" />
                        <span>{selected.size ? `${selected.size} selected` : "Select all"}</span>
                        <span className="spacer" />
                        <span className="hint-text">Use the stage dropdown to update each job.</span>
                    </div>

                    {list.length ? list.map(j => (
                        <JobCard
                            key={j.id} job={j} actions={actions} lowScoreThreshold={lowScoreThreshold}
                            selected={selected.has(j.id)} onSelect={on => toggleOne(j.id, on)}
                            scoring={actions.scoringId === j.id} onOpen={setDetailId}
                        />
                    )) : (
                        <div className="board-empty">
                            <h3 className="serif">Nothing here yet.</h3>
                            <p>{emptyMessage}</p>
                            <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>+ Add your first job</button>
                        </div>
                    )}
                </div>

                <FeedTools actions={actions} lowScoreThreshold={lowScoreThreshold} onAdd={() => setAdding(true)} />
            </div>

            {(adding || editing) && <AddEditJobModal job={editing} onClose={() => { setAdding(false); setEditing(null); }} />}
            {detailId && <DetailsModal jobId={detailId} actions={actions} onEdit={setEditing} onClose={() => setDetailId(null)} />}
        </div>
    );
}
