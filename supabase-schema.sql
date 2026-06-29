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
    added_by    text,
    history     jsonb default '[]',
    created_at  timestamptz default now()
    );

-- Shared settings (one row)
create table if not exists settings (
                                        id        int primary key default 1,
                                        profile   text,
                                        resume    text,
                                        feed_url  text
);
insert into settings (id) values (1) on conflict do nothing;

-- Resume file storage: in the Supabase dashboard, Storage → create a
-- bucket named "resumes" (private). Upload files there; reference the path
-- from the jobs/settings tables as needed.

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