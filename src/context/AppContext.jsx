import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { loadConfig, SB, SHARED_MODE } from "../lib/config.js";
import { displayName, signOut as supaSignOut } from "../lib/auth.js";
import { clearLocalSession, getLocalSession, saveLocalSession } from "../lib/session.js";

const AppContext = createContext(null);

/* Loads config once at boot, then (shared mode) the Supabase session.
   `ready` flips true only after both, so routes can decide where to send
   the visitor without flashing the wrong page. `sharedMode`, `user` and
   `account` are meaningless before `ready`.

   `account` is the signed-in person in either mode: { name, id } in shared
   mode, { name } in local mode, null when signed out. */
export function AppProvider({ children }) {
    const [ready, setReady] = useState(false);
    const [sharedMode, setSharedMode] = useState(false);
    const [user, setUser] = useState(null);
    const [localSession, setLocalSession] = useState(() => getLocalSession());

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

    let account = null;
    if (ready) {
        if (sharedMode) {
            if (user) account = { name: displayName(user), id: user.id };
        } else if (localSession) {
            account = { name: localSession.user };
        }
    }

    // Shared mode: the auth listener above clears `user`, which sends routes
    // to /login. Local mode: drop the session, which sends routes to /local-login.
    const signOut = useCallback(async () => {
        if (SHARED_MODE) { await supaSignOut(); return; }
        clearLocalSession();
        setLocalSession(null);
    }, []);

    const signInLocal = useCallback((name, remember) => {
        setLocalSession(saveLocalSession(name, remember));
    }, []);

    return (
        <AppContext.Provider value={{ ready, sharedMode, user, account, signOut, signInLocal }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
    return ctx;
}
