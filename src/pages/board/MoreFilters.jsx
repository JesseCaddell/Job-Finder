import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { topTags } from "../../lib/jobsView.js";

/* "More filters": the most common tags across the board, as toggles. */
export default function MoreFilters({ jobs, tag, onTag }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const close = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [open]);

    const tags = topTags(jobs);

    return (
        <div className="more-filters" ref={ref}>
            <button type="button" className={"btn btn-outline btn-sm" + (tag ? " on" : "")} onClick={() => setOpen(o => !o)} aria-expanded={open}>
                <SlidersHorizontal size={16} /> More filters{tag ? ` · ${tag}` : ""}
            </button>
            {open && (
                <div className="popover" role="dialog" aria-label="More filters">
                    <p className="popover-title">Filter by tag</p>
                    {tags.length ? (
                        <div className="popover-tags">
                            {tags.map(({ tag: t, count }) => (
                                <button
                                    type="button" key={t} className={"chip" + (tag === t ? " on" : "")}
                                    onClick={() => { onTag(tag === t ? null : t); }}
                                >{t} <span className="chip-count">{count}</span></button>
                            ))}
                        </div>
                    ) : <p className="muted">No tags yet. Tags come from the feed and from AI scoring.</p>}
                </div>
            )}
        </div>
    );
}
