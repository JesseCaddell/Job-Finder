# Session State

Last updated: 2026-10-10. Latest commit on `master`: `e38ba03`.

## Done this session

### Feed now returns developer roles
- **Cause:** the saved `settings.title_keywords` (Supabase) overrides the defaults in `fetch-jobs.js`. The saved list was the old PM-only one, so the new developer titles never applied.
- **Fix:** the title list was updated in **Feed options** (the link next to "Pull feed now" on the main board, not in Settings). Confirmed working.
- USAJOBS and Adzuna previously searched only PM terms. They now run one search per term in `SEARCH_QUERIES` (top of the sources section in `fetch-jobs.js`).
- README now documents Feed options, the override behavior, and where each kind of data lives.

### PM vs Dev resume tracks
- Each job has a `track`: `pm`, `dev` or `unsure`. The feed tags it from the title (`classifyTrack` in `fetch-jobs.js`, mirrored in `index.html`). Manual adds are tagged on save. Titles matching neither keyword list default to PM.
- Scoring uses the newest resume uploaded for the job's track.
  - `unsure` titles use whichever resume shares more keywords with the posting (ties go to PM), and the job then records the winner.
  - A missing track falls back to the other resume, with a toast saying so.
- Settings → Resume has an "Upload as PM/Dev" dropdown and a list of uploads where each can be re-tagged.
- Cards show a PM/Dev badge; clicking it switches the track.
- "Draft improvements" works on the resume that scored the job.
- Untagged existing jobs are tagged once, automatically, on first load (`backfillTracks`).
- Works in local mode too (resume versions are stored without a file path).

## Still open / waiting

- **Needs more real data to judge.** The classifier and the `unsure` keyword-overlap pick haven't been tested on a real batch of postings. After more jobs come in, check:
  - titles tagged the wrong way (fix by adding words to `DEV_TITLE_RE` / `PM_TITLE_RE`, in both `fetch-jobs.js` and `index.html`);
  - how often `unsure` happens, and whether the resume it picks makes sense.
- **Database column.** `alter table jobs add column if not exists track text;` must be run in Supabase. It was flagged but not confirmed as run. Without it, saving jobs fails.
- **Earlier resume uploads are untagged.** Tag each one PM or Dev in Settings → Resume. Until then, scoring falls back to the most recently uploaded resume for every job.
- **Not run end to end.** The code was syntax-checked and the title classifier was tried on sample titles. The upload flow, scoring with each resume, the badge switch and the automatic tagging have not been exercised in the live app.

## Known limits and ideas

- Classification uses the title only. The description is not used to break ties, except in the `unsure` keyword-overlap pick.
- The experience filter (`MAX_YEARS_EXPERIENCE = 6` in `fetch-jobs.js`) drops postings asking for more than 6 years. This may remove many developer roles.
- Location keywords default to Washington, New York and California plus unrestricted remote. State-scoped remote postings like "Remote - Texas" are dropped.
- The feed only covers companies listed in the Netlify env vars `GREENHOUSE_BOARDS`, `LEVER_COMPANIES` and `ASHBY_COMPANIES`. Adding more engineering-heavy companies is the main way to get more developer postings.
- Possible later additions: a third track (for example data roles), and a way to preview the keyword-overlap pick.
