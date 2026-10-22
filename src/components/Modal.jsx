import { useEffect } from "react";
import { X } from "lucide-react";
import "./modal.css";

/* Centered dialog. Closes on Escape, on the close button, and on a click
   outside the panel. */
export default function Modal({ title, onClose, children, footer }) {
    useEffect(() => {
        const onKey = e => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
                <div className="modal-head">
                    <h2 className="serif">{title}</h2>
                    <button type="button" className="modal-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-foot">{footer}</div>}
            </div>
        </div>
    );
}
