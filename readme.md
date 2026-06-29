# The Pipeline — job search command center

Two modes, zero build step, one HTML file.

---

## Modes

| | Local | Shared (Supabase) |
|---|---|---|
| Setup | None — open and go | 10 min (see below) |
| Auth | Shared passcode | Real email + password |
| Data | This browser's localStorage | Supabase cloud DB |
| Real-time sync | No — per device | Yes — both devices update live |
| Best for | Solo or one shared device | You + partner on different laptops |

---

## 1. Deploy to Netlify (2 min)

**Drag and drop:** Netlify → "Add new site" → "Deploy manually" → drag the project folder.

**Or Git (needed for the auto-feed function + daily schedule):**
Push this folder to GitHub → Netlify → "Import from Git" → deploy.
`netlify.toml` is already configured.

---

## 2. Enable shared mode (Supabase)

### 2a. Create the database

1. Go to [supabase.com](https://supabase.com) → New project (free tier is fine)
2. SQL Editor → paste `supabase-schema.sql` → Run
3. That creates the `jobs` and `settings` tables with RLS and a real-time trigger

### 2b. Add users

Authentication → Users → Add user → create one account for you, one for your partner.

To set a display name (shown when attributing job submissions):
Authentication → Users → click a user → User metadata → add `{ "name": "Midgar" }`

### 2c. Enable real-time

Database → Replication → find the `jobs` table → toggle it on.
This is what makes both your boards update live when the other person adds a job.

### 2d. Wire up the app

In `index.html`, find the `CONFIG` block near the top of the `<script>` and fill in:

```js
const CONFIG = {
  supabase: {
    url:     "https://YOUR-PROJECT.supabase.co",   // Settings → API → Project URL
    anonKey: "eyJ..."                               // Settings → API → anon public key
  },
  scoringUrl: "/.netlify/functions/score-fit"
};
```

Redeploy. The login screen will switch to email + password automatically.

---

## 3. Set up the auto-feed (Greenhouse, Lever, USAJOBS, Adzuna)

In Netlify → Site settings → Environment variables, add whichever you have:

```
GREENHOUSE_BOARDS = stripe,figma,databricks
LEVER_COMPANIES   = netflix,brex,linear
USAJOBS_KEY       = <key from developer.usajobs.gov>
USAJOBS_EMAIL     = <email you registered with USAJOBS>
ADZUNA_APP_ID     = <from developer.adzuna.com>
ADZUNA_APP_KEY    = <from developer.adzuna.com>
```

**Finding board tokens:** If a company uses Greenhouse, their careers page URL will contain
`boards.greenhouse.io/COMPANY` — that last segment is the token. Same for Lever:
`jobs.lever.co/COMPANY`. Build a list of ~15–20 target employers; quality beats volume.

Then in the app: Settings → paste your feed URL:
`https://YOUR-SITE.netlify.app/.netlify/functions/fetch-jobs` → Pull feed now.

`netlify.toml` also schedules this automatically once a day.

Edit `TITLE_KEYWORDS` and `LOCATION_KEYWORDS` in `fetch-jobs.js` to tune what comes in.

**Why LinkedIn/WTTJ/Handshake/Indeed aren't in the auto-feed:** None offer a public API
you can legally pull. Use "Add a job" to paste links from those manually — that button
exists exactly for this.

---

## 4. Add AI fit scoring

### 4a. Get an Anthropic API key

[console.anthropic.com](https://console.anthropic.com) → API Keys → Create key.
This is billed separately from your Claude.ai subscription.
The scoring uses `claude-haiku-4-5` (cheapest model) with a 150-token cap.
Each score call costs a fraction of a cent. It only runs when you click the button — never automatically.

### 4b. Add the Netlify function

Create `netlify/functions/score-fit.js`:

```js
export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { profile, resume, title, company, loc, notes } = JSON.parse(event.body || "{}");

  const prompt =
    `You are helping a job seeker triage roles.\n` +
    `Their profile: "${profile}"\n` +
    (resume ? `Their resume:\n"""${resume}"""\n` : "") +
    `\nThe role:\nTitle: ${title}\nCompany: ${company}\nLocation: ${loc}\nDetails: ${notes || "(none)"}\n\n` +
    `Return ONLY minified JSON, no markdown:\n` +
    `{"fit":<0-100>,"why":"<one sentence, max 20 words>","tags":["<up to 3 lowercase tags>"]}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",   // cheapest model — more than enough for scoring
      max_tokens: 150,              // a JSON blob needs ~60 tokens; 150 is a safe ceiling
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!res.ok) return { statusCode: 502, body: "AI service error" };
  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();

  try {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: text  // already JSON from the model
    };
  } catch {
    return { statusCode: 502, body: "Unexpected AI response" };
  }
}
```

### 4c. Add the env var in Netlify

Site settings → Environment variables → `ANTHROPIC_API_KEY` → your key.

Redeploy. The "Score fit" button on every card is now live.

---

## File map

```
the-pipeline/
├── index.html                      ← the entire app (no build step)
├── netlify.toml                    ← functions dir + daily schedule
├── supabase-schema.sql             ← run once in Supabase SQL editor
├── README.md                       ← this file
└── netlify/
    └── functions/
        ├── fetch-jobs.js           ← auto-feed puller
        └── score-fit.js            ← AI proxy (you create this in step 4)
```