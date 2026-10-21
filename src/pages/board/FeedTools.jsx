import { useState } from "react";
import { Archive, ArrowRight, ChevronRight, ChevronUp, Clock3, Plus, RotateCcw, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

function ToolRow({ icon: Icon, children, onClick }) {
    return (
        <button type="button" className="tool-row" onClick={onClick}>
            <Icon size={15} />
            <span>{children}</span>
            <ChevronRight size={13} />
        </button>
    );
}

/* Right-hand column: the board-wide actions (add, AI scoring, cleanup) and a
   pointer to Feed preferences. Cleanup only archives; it never deletes. */
export default function FeedTools({ actions, lowScoreThreshold, onAdd }) {
    const [open, setOpen] = useState(true);
    const [keyword, setKeyword] = useState("");

    const removeByKeyword = async () => {
        if (!keyword.trim()) return;
        if (await actions.removeByTitleKeyword(keyword)) setKeyword("");
    };

    return (
        <aside className="feed-side">
            <section className="tools-card">
                <button type="button" className="tools-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
                    <strong>Feed tools</strong>
                    <ChevronUp size={16} className={open ? "" : "flipped"} />
                </button>
                {open && <>
                    <button type="button" className="btn btn-outline" onClick={onAdd}><Plus size={16} /> Add job</button>
                    <hr />
                    <p className="tools-label">AI SCORING</p>
                    <button type="button" className="btn btn-outline" onClick={actions.scoreAllUnscored}>
                        {actions.scoreAll
                            ? `■ Stop (${actions.scoreAll.i}/${actions.scoreAll.n})`
                            : <><Sparkles size={16} /> Score all new jobs</>}
                    </button>
                    <ToolRow icon={RotateCcw} onClick={actions.clearNewScores}>Clear scores on New</ToolRow>
                    <hr />
                    <p className="tools-label">CLEAN UP NEW</p>
                    <ToolRow icon={Archive} onClick={actions.removeLowScores}>Remove low scores (under {lowScoreThreshold})</ToolRow>
                    <ToolRow icon={Archive} onClick={actions.removeSeniorRoles}>Remove Sr / Senior roles</ToolRow>
                    <div className="keyword-remove">
                        <label htmlFor="remove-keyword">Remove by title keyword</label>
                        <div className="input">
                            <input
                                id="remove-keyword" value={keyword} onChange={e => setKeyword(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); removeByKeyword(); } }}
                                placeholder="Enter a title keyword"
                            />
                        </div>
                        <small>Press Enter to archive matching jobs. Separate several with commas.</small>
                    </div>
                    <ToolRow icon={Clock3} onClick={actions.archiveOldPostings}>Archive postings 30+ days old</ToolRow>
                    <p className="tools-note">Cleanup moves jobs to Archive; it never permanently deletes them.</p>
                </>}
            </section>

            <section className="feed-focus">
                <h3 className="serif">A feed with a focus.</h3>
                <p>Titles and locations follow your preferences across 70+ companies and other sources.</p>
                <Link to="/settings/feed" className="focus-link">Manage feed preferences <ArrowRight size={14} /></Link>
                <hr />
            </section>
        </aside>
    );
}
