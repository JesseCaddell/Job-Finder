import { useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";

export function TextField({ label, id, ...input }) {
    return (
        <div className="field">
            <label htmlFor={id}>{label}</label>
            <div className="input">
                <input id={id} {...input} />
            </div>
        </div>
    );
}

export function PasswordField({ label, id, ...input }) {
    const [shown, setShown] = useState(false);
    return (
        <div className="field">
            <label htmlFor={id}>{label}</label>
            <div className="input input-tall">
                <input id={id} type={shown ? "text" : "password"} {...input} />
                <button
                    type="button"
                    className="eye"
                    onClick={() => setShown(s => !s)}
                    aria-label={shown ? "Hide password" : "Show password"}
                >
                    {shown ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
        </div>
    );
}

export function Checkbox({ checked, onChange, children }) {
    return (
        <label className="check">
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
            <span className="check-box" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>
            <span>{children}</span>
        </label>
    );
}
