-- Contact form messages
-- Run in Supabase SQL Editor after schema.sql

create table if not exists public.messages (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),
  name         text        not null,
  email        text        not null,
  message      text        not null,
  country      text,
  user_agent_family text,
  ip_hash      text,
  read_at      timestamptz
);

create index if not exists messages_created_at_idx on public.messages (created_at desc);
create index if not exists messages_unread_idx     on public.messages (read_at) where read_at is null;

alter table public.messages enable row level security;
-- No public policies — inserts and reads via serverless function (service_role) only.
