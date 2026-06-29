// netlify/functions/score-fit.js
//
// AI fit scoring proxy. Keeps ANTHROPIC_API_KEY server-side.
// Called manually when the user clicks "Score fit" on a job card.
// Never runs automatically — zero passive token spend.
//
// Model: claude-haiku-4-5 (fastest, cheapest — plenty for structured scoring)
// Max tokens: 400 (a full JSON feedback object needs ~200; 400 is a safe ceiling)
//
// Netlify env var required:
//   ANTHROPIC_API_KEY  — from console.anthropic.com

export async function handler(event) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
        return { statusCode: 500, body: JSON.stringify({ error: "ANTHROPIC_API_KEY not set in Netlify env vars" }) };
    }

    let body;
    try {
        body = JSON.parse(event.body || "{}");
    } catch {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
    }

    const { profile = "", resume = "", title = "", company = "", loc = "", notes = "" } = body;

    const prompt = `You are helping a job seeker quickly triage job postings.

THEIR SEARCH PROFILE:
${profile}

THEIR RESUME:
${resume ? `"""
${resume}
"""` : "(not provided — score based on profile only)"}

JOB POSTING:
Title: ${title}
Company: ${company}
Location: ${loc}
Description:
${notes || "(no description provided)"}

Score this role's fit and return ONLY a minified JSON object with NO markdown, NO explanation outside the JSON:
{
  "fit": <integer 0-100>,
  "summary": "<one punchy sentence, max 15 words, plain language>",
  "feedback": {
    "verdict": "<Strong match | Good fit | Reach | Weak match>",
    "strengths": "<2-3 sentences: what from their background maps well to this role>",
    "gaps": "<2-3 sentences: what's missing or a stretch, or 'None identified' if strong>",
    "recommendation": "<1-2 sentences: concrete action — apply now, tailor your resume to X, skip it because Y>"
  },
  "tags": ["<up to 3 short lowercase tags e.g. remote, senior, healthcare>"]
}`;

    try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": key,
                "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify({
                model:      "claude-haiku-4-5",
                max_tokens: 400,
                messages:   [{ role: "user", content: prompt }]
            })
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("Anthropic API error:", res.status, err);
            return { statusCode: 502, body: JSON.stringify({ error: "AI service error", detail: res.status }) };
        }

        const data = await res.json();
        const text = (data.content || [])
            .filter(b => b.type === "text")
            .map(b => b.text)
            .join("")
            .replace(/```json|```/g, "")
            .trim();

        // Validate it's parseable before returning
        const parsed = JSON.parse(text);

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parsed)
        };

    } catch (e) {
        console.error("score-fit error:", e);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Scoring failed", detail: e.message })
        };
    }
}