import { store } from "./store.js";

export const LOCAL_LOGIN_PATH = "/local-login";

const KEY = "pipeline_session";
const safe = fn => { try { return fn(); } catch (e) { return null; } };
const fromSessionStorage = () => safe(() => JSON.parse(sessionStorage.getItem(KEY)));

/* Local mode keeps its sign-in as { user, expires } — in localStorage for a
   week when "Keep me signed in" is checked, otherwise in sessionStorage so it
   ends with the tab. Expired sessions count as signed out. */
export function getLocalSession() {
    const s = fromSessionStorage() || store.get(KEY);
    return s && (!s.expires || Date.now() < s.expires) ? s : null;
}

export function saveLocalSession(user, remember) {
    const session = { user, expires: remember ? Date.now() + 7 * 864e5 : null };
    if (remember) {
        safe(() => sessionStorage.removeItem(KEY));
        store.set(KEY, session);
    } else {
        store.del(KEY);
        safe(() => sessionStorage.setItem(KEY, JSON.stringify(session)));
    }
    return session;
}

export function clearLocalSession() {
    store.del(KEY);
    safe(() => sessionStorage.removeItem(KEY));
}
