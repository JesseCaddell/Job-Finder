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

## Lock down AI endpoints + sign-ups (sharing with other devs)

`score-fit` and `improve-resume` now require a Supabase session token in
shared mode. No new env vars — just redeploy so Netlify bundles
`netlify/lib/verify-user.js` with the functions. After the deploy, sign out
and back in once if scoring returns 401.

1. **Disable public sign-ups.** Supabase dashboard → Authentication →
   Sign In / Providers → turn off "Allow new users to sign up". Add users
   manually from Authentication → Users instead.

2. **Set an Anthropic spend limit.** console.anthropic.com → Settings →
   Limits → set a monthly cap.

## PM/Dev resume tracks: `track` column (fixes "Could not find the 'track' column" upsert errors)

The deployed app writes a `track` value (`pm` | `dev` | `unsure`) on every job. The
live `jobs` table doesn't have that column yet, so every upsert fails with
`PGRST204`. SQL editor → run:

```sql
alter table jobs add column if not exists track text;
notify pgrst, 'reload schema';
```

Then hard-refresh the site and pull the feed again. (The `notify` line forces
PostgREST to refresh its schema cache so the new column is accepted immediately.)

## Pick up the new default title keywords (associate / junior / role-specific intern)

Only needed after the updated defaults are deployed, and only if the site still
shows the old keyword list. A saved list in Settings overrides the code defaults;
an empty one falls back to them. SQL editor → run:

```sql
update settings set title_keywords = '[]' where id = 1;
```

Then hard-refresh and open Settings → Feed options. The new chips should appear.
This discards any hand-edited title keywords, so re-add custom ones afterward.
