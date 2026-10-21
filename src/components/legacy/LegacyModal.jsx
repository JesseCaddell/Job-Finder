import { useEffect } from "react";
import "./legacy.css";

/* Dialog shell for the undesigned dialogs (Add/Edit job, Details) — see
   legacy.css. Closes on Escape, the × button, or a click outside. */
export default function LegacyModal({ title, onClose, children }) {
    useEffect(() => {
        const onKey = e => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="lg-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="lg-modal" role="dialog" aria-modal="true" aria-label={title}>
                <div className="lg-mhead">
                    <span className="lg-serif">{title}</span>
                    <button type="button" className="lg-x" onClick={onClose} aria-label="Close">×</button>
                </div>
                <div className="lg-mbody">{children}</div>
            </div>
        </div>
    );
}
