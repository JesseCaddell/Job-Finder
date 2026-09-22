// netlify/lib/verify-user.js
//
// Shared auth check for functions that spend money (Anthropic calls).
// Lives outside netlify/functions/ so Netlify doesn't deploy it as an endpoint.
//
// Shared mode (SUPABASE_URL + SUPABASE_ANON_KEY set): the request must carry
//   "Authorization: Bearer <supabase access token>". The token is checked
//   against Supabase's /auth/v1/user endpoint — no SDK needed.
// Local mode (no Supabase env vars): there are no user accounts to check, so
//   requests are allowed. Anyone who finds the function URL can use it —
//   set a spend limit in the Anthropic console.
//
// Returns null when the caller is allowed, or a Netlify response object to
// return as-is when they aren't.

export async function verifyUser(event) {
    const url     = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;

    const auth  = event.headers?.authorization || event.headers?.Authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return deny("Missing auth token — sign in first");

    try {
        const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/user`, {
            headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return deny("Invalid or expired session — sign in again");
        return null;
    } catch (e) {
        console.error("verifyUser error:", e);
        return { statusCode: 502, body: JSON.stringify({ error: "Could not verify session" }) };
    }
}

function deny(message) {
    return { statusCode: 401, body: JSON.stringify({ error: message }) };
}
