import { store } from "./store.js";

/* Pages not yet ported to React are served from the original app. */
export const LEGACY_URL = "/legacy.html";

/* Local mode keeps its sign-in as { user, expires } under this key (written by
   the passcode gate in legacy.html). Expired sessions count as signed out. */
export function getLocalSession() {
    const s = store.get("pipeline_session");
    return s && (!s.expires || Date.now() < s.expires) ? s : null;
}

export function clearLocalSession() {
    store.del("pipeline_session");
}
