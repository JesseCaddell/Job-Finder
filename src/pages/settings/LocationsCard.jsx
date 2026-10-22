import { useState } from "react";
import { CircleCheck, CircleMinus, Plus, X } from "lucide-react";
import { normalizeKeyword } from "../../lib/keywords.js";

const RULES = [
    { icon: CircleCheck, ok: true,  label: "Remote · no state restriction", note: "Allowed, even if no state is named." },
    { icon: CircleCheck, ok: true,  label: "Remote · Washington only",      note: "Allowed because Washington is in your list." },
    { icon: CircleMinus, ok: false, label: "Remote · another state only",   note: "Not allowed unless that state is in your list." }
];

/* Allowed states/cities. A posting must name one or be unrestricted Remote.
   Changes save immediately. */
export default function LocationsCard({ locations, onChange }) {
    const [adding, setAdding] = useState(false);
    const [text, setText] = useState("");

    const finish = save => {
        const v = normalizeKeyword(text);
        setText(""); setAdding(false);
        if (save && v && !locations.includes(v)) onChange([...locations, v]);
    };

    return (
        <section className="card">
            <div className="card-intro">
                <h2>Allowed locations</h2>
                <p>A posting must name an allowed location or offer unrestricted Remote work.</p>
            </div>
            <div className="loc-list">
                {locations.map(l => (
                    <span className="loc-chip" key={l}>
                        {l}
                        <button type="button" className="icon-btn" onClick={() => onChange(locations.filter(x => x !== l))} aria-label={`Remove ${l}`}>
                            <X size={14} />
                        </button>
                    </span>
                ))}
                {adding ? (
                    <div className="input loc-input">
                        <input
                            autoFocus value={text} onChange={e => setText(e.target.value)}
                            onBlur={() => finish(true)}
                            onKeyDown={e => {
                                if (e.key === "Enter") { e.preventDefault(); finish(true); }
                                if (e.key === "Escape") finish(false);
                            }}
                            placeholder="e.g. oregon" aria-label="Add a state or city"
                        />
                    </div>
                ) : (
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setAdding(true)}>
                        <Plus size={16} /> Add location
                    </button>
                )}
            </div>
            <div className="remote-rules">
                <strong>How Remote is matched</strong>
                {RULES.map(({ icon: Icon, ok, label, note }) => (
                    <div className="remote-rule" key={label}>
                        <Icon size={17} className={ok ? "ok" : "no"} />
                        <span className="rule-label">{label}</span>
                        <span className="rule-note">{note}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}
