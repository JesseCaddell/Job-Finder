import { createContext, useContext, useEffect, useState } from "react";
import { loadConfig, SHARED_MODE } from "../lib/config.js";

const AppContext = createContext(null);

/* Loads config once at boot. Later migrated pages add session, jobs and
   settings state here. `sharedMode` is false until config resolves, so
   nothing should read it before `ready`. */
export function AppProvider({ children }) {
    const [ready, setReady] = useState(false);
    const [sharedMode, setSharedMode] = useState(false);

    useEffect(() => {
        let alive = true;
        loadConfig().then(() => {
            if (!alive) return;
            setSharedMode(SHARED_MODE);
            setReady(true);
        });
        return () => { alive = false; };
    }, []);

    return (
        <AppContext.Provider value={{ ready, sharedMode }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
    return ctx;
}
