-- Local stand-ins for what Supabase provides, so the G2 migration can be run
-- and exercised on a throwaway local Postgres 16 before it goes near the live
-- project. Signatures follow Supabase's docs (pg_net 0.20, pg_cron 1.6, vault).
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;

create schema vault;
create table vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, secret text);
create view vault.decrypted_secrets as select id, name, secret as decrypted_secret from vault.secrets;

create schema net;
create table net.http_request_queue (
  id bigserial primary key, method text not null, url text not null, headers jsonb not null,
  body bytea, timeout_milliseconds integer not null
);
create table net._http_response (
  id bigint, status_code integer, content_type text, headers jsonb, content text,
  timed_out boolean, error_msg text, created timestamptz not null default now()
);
create function net.http_post(
  url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb,
  headers jsonb default '{"Content-Type": "application/json"}'::jsonb, timeout_milliseconds int default 2000
) returns bigint language sql as $$
  insert into net.http_request_queue (method, url, headers, body, timeout_milliseconds)
  values ('POST', url, headers, convert_to(body::text, 'UTF8'), timeout_milliseconds) returning id;
$$;

create schema cron;
create table cron.job (jobid bigserial primary key, jobname text unique, schedule text, command text, username text default current_user, active boolean default true);
create function cron.schedule(job_name text, schedule text, command text) returns bigint language sql as $$
  insert into cron.job (jobname, schedule, command) values (job_name, schedule, command)
  on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command
  returning jobid;
$$;

-- A cut-down public.essays, RLS on, plus the updated_at BEFORE trigger. The
-- live policies let only the admin write, and the admin writes as
-- authenticated; this stand-in lets any authenticated caller write, which is
-- all test 3 needs: a save made as authenticated, not as postgres.
create table public.essays (
  id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null,
  published boolean default false, updated_at timestamptz default now()
);
create function public.update_updated_at_column() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;
create trigger update_essays_updated_at before update on public.essays for each row execute function public.update_updated_at_column();
alter table public.essays enable row level security;
create policy essays_admin_all on public.essays for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.essays to authenticated;
insert into public.essays (slug, title, published) values
  ('a-published-essay', 'A Published Essay', true),
  ('an-unpublished-draft', 'An Unpublished Draft', false);
