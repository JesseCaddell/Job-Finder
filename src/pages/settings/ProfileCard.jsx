import { useState } from "react";
import { Pencil } from "lucide-react";
import Modal from "../../components/Modal.jsx";
import { DEFAULT_PROFILE } from "../../lib/defaults.js";

/* Read-only view of the search background. The pencil opens a roomier editor;
   saving there writes straight to settings (no page-level Save needed). */
export default function ProfileCard({ profile, onSave, onSaved }) {
    const text = profile || DEFAULT_PROFILE;
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);

    const open = () => { setDraft(text); setEditing(true); };
    const save = async () => {
        setBusy(true);
        await onSave(draft.trim());
        setBusy(false);
        setEditing(false);
        onSaved();
    };

    return (
        <section className="card">
            <div className="card-intro">
                <h2>Search background</h2>
                <p>Your experience, direction, and career stage. Edit this as your search evolves.</p>
            </div>
            <div className="background-block">
                {text.split(/\n+/).map((para, i) => <p key={i}>{para}</p>)}
                <div className="background-foot">
                    <span>Used as context for AI fit scoring</span>
                    <button type="button" className="icon-btn" onClick={open} aria-label="Edit search background">
                        <Pencil size={14} />
                    </button>
                </div>
            </div>

            {editing && (
                <Modal
                    title="Search background"
                    onClose={() => setEditing(false)}
                    footer={<>
                        <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
                        <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
                            {busy ? "Saving…" : "Save background"}
                        </button>
                    </>}
                >
                    <p className="muted">
                        The AI scores every posting against this. Be specific about titles, level, and area.
                    </p>
                    <textarea
                        className="textarea" rows={12} value={draft} autoFocus
                        onChange={e => setDraft(e.target.value)}
                        aria-label="Search background"
                    />
                </Modal>
            )}
        </section>
    );
}
