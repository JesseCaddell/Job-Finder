import { Check } from "lucide-react";

/* Square checkbox from the Figma file. Pass `children` for a visible label, or
   `label` for an accessible name when there is no visible text. */
export default function Checkbox({ checked, onChange, children, label }) {
    return (
        <label className="check">
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} aria-label={label} />
            <span className="check-box" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>
            {children && <span>{children}</span>}
        </label>
    );
}
