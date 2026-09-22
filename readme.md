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

## Setting up your own copy

Everything account-specific lives in environment variables — nothing to edit
in the source. To run your own instance:

1. Fork this repo on GitHub
2. Create your own Supabase project (section 2) — optional, skip for local mode
3. Create your own Anthropic API key (section 4) — optional, skip if you don't want AI scoring
4. Deploy your fork to Netlify from Git and set the environment variables (section 1)

`.env.example` lists every variable the app reads.

---

## Running it locally

Opening `index.html` directly works for browsing the board, but the
Netlify functions (`Pull feed now`, `Score fit`, feed options) only exist
once something is serving `/.netlify/functions/*`. Use Netlify's own dev
server for that:

```
cp .env.example .env    # then fill in the values you have
npm install
npm run dev
```

This starts a local server (prints the URL, e.g. `http://localhost:8888`)
serving `index.html` and all four functions together, matching what
Netlify runs in production — no site linking required for local testing.

---

## 1. Deploy to Netlify (2 min)

Netlify → "Add new site" → "Import an existing project" → pick your fork → deploy.
`netlify.toml` is already configured.

Use Git, not drag-and-drop: manual deploys don't include the Netlify functions,
and the app needs them for config (shared mode), the auto-feed, and AI scoring.

Then Site configuration → Environment variables → add the values from
`.env.example` that you're using, and trigger a redeploy so the functions pick them up.

---

## 2. Enable shared mode (Supabase)

### 2a. Create the database

1. Go to [supabase.com](https://supabase.com) → New project (free tier is fine)
2. SQL Editor → paste `supabase-schema.sql` → Run
3. That creates the `jobs` and `settings` tables with RLS and a real-time trigger

### 2b. Add users

**First, turn off public sign-ups:** Authentication → Sign In / Providers →
disable "Allow new users to sign up". The anon key is sent to every browser, and
the RLS policies let any signed-in user read and write all jobs — so with sign-ups
on, anyone could create an account and see your data.

Authentication → Users → Add user → create one account for you, one for your partner.

To set a display name (shown when attributing job submissions):
Authentication → Users → click a user → User metadata → add `{ "name": "Midgar" }`

### 2c. Enable real-time

Database → Replication → find the `jobs` table → toggle it on.
This is what makes both your boards update live when the other person adds a job.

### 2d. Wire up the app

Supabase → Project Settings → API. Add these to Netlify's environment variables
(and to `.env` for local dev):

```
SUPABASE_URL      = https://YOUR-PROJECT.supabase.co   # Project URL
SUPABASE_ANON_KEY = eyJ...                              # anon public key
```

`get-config.js` serves them to the browser at boot — no keys in `index.html`.

Redeploy. The login screen will switch to email + password automatically.

---

## 3. Set up the auto-feed (Greenhouse, Lever, Ashby, USAJOBS, Adzuna)

In Netlify → Site settings → Environment variables, add whichever you have:

```
GREENHOUSE_BOARDS = stripe,figma,databricks
LEVER_COMPANIES   = palantir,aircall
ASHBY_COMPANIES   = linear,notable
USAJOBS_KEY       = <key from developer.usajobs.gov>
USAJOBS_EMAIL     = <email you registered with USAJOBS>
ADZUNA_APP_ID     = <from developer.adzuna.com>
ADZUNA_APP_KEY    = <from developer.adzuna.com>
```

**Finding board tokens:** If a company uses Greenhouse, their careers page URL will contain
`boards.greenhouse.io/COMPANY` (or `job-boards.greenhouse.io/COMPANY`) — that last segment
is the token. Same for Lever: `jobs.lever.co/COMPANY`. Same for Ashby: `jobs.ashbyhq.com/COMPANY`.
Companies migrate between ATS providers, so a token that worked once can 404 later — verify
with e.g. `curl -s https://boards-api.greenhouse.io/v1/boards/TOKEN/jobs -o /dev/null -w '%{http_code}'`
(swap in `https://api.lever.co/v0/postings/TOKEN?mode=json` or
`https://api.ashbyhq.com/posting-api/job-board/TOKEN` for the other two) before adding it —
a dead token just silently contributes zero postings, which looks like "nothing to add" rather
than an error. Build a list of ~15–20 target employers; quality beats volume.

Then in the app: Settings → paste your feed URL:
`https://YOUR-SITE.netlify.app/.netlify/functions/fetch-jobs` → Pull feed now.

Edit `TITLE_KEYWORDS` and `LOCATION_KEYWORDS` in `fetch-jobs.js` to tune what comes in.

**Why LinkedIn/WTTJ/Handshake/Indeed aren't in the auto-feed:** None offer a public API
you can legally pull. Use "Add a job" to paste links from those manually — that button
exists exactly for this.

---

## 4. Add AI fit scoring

### 4a. Get an Anthropic API key

[console.anthropic.com](https://console.anthropic.com) → API Keys → Create key.
This is billed separately from your Claude.ai subscription.
Both AI functions use `claude-haiku-4-5` (cheapest model) with a 400–500 token cap.
Each call costs a fraction of a cent. They only run when you click the button — never automatically.

**Set a monthly spend limit** in the Anthropic console (Settings → Limits) as a backstop.

### 4b. Add the env var

Netlify → Site configuration → Environment variables → `ANTHROPIC_API_KEY` → your key
(and in `.env` for local dev). Redeploy.

The functions already exist: `score-fit.js` ("Score fit") and `improve-resume.js`
("Draft improvements"). In shared mode they reject any request without a valid
Supabase session token (`netlify/lib/verify-user.js`), so only your signed-in users
can spend your key. In local mode there are no accounts to check, so the endpoints
are open to anyone who finds the URL — rely on the spend limit.

---

## File map

```
the-pipeline/
├── index.html                      ← the entire app (no build step)
├── netlify.toml                    ← functions dir
├── .env.example                    ← every env var the app reads
├── supabase-schema.sql             ← run once in Supabase SQL editor
├── README.md                       ← this file
├── docs/
│   └── user_commands.md            ← migrations for existing databases
└── netlify/
    ├── functions/
    │   ├── get-config.js           ← serves Supabase URL + anon key to the browser
    │   ├── fetch-jobs.js           ← auto-feed puller
    │   ├── score-fit.js            ← AI fit scoring
    │   └── improve-resume.js       ← AI resume improvements
    └── lib/
        └── verify-user.js          ← Supabase session check for the AI functions
```