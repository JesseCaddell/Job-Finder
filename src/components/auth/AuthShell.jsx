import { ArrowUpRight } from "lucide-react";
import Brand from "../Brand.jsx";
import "./auth.css";

const STEPS = [
    { n: "01", title: "Discover",     desc: "Opportunities from 70+ companies & sources", color: "var(--accent)" },
    { n: "02", title: "Find your fit", desc: "Scored against your background and resume",  color: "var(--blue)" },
    { n: "03", title: "Move forward", desc: "Every application, one organized board",     color: "var(--green)" }
];

/* Split layout shared by sign in, forgot password, and the set-password
   pages: editorial welcome on the left, the form on the right. */
export default function AuthShell({ children }) {
    return (
        <div className="auth">
            <aside className="auth-welcome">
                <Brand />
                <div className="auth-promise">
                    <p className="eyebrow">A LITTLE DIRECTION. A LOT OF POSSIBILITY.</p>
                    <h2 className="auth-headline serif">Your next chapter, with a clearer path.</h2>
                    <p className="auth-lede">
                        A thoughtful job feed. A shared place to track it. Less noise between you and your next role.
                    </p>
                    <ol className="auth-steps">
                        {STEPS.map(s => (
                            <li key={s.n} className="auth-step">
                                <span className="step-marker" style={{ borderColor: s.color, color: s.color }}>{s.n}</span>
                                <span className="step-text">
                                    <strong>{s.title}</strong>
                                    <span>{s.desc}</span>
                                </span>
                                <ArrowUpRight size={18} className="step-arrow" aria-hidden="true" />
                            </li>
                        ))}
                    </ol>
                </div>
                <p className="auth-footer">THE PIPELINE &nbsp;/&nbsp; YOUR SHARED JOB-SEARCH COMMAND CENTER</p>
            </aside>
            <main className="auth-main">
                <div className="auth-form">{children}</div>
            </main>
        </div>
    );
}
