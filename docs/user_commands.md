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
