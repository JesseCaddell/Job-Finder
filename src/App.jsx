import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useApp } from "./context/AppContext.jsx";
import Login from "./pages/Login.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import SetPassword from "./pages/SetPassword.jsx";

/* The pages are migrated one at a time. Anything not yet ported still runs
   in the original single-page app, served unchanged from public/legacy.html.
   Each migration PR takes over one route and removes its legacy counterpart. */
const LEGACY_URL = "/legacy.html";

/* "/" decides where a visitor belongs: signed-out shared-mode visitors go to
   the new sign-in page; everyone else lands on the legacy board (which also
   hosts the local-mode passcode gate). */
function Home() {
    const { ready, sharedMode, user } = useApp();
    const toLogin = ready && sharedMode && !user;
    useEffect(() => {
        if (ready && !toLogin) window.location.replace(LEGACY_URL);
    }, [ready, toLogin]);
    return toLogin ? <Navigate to="/login" replace /> : null;
}

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<SetPassword variant="reset" />} />
            <Route path="/accept-invite" element={<SetPassword variant="invite" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
