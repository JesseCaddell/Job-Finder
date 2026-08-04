-- ============================================================
--  THE PIPELINE — optional Supabase schema
--  Only needed if you want you + your partner to share ONE board
--  across different devices (local mode is per-device).
--
--  How: create a free project at supabase.com, open the SQL editor,
--  paste this, run it. Then put your project URL + anon key into
--  CONFIG.supabase at the top of index.html.
-- ============================================================

-- Jobs table shared by the whole team
create table if not exists jobs (
                                    id          uuid primary key default gen_random_uuid(),
    title       text,
    company     text,
    loc         text,
    src         text,
    url         text,
    tags        text[] default '{}',
    notes       text,
    status      text default 'new',     -- new | applied | interview | offer | denied
    fit         int,
    why         text,
    feedback    jsonb,
    scored_at   timestamptz,
    resume_id       text,      -- id of the settings.resume_versions entry this score used
    resume_filename text,
    improvements    jsonb,     -- {text, generatedAt}
    archived    boolean default false,
    posted_at   timestamptz,   -- source-reported posting date, used to detect reposts
    added_by    text,
    history     jsonb default '[]',
    created_at  timestamptz default now()
    );

-- Shared settings (one row)
create table if not exists settings (
                                        id        int primary key default 1,
                                        profile   text,
                                        resume    text,
                                        resume_text      text,
                                        resume_versions   jsonb default '[]',   -- [{id, filename, path, text, uploadedAt}]
                                        low_score_threshold int default 50,
                                        feed_url  text,
    title_keywords    jsonb default '[]',   -- fetch-jobs.js title match list, editable in Settings
    location_keywords jsonb default '[]'    -- fetch-jobs.js location match list, editable in Settings
);
insert into settings (id) values (1) on conflict do nothing;

-- Resume file storage: in the Supabase dashboard, Storage → create a
-- private bucket named "resumes". Files are uploaded to
-- {user_id}/{timestamp}-{filename} and referenced by path from
-- settings.resume_versions.
insert into storage.buckets (id, name, public) values ('resumes', 'resumes', false) on conflict do nothing;

create policy "authed read own resumes" on storage.objects for select to authenticated
    using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "authed write own resumes" on storage.objects for insert to authenticated
    with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "authed update own resumes" on storage.objects for update to authenticated
    using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

-- Row Level Security: simplest setup is to require an authenticated user.
alter table jobs enable row level security;
alter table settings enable row level security;

create policy "authed read jobs"   on jobs   for select to authenticated using (true);
create policy "authed write jobs"  on jobs   for all    to authenticated using (true) with check (true);
create policy "authed read set"     on settings for select to authenticated using (true);
create policy "authed write set"    on settings for all    to authenticated using (true) with check (true);

-- Then in Supabase Auth, add two users (you + your partner) by email.
-- Supabase sessions auto-refresh, so "stay signed in for a week" comes
-- for free once you swap the local gate for supabase.auth.signInWithPassword().