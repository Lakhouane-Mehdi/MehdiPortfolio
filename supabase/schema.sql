-- Portfolio database schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run)

-- ============================================================
-- 1. PAGEVIEWS (self-hosted analytics, cookieless)
-- ============================================================
create table if not exists public.pageviews (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  path        text        not null,
  referrer    text,
  country     text,
  user_agent_family text,
  session_hash text not null
);

create index if not exists pageviews_created_at_idx on public.pageviews (created_at desc);
create index if not exists pageviews_path_idx       on public.pageviews (path);

-- RLS: nobody can read raw rows from the client. Only admin (via service_role) + aggregate views.
alter table public.pageviews enable row level security;

-- No public select. No public insert (inserts happen via serverless function using service_role).
-- (Empty policy set = denied by default under RLS.)

-- ============================================================
-- 2. AGGREGATE VIEW for admin dashboard (served via service_role)
-- ============================================================
create or replace view public.pageviews_daily as
select
  date_trunc('day', created_at) as day,
  path,
  count(*)                       as views,
  count(distinct session_hash)   as unique_visitors
from public.pageviews
group by 1, 2
order by 1 desc;

-- ============================================================
-- 3. ADMIN ALLOWLIST (only this email can sign in to admin panel)
-- ============================================================
create table if not exists public.admins (
  email text primary key
);

insert into public.admins (email) values ('leoamazigh@gmail.com')
on conflict do nothing;

alter table public.admins enable row level security;
create policy "admins can read own row"
  on public.admins for select
  using (auth.jwt() ->> 'email' = email);

-- ============================================================
-- 4. CONSENT LOG (DSGVO Art. 7(1) — proof of consent)
-- ============================================================
create table if not exists public.consent_log (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),
  session_hash  text        not null,
  analytics     boolean     not null,
  version       text        not null,
  user_agent_family text
);

alter table public.consent_log enable row level security;
-- Inserts via serverless function only. No public read.
