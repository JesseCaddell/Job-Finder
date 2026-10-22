import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AuthShell from "../components/auth/AuthShell.jsx";
import { Checkbox, PasswordField, TextField } from "../components/auth/fields.jsx";
import { useApp } from "../context/AppContext.jsx";
import { signInWithPassword } from "../lib/auth.js";

export default function Login() {
    const { ready, sharedMode, user } = useApp();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    if (!ready) return null;
    // Local mode has its own passcode page; signed-in visitors have no business here.
    if (!sharedMode || user) return <Navigate to="/" replace />;

    const submit = async e => {
        e.preventDefault();
        if (!email.trim() || !password) { setError("Email and password required"); return; }
        setBusy(true); setError("");
        const { error: err } = await signInWithPassword(email.trim(), password, remember);
        setBusy(false);
        // On success the session change in AppContext redirects away from here.
        if (err) setError(err);
    };

    return (
        <AuthShell>
            <div className="auth-heading">
                <p className="eyebrow">WELCOME BACK</p>
                <h1>Pick up where you left off.</h1>
                <p>Sign in to your shared job-search workspace.</p>
            </div>
            <form className="auth-fields" onSubmit={submit} noValidate>
                <TextField
                    label="Email address" id="email" type="email" autoComplete="email"
                    placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
                />
                <PasswordField
                    label="Password" id="password" autoComplete="current-password"
                    placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)}
                />
                <div className="auth-row">
                    <Checkbox checked={remember} onChange={setRemember}>Stay signed in</Checkbox>
                    <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
                </div>
                {error && <p className="auth-error" role="alert">{error}</p>}
                <button type="submit" className="auth-submit" disabled={busy}>
                    {busy ? "Signing in…" : <>Sign in <ArrowRight size={18} /></>}
                </button>
            </form>
        </AuthShell>
    );
}
