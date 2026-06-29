// netlify/functions/get-config.js
//
// Serves public config values to the frontend at boot.
// Secrets live in Netlify environment variables, never in source code.
//
// Set these in Netlify → Site settings → Environment variables:
//   SUPABASE_URL      your project URL  (https://xxxx.supabase.co)
//   SUPABASE_ANON_KEY your anon/public key (safe to expose to browsers,
//                     but still shouldn't be hardcoded in git)
//
// Note: the Supabase anon key is NOT a secret in the traditional sense —
// Supabase designed it to be used in browsers. But it identifies your
// project, so keeping it out of git is still the right call. RLS policies
// are what actually protect your data.

export async function handler() {
    const url     = process.env.SUPABASE_URL     || "";
    const anonKey = process.env.SUPABASE_ANON_KEY || "";

    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
            // Cache for 5 min — config rarely changes, avoids a fetch on every
            // page load while still picking up changes after a redeploy.
            "Cache-Control": "public, max-age=300"
        },
        body: JSON.stringify({
            supabase: { url, anonKey },
            scoringUrl: "/.netlify/functions/score-fit"
        })
    };
}