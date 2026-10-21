import { useState } from "react";
import { Navigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AuthShell from "../components/auth/AuthShell.jsx";
import { Checkbox, PasswordField } from "../components/auth/fields.jsx";
import { useApp } from "../context/AppContext.jsx";
import { getLocalState, saveLocalState } from "../lib/data.js";

/* Local mode sign-in: pick your name and enter the shared passcode. Local mode
   (no Supabase) has no Figma design yet, so this reuses the sign-in layout; its
   redesign is post-MVP. The first passcode entered becomes the shared one. */
export default function LocalLogin() {
    const { ready, sharedMode, account, signInLocal } = useApp();
    const [local] = useState(() => getLocalState());
    const [user, setUser] = useState(local.members[0] || "");
    const [code, setCode] = useState("");
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState("");

    if (!ready) return null;
    if (sharedMode || account) return <Navigate to="/" replace />;

    const submit = e => {
        e.preventDefault();
        const entered = code.trim();
        if (!entered) { setError("Enter an access code"); return; }
        if (!local.code) { local.code = entered; saveLocalState(); }
        if (entered !== local.code) { setError("That code doesn’t match"); return; }
        signInLocal(user, remember);
    };

    return (
        <AuthShell>
            <div className="auth-heading">
                <p className="eyebrow">WELCOME BACK</p>
                <h1>Pick up where you left off.</h1>
                <p>Local mode: your board lives on this device.</p>
            </div>
            <form className="auth-fields" onSubmit={submit} noValidate>
                <div className="field">
                    <label htmlFor="who">Who’s signing in?</label>
                    <div className="input input-tall">
                        <select id="who" className="plain-select" value={user} onChange={e => setUser(e.target.value)}>
                            {local.members.map(m => <option key={m}>{m}</option>)}
                        </select>
                    </div>
                </div>
                <PasswordField
                    label="Access code" id="code" autoComplete="current-password"
                    placeholder="Shared passcode" value={code} onChange={e => setCode(e.target.value)}
                />
                {!local.code && <p className="auth-hint">First time? Choose any code — it becomes the shared passcode.</p>}
                <Checkbox checked={remember} onChange={setRemember}>Keep me signed in for a week</Checkbox>
                {error && <p className="auth-error" role="alert">{error}</p>}
                <button type="submit" className="auth-submit">Enter the board <ArrowRight size={18} /></button>
            </form>
        </AuthShell>
    );
}
