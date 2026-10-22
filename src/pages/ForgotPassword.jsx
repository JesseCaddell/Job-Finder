import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AuthShell from "../components/auth/AuthShell.jsx";
import { TextField } from "../components/auth/fields.jsx";
import { useApp } from "../context/AppContext.jsx";
import { sendPasswordReset } from "../lib/auth.js";

export default function ForgotPassword() {
    const { ready, sharedMode } = useApp();
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);

    if (!ready) return null;
    if (!sharedMode) return <Navigate to="/" replace />;

    const submit = async e => {
        e.preventDefault();
        if (!email.trim()) { setError("Enter the email address on your account"); return; }
        setBusy(true); setError("");
        const { error: err } = await sendPasswordReset(email.trim());
        setBusy(false);
        if (err) setError(err); else setSent(true);
    };

    return (
        <AuthShell>
            <div className="auth-heading">
                <p className="eyebrow">RESET YOUR PASSWORD</p>
                <h1>Let’s get you back in.</h1>
                <p>Enter your email and we’ll send a link to choose a new password.</p>
            </div>
            {sent ? (
                <div className="auth-notice" role="status">
                    <strong>Check your inbox.</strong>
                    <span>If an account exists for {email.trim()}, a reset link is on its way.</span>
                </div>
            ) : (
                <form className="auth-fields" onSubmit={submit} noValidate>
                    <TextField
                        label="Email address" id="email" type="email" autoComplete="email"
                        placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
                    />
                    {error && <p className="auth-error" role="alert">{error}</p>}
                    <button type="submit" className="auth-submit" disabled={busy}>
                        {busy ? "Sending…" : <>Send reset link <ArrowRight size={18} /></>}
                    </button>
                </form>
            )}
            <div className="auth-back"><Link to="/login" className="auth-link">Back to sign in</Link></div>
        </AuthShell>
    );
}
