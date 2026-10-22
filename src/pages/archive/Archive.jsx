import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, RotateCcw, Search, Trash2 } from "lucide-react";
import Checkbox from "../../components/Checkbox.jsx";
import { useToast } from "../../components/Toast.jsx";
import { useJobs } from "../../context/JobsContext.jsx";
import { filterJobs, SORT_OPTIONS, topTags } from "../../lib/jobsView.js";
import AddEditJobModal from "../board/AddEditJobModal.jsx";
import DetailsModal from "../board/DetailsModal.jsx";
import useJobActions from "../board/useJobActions.js";
import ArchiveCleanup from "./ArchiveCleanup.jsx";
import ArchivedJobCard from "./ArchivedJobCard.jsx";
import "../board/board.css";
import "./archive.css";

const DAY_MS = 24 * 60 * 60 * 1000;
const AGE_FILTERS = [
    { value: "all", label: "Date added: All time" },
    { value: "recent", label: "Added in the last 30 days" },
    { value: "30", label: "Older than 30 days" },
    { value: "90", label: "Older than 90 days" }
];
const FIT_FILTERS = [
    { value: "any", label: "Fit score: Any" },
    { value: "unscored", label: "Unscored" },
    { value: "lt40", label: "Under 40" },
    { value: "40-59", label: "40–59" },
    { value: "60+", label: "60 and up" }
];

const matchesAge = (j, age) => {
    if (age === "all") return true;
    if (age === "recent") return j.added >= Date.now() - 30 * DAY_MS;
    return j.added < Date.now() - parseInt(age) * DAY_MS;
};
const matchesFit = (j, fit) => {
    switch (fit) {
        case "unscored": return j.fit == null;
        case "lt40": return j.fit != null && j.fit < 40;
        case "40-59": return j.fit != null && j.fit >= 40 && j.fit < 60;
        case "60+": return j.fit != null && j.fit >= 60;
        default: return true;
    }
};

function FilterSelect({ value, onChange, options, label }) {
    return (
        <span className="select-wrap">
            <select value={value} onChange={e => onChange(e.target.value)} aria-label={label}>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={16} />
        </span>
    );
}

const FRESH_FILTER = { q: "", sort: "added", tagFilter: "all", age: "all", fit: "any" };

export default function Archive() {
    const { jobs, loaded } = useJobs();
    const toast = useToast();
    const actions = useJobActions();

    const [filter, setFilter] = useState(FRESH_FILTER);
    const [selected, setSelected] = useState(() => new Set());
    const [editing, setEditing] = useState(null);
    const [detailId, setDetailId] = useState(null);
    const patch = p => setFilter(f => ({ ...f, ...p }));

    const archived = useMemo(() => jobs.filter(j => j.archived), [jobs]);
    const tagOptions = useMemo(() => [
        { value: "all", label: "All tags" },
        { value: "track:dev", label: "DEV" },
        { value: "track:pm", label: "PM" },
        ...topTags(archived).map(t => ({ value: "tag:" + t.tag, label: t.tag }))
    ], [archived]);

    const list = useMemo(() => {
        const [kind, value] = filter.tagFilter.split(":");
        return filterJobs(jobs, {
            archived: true, q: filter.q, sort: filter.sort,
            track: kind === "track" ? value : null, tag: kind === "tag" ? value : null
        }).filter(j => matchesAge(j, filter.age) && matchesFit(j, filter.fit));
    }, [jobs, filter]);

    const filtered = filter.q || filter.tagFilter !== "all" || filter.age !== "all" || filter.fit !== "any";
    const visibleSelected = list.filter(j => selected.has(j.id));
    const allSelected = list.length > 0 && visibleSelected.length === list.length;
    const toggleAll = on => setSelected(on ? new Set(list.map(j => j.id)) : new Set());
    const toggleOne = (id, on) => setSelected(prev => { const n = new Set(prev); on ? n.add(id) : n.delete(id); return n; });

    // Select the cleanup matches and clear the filters so they are all in view.
    const review = matches => {
        setFilter(FRESH_FILTER);
        setSelected(new Set(matches.map(j => j.id)));
        toast(matches.length
            ? `Selected ${matches.length} job${matches.length === 1 ? "" : "s"} for review — nothing is deleted yet`
            : "No archived jobs match those settings");
    };

    const restoreSelected = async () => { await actions.restoreToNew([...selected]); setSelected(new Set()); };
    const deleteSelected = async () => { if (await actions.deleteArchived([...selected])) setSelected(new Set()); };

    if (!loaded) return null;

    const count = archived.length;

    return (
        <div className="board archive page-centered">
            <div className="board-heading">
                <div className="page-heading">
                    <p className="eyebrow">KEPT, NOT GONE</p>
                    <h1>Room to reconsider.</h1>
                    <p>{count} archived job{count === 1 ? "" : "s"}. Removed postings stay here until you restore or permanently delete them.</p>
                </div>
                <Link to="/board" className="btn btn-outline"><ArrowLeft size={16} /> Back to board</Link>
            </div>

            <div className="notice">
                <p>Archive is separate from Denied. Restore a posting to New, or permanently delete it when you’re sure.</p>
            </div>

            <div className="feed-workspace">
                <div className="feed-main">
                    <div className="feed-search">
                        <div className="input">
                            <Search size={16} className="input-icon" />
                            <input
                                value={filter.q} onChange={e => patch({ q: e.target.value })}
                                placeholder="Search by title, company, location..." aria-label="Search archived jobs"
                            />
                        </div>
                        <span className="select-wrap sort">
                            <select value={filter.sort} onChange={e => patch({ sort: e.target.value })} aria-label="Sort archived jobs">
                                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <ChevronDown size={16} />
                        </span>
                    </div>

                    <div className="tag-filters">
                        <FilterSelect value={filter.tagFilter} onChange={tagFilter => patch({ tagFilter })} options={tagOptions} label="Filter by tag" />
                        <FilterSelect value={filter.age} onChange={age => patch({ age })} options={AGE_FILTERS} label="Filter by date added" />
                        <FilterSelect value={filter.fit} onChange={fit => patch({ fit })} options={FIT_FILTERS} label="Filter by fit score" />
                        <span className="spacer" />
                        <span className="job-count">{list.length} matching posting{list.length === 1 ? "" : "s"}</span>
                    </div>

                    {selected.size > 0 ? (
                        <div className="bulk-bar" role="toolbar" aria-label="Selected archived jobs">
                            <Checkbox checked={allSelected} onChange={toggleAll} label="Select all archived jobs" />
                            <strong>{selected.size} selected</strong>
                            <span className="spacer" />
                            <button type="button" className="btn btn-outline btn-sm" onClick={restoreSelected}><RotateCcw size={16} /> Restore to New</button>
                            <button type="button" className="btn btn-danger btn-sm" onClick={deleteSelected}><Trash2 size={16} /> Delete selected…</button>
                        </div>
                    ) : (
                        <div className="select-all">
                            <Checkbox checked={false} onChange={toggleAll} label="Select all archived jobs" />
                            <span>Select all</span>
                        </div>
                    )}

                    {list.length ? list.map(j => (
                        <ArchivedJobCard
                            key={j.id} job={j} actions={actions}
                            selected={selected.has(j.id)} onSelect={on => toggleOne(j.id, on)} onOpen={setDetailId}
                        />
                    )) : (
                        <div className="board-empty">
                            <h3 className="serif">{count ? "No matches." : "Nothing archived."}</h3>
                            <p>{count ? "No archived jobs match these filters." : "Jobs you remove from the board land here."}</p>
                        </div>
                    )}

                    <div className="result-summary">
                        <span>
                            {filter.q ? `${list.length} result${list.length === 1 ? "" : "s"} for “${filter.q}” in ` : filtered ? `${list.length} of ` : ""}
                            {count} archived job{count === 1 ? "" : "s"}
                        </span>
                        {filtered && <button type="button" className="text-link" onClick={() => setFilter(FRESH_FILTER)}>Clear search</button>}
                    </div>
                </div>

                <ArchiveCleanup archivedJobs={archived} onReview={review} />
            </div>

            {editing && <AddEditJobModal job={editing} onClose={() => setEditing(null)} />}
            {detailId && <DetailsModal jobId={detailId} actions={actions} onEdit={setEditing} onClose={() => setDetailId(null)} />}
        </div>
    );
}
