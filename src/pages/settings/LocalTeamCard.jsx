import { useState } from "react";
import { getLocalState, saveLocalState } from "../../lib/data.js";
import { initials } from "../../lib/format.js";

/* Local mode only: the names that can sign in and the shared passcode. These
   moved over from the legacy Settings modal unchanged; local mode gets its own
   redesign after the MVP. The passcode is applied by the page's Save settings. */
export default function LocalTeamCard({ passcode, onPasscode }) {
    const [members, setMembers] = useState(() => [...getLocalState().members]);
    const [name, setName] = useState("");

    const update = next => {
        getLocalState().members = next;
        saveLocalState();
        setMembers(next);
    };
    const add = () => {
        const v = name.trim();
        if (!v) return;
        update([...members, v]);
        setName("");
    };

    return (
        <section className="card">
            <div className="card-intro">
                <h2>Team</h2>
                <p>Names shown when attributing submissions. Shared mode uses real accounts instead.</p>
            </div>
            <div>
                {members.map((m, i) => (
                    <div className="member-row" key={m + i}>
                        <span className="avatar">{initials(m)}</span>
                        <span className="name">{m}</span>
                        {members.length > 1 && (
                            <button type="button" className="text-link" onClick={() => update(members.filter((_, j) => j !== i))}>remove</button>
                        )}
                    </div>
                ))}
            </div>
            <div className="member-add">
                <div className="input">
                    <input
                        placeholder="Add a name" value={name} aria-label="New team member"
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                    />
                </div>
                <button type="button" className="btn btn-outline" onClick={add}>Add</button>
            </div>
            <div className="field">
                <label htmlFor="passcode">Shared access code</label>
                <div className="input">
                    <input
                        id="passcode" type="password" value={passcode} onChange={e => onPasscode(e.target.value)}
                        placeholder="New passcode (leave blank to keep current)"
                    />
                </div>
            </div>
        </section>
    );
}
