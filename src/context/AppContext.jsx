import { createContext, useContext, useEffect, useState } from "react";
import { loadConfig, SB, SHARED_MODE } from "../lib/config.js";

const AppContext = createContext(null);

/* Loads config once at boot, then (shared mode) the Supabase session.
   `ready` flips true only after both, so routes can decide where to send
   the visitor without flashing the wrong page. `sharedMode` and `user` are
   meaningless before `ready`. */
export function AppProvider({ children }) {
    const [ready, setReady] = useState(false);
    const [sharedMode, setSharedMode] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        let alive = true;
        let subscription = null;

        (async () => {
            await loadConfig();
            if (!alive) return;
            setSharedMode(SHARED_MODE);

            if (SHARED_MODE) {
                // getSession() also waits for supabase-js to consume tokens in the
                // URL hash, which is how invite and password-reset links sign in.
                const { data: { session } } = await SB.auth.getSession();
                if (!alive) return;
                setUser(session?.user ?? null);
                ({ data: { subscription } } = SB.auth.onAuthStateChange((event, next) => {
                    setUser(next?.user ?? null);
                }));
            }
            setReady(true);
        })();

        return () => { alive = false; subscription?.unsubscribe(); };
    }, []);

    return (
        <AppContext.Provider value={{ ready, sharedMode, user }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
    return ctx;
}
