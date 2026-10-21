import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

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

export { default as Checkbox } from "../Checkbox.jsx";
