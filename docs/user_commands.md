# User commands

Manual steps to run outside the CLI — mostly Supabase SQL editor and dashboard
actions needed to keep your live database in sync with the app. Run these
against your existing project (don't re-run `supabase-schema.sql`, which is
only the fresh-install reference).

## Resume upload + viewer (fix_list: Resume upload)

1. **Create the storage bucket.** Supabase dashboard → Storage → New bucket →
   name it `resumes`, leave it **private** (not public).

2. **Add bucket policies.** SQL editor → run:

```sql
create policy "authed read own resumes" on storage.objects for select to authenticated
    using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "authed write own resumes" on storage.objects for insert to authenticated
    with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "authed update own resumes" on storage.objects for update to authenticated
    using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
```

3. **Add the resume_versions column to settings.** SQL editor → run:

```sql
alter table settings add column if not exists resume_text text;
alter table settings add column if not exists resume_versions jsonb default '[]';
```

## Pre-existing gap found while working on this: feedback/scored_at columns

The app has been writing `feedback` and `scored_at` on every job score since
the "AI functions to score resume and job" commit, but `supabase-schema.sql`
never defined those columns. If you're in shared/Supabase mode, scoring has
likely been silently failing to save feedback (or erroring on upsert). Run:

```sql
alter table jobs add column if not exists feedback jsonb;
alter table jobs add column if not exists scored_at timestamptz;
```

## Ratings follow-up: draft improvements + score-per-resume history (fix_list: Ratings follow up)

Adds a "Draft improvements" button (jobs scoring 60%+) and a "Score additional
resume" flow that re-scores a job against a newly uploaded resume version,
keeping the prior score attached to the resume that produced it. Run:

```sql
alter table jobs add column if not exists resume_id text;
alter table jobs add column if not exists resume_filename text;
alter table jobs add column if not exists improvements jsonb;
```

Also deploy the new `netlify/functions/improve-resume.js` function (same
`ANTHROPIC_API_KEY` env var as `score-fit.js` — no new secret needed) and
redeploy so `get-config.js` starts serving `improveUrl`.

## Low scoring jobs: archive + configurable threshold + repost detection (fix_list: Low scoring jobs)

Adds a per-job "Remove" action (archives instead of deletes, so the pull-feed
dedupe still sees it), an "Archived" view, a configurable low-score threshold
in Settings, and repost detection so a job that reappears with a newer
posted date gets revived instead of silently skipped. Run:

```sql
alter table jobs add column if not exists archived boolean default false;
alter table jobs add column if not exists posted_at timestamptz;
alter table settings add column if not exists low_score_threshold int default 50;
```

## Enable USAJOBS in the auto-feed

`fetch-jobs.js` already supports USAJOBS — it just needs credentials. Netlify
dashboard → your site → Site settings → Environment variables → Add a
variable, twice:

```
USAJOBS_KEY   = <the key from developer.usajobs.gov>
USAJOBS_EMAIL = <the email you registered with USAJOBS>
```

Redeploy (or trigger a redeploy from the same screen) so the function picks
them up. USAJOBS results will appear on the next "Pull feed now" click.
