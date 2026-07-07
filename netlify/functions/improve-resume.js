// netlify/functions/improve-resume.js
//
// AI resume-improvement proxy. Keeps ANTHROPIC_API_KEY server-side.
// Called manually when the user clicks "Draft improvements" on a job
// scoring 60%+. Never runs automatically.
//
// Model: claude-haiku-4-5 (fastest, cheapest — plenty for structured feedback)
// Max tokens: 500 (a few paste-ready resume edits need ~250; 500 is a safe ceiling)
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

    const { profile = "", resume = "", title = "", company = "", loc = "", notes = "", gaps = "" } = body;

    const prompt = `You are helping a job seeker tailor their resume for a specific role.

THEIR SEARCH PROFILE:
${profile}

THEIR CURRENT RESUME:
${resume ? `"""
${resume}
"""` : "(not provided)"}

JOB POSTING:
Title: ${title}
Company: ${company}
Location: ${loc}
Description:
${notes || "(no description provided)"}

${gaps ? `Previously identified gaps for this role: ${gaps}\n` : ""}
Draft concrete, paste-ready improvements to the resume that would make it a
stronger match for THIS role. Return ONLY a minified JSON object with NO
markdown, NO explanation outside the JSON:
{
  "improvements": "<paste-ready suggested edits/additions, plain text with line breaks, max 200 words>"
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
                max_tokens: 500,
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

        const parsed = JSON.parse(text);

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parsed)
        };

    } catch (e) {
        console.error("improve-resume error:", e);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Improvement drafting failed", detail: e.message })
        };
    }
}
