-- Data retention — keeps the promises made in the privacy policy (sections 6 and 8).
-- Run in Supabase SQL Editor after schema.sql and messages.sql.
-- Safe to run more than once.
--
--   pageviews (raw rows)   kept 90 days, then reduced to daily totals
--   daily totals           kept 24 months
--   messages               kept 12 months
--   consent_log            kept 3 years

-- ============================================================
-- 1. DAILY TOTALS that outlive the raw pageview rows
-- ============================================================
create table if not exists public.pageviews_archive (
  day             date   not null,
  path            text   not null,
  views           bigint not null,
  unique_visitors bigint not null,
  primary key (day, path)
);

alter table public.pageviews_archive enable row level security;
revoke all on public.pageviews_archive from anon, authenticated;
-- No public policies: only the server (service_role) reads or writes.

-- ============================================================
-- 2. THE CLEANUP — called once a day by /api/keepalive
-- ============================================================
-- Everything runs in one transaction: a raw row is only deleted together
-- with the write of its daily total, so no pageview is ever lost or counted twice.
create or replace function public.run_retention()
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  -- Midnight (UTC) 90 days ago, so only complete days are archived.
  raw_cutoff timestamptz := (date_trunc('day', now() at time zone 'utc') - interval '90 days') at time zone 'utc';
  today_utc  date        := (now() at time zone 'utc')::date;
  n_archived bigint;
  n_totals   bigint;
  n_messages bigint;
  n_consent  bigint;
begin
  with moved as (
    delete from pageviews
    where created_at < raw_cutoff
    returning (created_at at time zone 'utc')::date as day, path, session_hash
  ),
  totals as (
    select day, path, count(*) as views, count(distinct session_hash) as unique_visitors
    from moved
    group by day, path
  ),
  saved as (
    insert into pageviews_archive as a (day, path, views, unique_visitors)
    select day, path, views, unique_visitors from totals
    on conflict (day, path) do update
      set views           = a.views + excluded.views,
          unique_visitors = a.unique_visitors + excluded.unique_visitors
    returning 1
  )
  select count(*) into n_archived from moved;

  delete from pageviews_archive where day < (today_utc - interval '24 months');
  get diagnostics n_totals = row_count;

  delete from messages where created_at < now() - interval '12 months';
  get diagnostics n_messages = row_count;

  delete from consent_log where created_at < now() - interval '3 years';
  get diagnostics n_consent = row_count;

  return jsonb_build_object(
    'pageviews_archived',    n_archived,
    'daily_totals_deleted',  n_totals,
    'messages_deleted',      n_messages,
    'consent_rows_deleted',  n_consent
  );
end;
$$;

-- ============================================================
-- 3. ALL-TIME PAGEVIEW TOTAL for the admin dashboard
-- ============================================================
-- Raw rows still in the table + the archived daily totals.
create or replace function public.pageviews_total()
returns bigint
language sql
stable
set search_path = public
as $$
  select (
    (select count(*) from pageviews)
    + coalesce((select sum(views) from pageviews_archive), 0)
  )::bigint
$$;

-- Only the server may call these (functions are callable by everyone by default).
revoke all on function public.run_retention()   from public, anon, authenticated;
revoke all on function public.pageviews_total() from public, anon, authenticated;
grant execute on function public.run_retention()   to service_role;
grant execute on function public.pageviews_total() to service_role;
