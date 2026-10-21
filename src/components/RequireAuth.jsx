import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";
import { LEGACY_URL } from "../lib/session.js";

/* Gate for signed-in pages. Shared mode sends visitors to /login. Local mode
   has no React sign-in yet (its redesign is post-MVP), so a missing local
   session goes to the passcode gate in legacy.html. */
export default function RequireAuth({ children }) {
    const { ready, sharedMode, account } = useApp();
    const toLegacyGate = ready && !sharedMode && !account;

    useEffect(() => {
        if (toLegacyGate) window.location.replace(LEGACY_URL);
    }, [toLegacyGate]);

    if (!ready || toLegacyGate) return null;
    if (!account) return <Navigate to="/login" replace />;
    return children;
}
