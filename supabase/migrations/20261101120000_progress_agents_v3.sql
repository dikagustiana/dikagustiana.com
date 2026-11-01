-- Poni Agents v3 (local Claude runner): telemetry extension of 20261025120000_progress_feed.sql.
--
-- 1. A second report token, 'report_local', for the runner on the owner's PC. The VPS keeps its
--    'report' token; either one may call agent_run_report. Only the SHA-256 is stored, as before.
-- 2. progress.agent_runs gains the run tree: parent_run_id (null for a top-level run), agent_name
--    ('lead', 'fsre-extractor', 'guru' ...), profile, model, billing, tokens_estimated, run_dir.
--    Old callers (hermes-run) send none of them and keep working: defaults apply.
-- 3. progress_feed returns top-level runs only, each with `children` (its subagent rows, in start
--    order) and the new fields. Day totals count top-level rows only: a parent's tokens are the
--    whole run's (the runner adds its children and Guru into it), so children would count twice.
--
-- down:
--   create or replace both functions from 20261025120100_progress_feed_fixes.sql;
--   drop function progress.require_report_token();
--   delete from progress.tokens where name = 'report_local';
--   alter table progress.tokens drop constraint tokens_name_check,
--     add constraint tokens_name_check check (name in ('feed', 'report'));
--   drop index progress.agent_runs_parent_idx;
--   alter table progress.agent_runs drop column parent_run_id, drop column agent_name,
--     drop column profile, drop column model, drop column billing, drop column tokens_estimated,
--     drop column run_dir;

alter table progress.tokens drop constraint if exists tokens_name_check;
alter table progress.tokens add constraint tokens_name_check check (name in ('feed', 'report', 'report_local'));

alter table progress.agent_runs
  add column if not exists parent_run_id    text null,
  add column if not exists agent_name       text not null default 'lead',
  add column if not exists profile          text null,
  add column if not exists model            text null,
  add column if not exists billing          text null check (billing is null or billing in ('sub', 'api')),
  add column if not exists tokens_estimated boolean not null default false,
  add column if not exists run_dir          text null;
create index if not exists agent_runs_parent_idx on progress.agent_runs (parent_run_id);

-- Raises PT401 unless the request's x-progress-token matches the 'report' or 'report_local' token.
create or replace function progress.require_report_token()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  presented text := nullif(current_setting('request.headers', true), '')::json ->> 'x-progress-token';
begin
  if presented is null or not exists (
       select 1 from progress.tokens t
       where t.name in ('report', 'report_local')
         and t.sha256 = encode(extensions.digest(presented, 'sha256'), 'hex')) then
    raise sqlstate 'PT401' using message = 'unauthorized';
  end if;
end;
$$;
revoke all on function progress.require_report_token() from public, anon, authenticated;

create or replace function public.agent_run_report(run jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id     text := run ->> 'id';
  v_status text := run ->> 'status';
  v_exists boolean;
  k        text;
begin
  perform progress.require_report_token();

  if jsonb_typeof(run) is distinct from 'object' then
    raise sqlstate '22023' using message = 'body must be {"run": {...}}';
  end if;
  if v_id is null or btrim(v_id) = '' or length(v_id) > 200 then
    raise sqlstate '22023' using message = 'id is required (max 200 chars)';
  end if;
  if v_status is null or v_status not in ('running', 'done', 'failed') then
    raise sqlstate '22023' using message = 'status must be running, done or failed';
  end if;
  if run ? 'agent' and (jsonb_typeof(run -> 'agent') <> 'string' or length(run ->> 'agent') > 120) then
    raise sqlstate '22023' using message = 'agent must be a string (max 120 chars)';
  end if;
  if run ? 'task' and (jsonb_typeof(run -> 'task') <> 'string' or length(run ->> 'task') > 300) then
    raise sqlstate '22023' using message = 'task must be a string (max 300 chars)';
  end if;
  if (run ? 'tokens_in' and (jsonb_typeof(run -> 'tokens_in') <> 'number' or (run ->> 'tokens_in')::numeric < 0
                             or (run ->> 'tokens_in')::numeric <> trunc((run ->> 'tokens_in')::numeric)))
     or (run ? 'tokens_out' and (jsonb_typeof(run -> 'tokens_out') <> 'number' or (run ->> 'tokens_out')::numeric < 0
                             or (run ->> 'tokens_out')::numeric <> trunc((run ->> 'tokens_out')::numeric))) then
    raise sqlstate '22023' using message = 'tokens_in and tokens_out must be non-negative integers';
  end if;
  if run ? 'cost_usd' and jsonb_typeof(run -> 'cost_usd') not in ('number', 'null') then
    raise sqlstate '22023' using message = 'cost_usd must be a number';
  end if;
  if run ? 'meta' and jsonb_typeof(run -> 'meta') <> 'object' then
    raise sqlstate '22023' using message = 'meta must be an object';
  end if;
  foreach k in array array['parent_run_id', 'agent_name', 'profile', 'model', 'run_dir'] loop
    if run ? k and jsonb_typeof(run -> k) not in ('string', 'null') then
      raise sqlstate '22023' using message = k || ' must be a string';
    end if;
    if length(run ->> k) > 300 then
      raise sqlstate '22023' using message = k || ' is too long (max 300 chars)';
    end if;
  end loop;
  if run ? 'billing' and jsonb_typeof(run -> 'billing') <> 'null' and coalesce(run ->> 'billing', '') not in ('sub', 'api') then
    raise sqlstate '22023' using message = 'billing must be sub or api';
  end if;
  if run ? 'tokens_estimated' and jsonb_typeof(run -> 'tokens_estimated') <> 'boolean' then
    raise sqlstate '22023' using message = 'tokens_estimated must be a boolean';
  end if;
  if run ->> 'parent_run_id' = v_id then
    raise sqlstate '22023' using message = 'a run cannot be its own parent';
  end if;
  begin
    perform (run ->> 'started_at')::timestamptz, (run ->> 'ended_at')::timestamptz;
  exception when others then
    raise sqlstate '22023' using message = 'started_at and ended_at must be ISO timestamps';
  end;

  select true into v_exists from progress.agent_runs a where a.id = v_id;
  if v_exists is null and (coalesce(btrim(run ->> 'agent'), '') = '' or coalesce(btrim(run ->> 'task'), '') = '') then
    raise sqlstate '22023' using message = 'agent and task are required for a new run';
  end if;

  insert into progress.agent_runs as a
    (id, agent, task, status, started_at, ended_at, tokens_in, tokens_out, cost_usd, error, meta, updated_at,
     parent_run_id, agent_name, profile, model, billing, tokens_estimated, run_dir)
  values (
    v_id, coalesce(run ->> 'agent', ''), coalesce(run ->> 'task', ''), v_status,
    coalesce((run ->> 'started_at')::timestamptz, (run ->> 'ended_at')::timestamptz, now()),
    case when v_status = 'running' then null
         else coalesce((run ->> 'ended_at')::timestamptz, now()) end,
    coalesce((run ->> 'tokens_in')::bigint, 0), coalesce((run ->> 'tokens_out')::bigint, 0),
    (run ->> 'cost_usd')::numeric, left(run ->> 'error', 2000), coalesce(run -> 'meta', '{}'::jsonb), now(),
    nullif(run ->> 'parent_run_id', ''), coalesce(nullif(btrim(run ->> 'agent_name'), ''), 'lead'),
    run ->> 'profile', run ->> 'model', run ->> 'billing',
    coalesce((run ->> 'tokens_estimated')::boolean, false), run ->> 'run_dir')
  on conflict (id) do update set
    agent      = case when run ? 'agent' and btrim(run ->> 'agent') <> '' then run ->> 'agent' else a.agent end,
    task       = case when run ? 'task' and btrim(run ->> 'task') <> '' then run ->> 'task' else a.task end,
    status     = v_status,
    started_at = coalesce((run ->> 'started_at')::timestamptz, a.started_at),
    ended_at   = case when v_status = 'running' then null
                      else coalesce((run ->> 'ended_at')::timestamptz, a.ended_at, now()) end,
    tokens_in  = case when run ? 'tokens_in' then (run ->> 'tokens_in')::bigint else a.tokens_in end,
    tokens_out = case when run ? 'tokens_out' then (run ->> 'tokens_out')::bigint else a.tokens_out end,
    cost_usd   = case when run ? 'cost_usd' then (run ->> 'cost_usd')::numeric else a.cost_usd end,
    error      = case when run ? 'error' then left(run ->> 'error', 2000) else a.error end,
    meta       = case when run ? 'meta' then run -> 'meta' else a.meta end,
    parent_run_id = case when run ? 'parent_run_id' then nullif(run ->> 'parent_run_id', '') else a.parent_run_id end,
    agent_name = case when run ? 'agent_name' and btrim(run ->> 'agent_name') <> '' then run ->> 'agent_name' else a.agent_name end,
    profile    = case when run ? 'profile' then run ->> 'profile' else a.profile end,
    model      = case when run ? 'model' then run ->> 'model' else a.model end,
    billing    = case when run ? 'billing' then run ->> 'billing' else a.billing end,
    tokens_estimated = case when run ? 'tokens_estimated' then (run ->> 'tokens_estimated')::boolean else a.tokens_estimated end,
    run_dir    = case when run ? 'run_dir' then run ->> 'run_dir' else a.run_dir end,
    updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

-- One run as the feed sends it (children are built from the same function, without their own children).
create or replace function progress.run_json(a progress.agent_runs)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', a.id, 'agent', a.agent, 'task', a.task, 'status', a.status,
    'started_at', to_char(a.started_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'ended_at', to_char(a.ended_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'tokens_in', a.tokens_in, 'tokens_out', a.tokens_out,
    'cost_usd', a.cost_usd, 'error', a.error,
    'parent_run_id', a.parent_run_id, 'agent_name', a.agent_name, 'profile', a.profile,
    'model', a.model, 'billing', a.billing, 'tokens_estimated', a.tokens_estimated, 'run_dir', a.run_dir);
$$;
revoke all on function progress.run_json(progress.agent_runs) from public, anon, authenticated;

create or replace function public.progress_feed()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform progress.require_token('feed');
  perform set_config('response.headers', '[{"Cache-Control": "no-store"}]', true);
  return jsonb_build_object(
    'generated_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'writing', jsonb_build_object(
      'admin_url_pattern', 'https://dikagustiana.com/admin/content/{id}',
      'sections', coalesce((
        select jsonb_agg(jsonb_build_object('slug', s.slug, 'name', s.name, 'sort_order', s.sort_order)
                         order by s.sort_order)
        from public.sections s where s.is_active), '[]'::jsonb),
      'essays', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', e.id, 'title', e.title, 'section', e.section, 'status', e.status::text,
                 'words', coalesce(array_length(regexp_split_to_array(nullif(btrim(regexp_replace(
                            regexp_replace(coalesce(e.content, ''), '<[^>]*>', ' ', 'g'),
                            '\s+', ' ', 'g')), ''), ' '), 1), 0),
                 'updated_at', to_char(e.updated_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                 'sort_order', coalesce(e.sort_order, 0))
               order by e.updated_at desc)
        from public.essays e where e.status::text <> 'archived'), '[]'::jsonb)),
    'fsre', jsonb_build_object(
      'companies', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', c.id, 'short_name', c.short_name,
                 'sub_industry', to_jsonb(c) ->> 'sub_industry',
                 'periods_total', (select count(*) from public.fs_period p where p.company_id = c.id),
                 'periods_published', (select count(*) from public.fs_period p
                                       where p.company_id = c.id and p.status = 'published'))
               order by c.short_name)
        from public.fs_company c), '[]'::jsonb)),
    'agents', jsonb_build_object(
      'runs', coalesce((
        select jsonb_agg(r.j order by r.started_at desc)
        from (select a.started_at,
                     progress.run_json(a) || jsonb_build_object('children', coalesce((
                       select jsonb_agg(progress.run_json(c) order by c.started_at, c.id)
                       from progress.agent_runs c where c.parent_run_id = a.id), '[]'::jsonb)) as j
              from progress.agent_runs a
              where a.parent_run_id is null
                and a.started_at >= now() - interval '7 days'
              order by a.started_at desc
              limit 200) r), '[]'::jsonb),
      'days', (
        select jsonb_agg(jsonb_build_object('day', to_char(d.day, 'YYYY-MM-DD'), 'tokens', d.tokens)
                         order by d.day)
        from (select g.day::date as day,
                     coalesce((select sum(a.tokens_in + a.tokens_out) from progress.agent_runs a
                               where a.parent_run_id is null
                                 and (a.started_at at time zone 'Asia/Jakarta')::date = g.day::date), 0)::bigint
                       as tokens
              from generate_series((now() at time zone 'Asia/Jakarta')::date - 6,
                                   (now() at time zone 'Asia/Jakarta')::date, interval '1 day') g(day)) d)));
end;
$$;

revoke all on function public.progress_feed() from public, anon, authenticated;
revoke all on function public.agent_run_report(jsonb) from public, anon, authenticated;
grant execute on function public.progress_feed() to anon;
grant execute on function public.agent_run_report(jsonb) to anon;
