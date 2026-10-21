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

## PM vs Dev resumes

Upload one resume per track in Settings → Search profile & resumes ("Classify as" PM or Dev). Every job gets a track when it
enters the board: the feed tags it from the title (`classifyTrack` in `fetch-jobs.js`, mirrored in
`src/lib/tracks.js`), manual adds are tagged on save, and existing jobs are tagged once on first load.
Scoring uses the active (newest) resume for the job's track. Titles that look like both (e.g.
"Software Engineering Manager") are scored with whichever resume shares more keywords with the
posting. Wrong guess? Click the PM/Dev badge on the card to switch it. Titles matching neither list
default to PM.

**Upgrading an existing database:** run `alter table jobs add column if not exists track text;`
in the Supabase SQL editor *before* deploying, or job saves will fail.

---

## Where your data lives

| What | Where |
|---|---|
| Jobs, notes, scores | Supabase `jobs` table (local mode: browser localStorage) |
| Profile, resume text, score threshold, **feed title/location keywords** | Supabase `settings` table, single row `id=1` |
| Resume files | Supabase Storage, private `resumes` bucket |
| Secrets and source config: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `SUPABASE_*`, `GREENHOUSE_BOARDS`, `LEVER_COMPANIES`, `ASHBY_COMPANIES`, `USAJOBS_*`, `ADZUNA_*`, `HN_FEEDS` | Netlify environment variables (never in the DB) |
| Default keywords, search terms, experience cap | In code: `netlify/functions/fetch-jobs.js` |

---

## Setting up your own copy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/jesseCaddell/Job-Finder)

The button copies this repo to your GitHub, creates a Netlify site, and asks for
your Supabase and Anthropic keys. You still need to create the Supabase project
and run the SQL (section 2) — do that first so you have the keys to paste in.
Or do it by hand:

Everything account-specific lives in environment variables — nothing to edit
in the source. To run your own instance:

1. Fork this repo on GitHub
2. Create your own Supabase project (section 2) — optional, skip for local mode
3. Create your own Anthropic API key (section 4) — optional, skip if you don't want AI scoring
4. Deploy your fork to Netlify from Git and set the environment variables (section 1)

`.env.example` lists every variable the app reads. Optional: set
`ANTHROPIC_MODEL` to use a model other than `claude-haiku-4-5`.

If a feature isn't configured, its button shows a "not configured" message
instead of failing.

---

## Running it locally

The app is a Vite + React build, so it can't be opened as a plain file.
`npm run dev` runs Vite behind Netlify's dev server, which also serves
`/.netlify/functions/*` (`Pull feed now`, `Score fit`, the Supabase config):

```
cp .env.example .env    # then fill in the values you have
npm install
npm run dev
```

This starts a local server (prints the URL, e.g. `http://localhost:8888`)
serving the app and all four functions together, matching what Netlify
runs in production — no site linking required for local testing.

`npm run dev:vite` runs Vite alone: the app loads, but without the
functions it falls back to local mode and Pull feed / AI scoring won't work.
`npm run build` writes the production build to `dist/`.

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

`get-config.js` serves them to the browser at boot — no keys in the front-end source.

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
HN_FEEDS          = true   # optional: Hacker News sources, no key needed
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

Tune what comes in under **Settings → Feed preferences** (title keywords, allowed locations). Your title/location keyword lists are saved to the database and **override** the
defaults in `fetch-jobs.js` (`DEFAULT_TITLE_KEYWORDS`, `DEFAULT_LOCATION_KEYWORDS`). If you change
the defaults in code and nothing changes in your feed, your saved list is still the old one:
edit it in Feed preferences, or reset it with `update settings set title_keywords = '[]';`.

`HN_FEEDS=true` adds two Hacker News sources, both using only HN/Algolia APIs (YC's Terms of Use prohibit
scraping ycombinator.com, so its pages are never fetched): YC company job ads (the `jobstories` feed) and the
monthly "Ask HN: Who is hiring?" thread. Both are tagged `required reading` — YC ads carry only a title/link
(role taken from the HN title or URL), and Who-is-hiring posts are free text screened on their first line only
(full post kept in the job notes). Click the `required reading` tag to see just these and read them in one sitting.

USAJOBS and Adzuna run one search per term in `SEARCH_QUERIES` (top of the sources section in
`fetch-jobs.js`); results are then filtered by your title keywords.

**Why LinkedIn/WTTJ/Handshake/Indeed aren't in the auto-feed:** None offer a public API
you can legally pull. Use "Add a job" to paste links from those manually — that button
exists exactly for this.

---

## 4. Add AI fit scoring

### 4a. Get an Anthropic API key

[console.anthropic.com](https://console.anthropic.com) → API Keys → Create key.
This is billed separately from your Claude.ai subscription.
Both AI functions use `claude-haiku-4-5` (cheapest model; override with `ANTHROPIC_MODEL`) with a 400–500 token cap.
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
├── index.html                      ← Vite entry point
├── vite.config.mjs
├── netlify.toml                    ← build (npm run build → dist/), functions dir, SPA redirect
├── .env.example                    ← every env var the app reads
├── supabase-schema.sql             ← run once in Supabase SQL editor
├── README.md                       ← this file
├── docs/
│   └── user_commands.md            ← migrations + dashboard steps for existing setups
├── src/
│   ├── main.jsx, App.jsx           ← router: /login, /board, /archive, /settings/…
│   ├── context/                    ← AppContext (config + session), JobsContext (board data)
│   ├── components/                 ← app shell/nav, modal, toast, shared UI
│   ├── pages/                      ← Login, LocalLogin, board/, archive/, settings/
│   ├── lib/                        ← data layer, scoring, feed pull, resumes, tracks, keywords
│   └── styles/                     ← design tokens + shared styles (from the Figma file)
└── netlify/
    ├── functions/
    │   ├── get-config.js           ← serves Supabase URL + anon key to the browser
    │   ├── fetch-jobs.js           ← auto-feed puller
    │   ├── score-fit.js            ← AI fit scoring
    │   └── improve-resume.js       ← AI resume improvements
    └── lib/
        └── verify-user.js          ← Supabase session check for the AI functions
```