import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Search, X } from "lucide-react";
import { groupMeta, KEYWORD_GROUPS, keywordGroup, normalizeKeyword } from "../../lib/keywords.js";

/* The title keyword allowlist: add, search, filter by group, remove.

   The input has two modes. In "add" mode it is an add box — Enter adds the
   keyword and saves immediately. The button beside it switches to "search"
   mode, where the same box filters the saved list; the button then reads
   "Add keyword" and switches back. `limit` shows only a preview of the list
   with a link to the full page. */
export default function KeywordManager({ keywords, onChange, limit, fullPath }) {
    const [mode, setMode] = useState("add");
    const [text, setText] = useState("");
    const [group, setGroup] = useState("all");

    const searching = mode === "search";
    const switchMode = () => { setText(""); setMode(searching ? "add" : "search"); };

    const add = () => {
        const v = normalizeKeyword(text);
        setText("");
        if (!v || keywords.includes(v)) return;
        onChange([...keywords, v]);
    };
    const remove = kw => onChange(keywords.filter(k => k !== kw));

    const needle = searching ? normalizeKeyword(text) : "";
    const present = new Set(keywords.map(keywordGroup));
    const groups = KEYWORD_GROUPS.filter(g => g.key !== "other" || present.has("other"));
    const matches = keywords.filter(k =>
        (group === "all" || keywordGroup(k) === group) && (!needle || k.includes(needle)));
    const shown = limit ? matches.slice(0, limit) : matches;

    return (
        <>
            <div className="kw-controls">
                <div className="input">
                    {searching ? <Search size={16} className="input-icon" /> : <Plus size={16} className="input-icon" />}
                    <input
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => { if (!searching && e.key === "Enter") { e.preventDefault(); add(); } }}
                        placeholder={searching ? "Search saved title keywords…" : "Add a title keyword, e.g. business analyst"}
                        aria-label={searching ? "Search saved title keywords" : "Add a title keyword"}
                    />
                </div>
                <button type="button" className="btn btn-outline" onClick={switchMode}>
                    {searching ? <><Plus size={16} /> Add keyword</> : <><Search size={16} /> Search</>}
                </button>
            </div>
            {!searching && <p className="kw-hint">Press Enter to add. Keywords save automatically.</p>}

            <div className="kw-groups">
                <button type="button" className={"chip" + (group === "all" ? " on" : "")} onClick={() => setGroup("all")}>All keywords</button>
                {groups.map(g => (
                    <button type="button" key={g.key} className={"chip" + (group === g.key ? " on" : "")} onClick={() => setGroup(g.key)}>
                        {g.label}
                    </button>
                ))}
                <span className="kw-count">
                    {limit ? "Keyword preview · not the full allowlist" : `${matches.length} of ${keywords.length} keywords`}
                </span>
            </div>

            <div className="kw-table">
                <div className="kw-row kw-head"><span>TITLE CONTAINS</span><span>GROUP</span><span className="kw-x" /></div>
                {shown.map(k => {
                    const g = groupMeta(keywordGroup(k));
                    return (
                        <div className="kw-row" key={k}>
                            <span>{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                            <span className={"tag " + g.tag}>{g.label}</span>
                            <button type="button" className="kw-x icon-btn" onClick={() => remove(k)} aria-label={`Remove ${k}`}>
                                <X size={15} />
                            </button>
                        </div>
                    );
                })}
                {!shown.length && <p className="kw-empty">{needle ? `No saved keywords match “${needle}”.` : "No keywords in this group."}</p>}
            </div>

            {limit && (
                <div className="kw-foot">
                    <span>
                        {matches.length > limit ? "Showing a selection of title keywords" : `Showing all ${matches.length} title keywords`}
                    </span>
                    <Link to={fullPath} className="btn btn-outline btn-sm"><ArrowRight size={16} /> Manage full allowlist</Link>
                </div>
            )}
        </>
    );
}
