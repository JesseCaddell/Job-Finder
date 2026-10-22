import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AuthShell from "../components/auth/AuthShell.jsx";
import { PasswordField } from "../components/auth/fields.jsx";
import { useApp } from "../context/AppContext.jsx";
import { updatePassword, verifyEmailLink } from "../lib/auth.js";

const MIN_LENGTH = 8;

const COPY = {
    invite: {
        eyebrow: "YOU’RE INVITED",
        title: "Choose a password to get started.",
        sub: "Set a password to finish creating your account.",
        cta: "Create account"
    },
    reset: {
        eyebrow: "RESET YOUR PASSWORD",
        title: "Choose a new password.",
        sub: "You’ll use it the next time you sign in.",
        cta: "Update password"
    }
};

/* Shared by /accept-invite and /reset-password. Both arrive from an emailed
   link that supabase-js has already turned into a session, so the person is
   signed in here and only needs to pick a password. */
export default function SetPassword({ variant }) {
    const { ready, sharedMode, user } = useApp();
    const copy = COPY[variant];
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const tokenHash = params.get("token_hash");
    const verifyStarted = useRef(false);
    const [verifying, setVerifying] = useState(!!tokenHash);
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    // Invite links carry a one-time token in the query string; exchange it for
    // a session once (the ref stops React StrictMode from spending it twice).
    useEffect(() => {
        if (!ready || !sharedMode || !tokenHash || verifyStarted.current) return;
        verifyStarted.current = true;
        verifyEmailLink(tokenHash, params.get("type") || "invite").then(() => {
            setVerifying(false);
            navigate({ search: "" }, { replace: true });   // drop the spent token from the URL
        });
    }, [ready, sharedMode, tokenHash, params, navigate]);

    if (!ready || verifying) return null;
    if (!sharedMode) return <Navigate to="/" replace />;
    if (done) return <Navigate to="/" replace />;

    // No session means the emailed link was missing, expired, or already used.
    if (!user) {
        return (
            <AuthShell>
                <div className="auth-heading">
                    <p className="eyebrow">LINK PROBLEM</p>
                    <h1>This link has expired.</h1>
                    <p>
                        {variant === "invite"
                            ? "Ask whoever invited you to send a new invitation."
                            : "Request a new reset link and try again."}
                    </p>
                </div>
                <div className="auth-back">
                    <Link to={variant === "invite" ? "/login" : "/forgot-password"} className="auth-link">
                        {variant === "invite" ? "Go to sign in" : "Request a new link"}
                    </Link>
                </div>
            </AuthShell>
        );
    }

    const submit = async e => {
        e.preventDefault();
        if (password.length < MIN_LENGTH) { setError(`Use at least ${MIN_LENGTH} characters`); return; }
        if (password !== confirm) { setError("The two passwords don’t match"); return; }
        setBusy(true); setError("");
        const { error: err } = await updatePassword(password);
        setBusy(false);
        if (err) setError(err); else setDone(true);
    };

    return (
        <AuthShell>
            <div className="auth-heading">
                <p className="eyebrow">{copy.eyebrow}</p>
                <h1>{copy.title}</h1>
                <p>{copy.sub}</p>
            </div>
            <form className="auth-fields" onSubmit={submit} noValidate>
                <PasswordField
                    label="New password" id="password" autoComplete="new-password"
                    placeholder={`At least ${MIN_LENGTH} characters`} value={password} onChange={e => setPassword(e.target.value)}
                />
                <PasswordField
                    label="Confirm password" id="confirm" autoComplete="new-password"
                    placeholder="Enter it again" value={confirm} onChange={e => setConfirm(e.target.value)}
                />
                {error && <p className="auth-error" role="alert">{error}</p>}
                <button type="submit" className="auth-submit" disabled={busy}>
                    {busy ? "Saving…" : <>{copy.cta} <ArrowRight size={18} /></>}
                </button>
            </form>
        </AuthShell>
    );
}
