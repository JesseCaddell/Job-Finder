import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useApp } from "./context/AppContext.jsx";

/* The pages are migrated one at a time. Anything not yet ported still runs
   in the original single-page app, served unchanged from public/legacy.html.
   Each migration PR takes over one route and removes its legacy counterpart. */
const LEGACY_URL = "/legacy.html";

function Legacy() {
    const { ready } = useApp();
    useEffect(() => { if (ready) window.location.replace(LEGACY_URL); }, [ready]);
    return null;
}

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Legacy />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
