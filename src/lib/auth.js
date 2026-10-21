import { SB } from "./config.js";
import { setRemember } from "./authStorage.js";

/* Thin wrappers over supabase.auth that normalize errors to { error: string }.
   Shared mode only — local mode has its own passcode gate in legacy.html. */

export async function signInWithPassword(email, password, remember) {
    setRemember(remember);   // must be set first so the new session is stored where the user chose
    const { error } = await SB.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
}

export async function sendPasswordReset(email) {
    const { error } = await SB.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password"
    });
    return { error: error?.message || null };
}

// Invite emails link here with ?token_hash=...&type=invite. Verifying in the
// app (instead of letting Supabase's /verify endpoint do it) means an email
// scanner that merely fetches the link can't use up the one-time token.
export async function verifyEmailLink(tokenHash, type) {
    const { error } = await SB.auth.verifyOtp({ token_hash: tokenHash, type });
    return { error: error?.message || null };
}

// Used by both the accept-invite and reset-password pages: the emailed link
// signs the person in, then they choose a password.
export async function updatePassword(password) {
    const { error } = await SB.auth.updateUser({ password });
    return { error: error?.message || null };
}

export async function signOut() {
    await SB.auth.signOut();
}

export const displayName = user =>
    user?.user_metadata?.name || user?.email?.split("@")[0] || "";
