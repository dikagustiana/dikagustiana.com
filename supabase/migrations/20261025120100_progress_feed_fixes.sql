-- Follow-up to 20261025120000_progress_feed.sql, found by the phase 18 curl test:
-- 1. agent_run_report: a partial update ({id, status, tokens}) failed with 23502, because NOT NULL
--    is checked on the proposed row before ON CONFLICT resolves. The VALUES now carry '' for a
--    missing agent/task; a new run still needs both (checked above the insert), and the update
--    branch keeps the stored values.
-- 2. progress_feed: sends Cache-Control: no-store (PRD §2.3).

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
        from (select a.started_at, jsonb_build_object(
                'id', a.id, 'agent', a.agent, 'task', a.task, 'status', a.status,
                'started_at', to_char(a.started_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                'ended_at', to_char(a.ended_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                'tokens_in', a.tokens_in, 'tokens_out', a.tokens_out,
                'cost_usd', a.cost_usd, 'error', a.error) as j
              from progress.agent_runs a
              where a.started_at >= now() - interval '7 days'
              order by a.started_at desc
              limit 200) r), '[]'::jsonb),
      'days', (
        select jsonb_agg(jsonb_build_object('day', to_char(d.day, 'YYYY-MM-DD'), 'tokens', d.tokens)
                         order by d.day)
        from (select g.day::date as day,
                     coalesce((select sum(a.tokens_in + a.tokens_out) from progress.agent_runs a
                               where (a.started_at at time zone 'Asia/Jakarta')::date = g.day::date), 0)::bigint
                       as tokens
              from generate_series((now() at time zone 'Asia/Jakarta')::date - 6,
                                   (now() at time zone 'Asia/Jakarta')::date, interval '1 day') g(day)) d)));
end;
$$;

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
begin
  perform progress.require_token('report');

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
    (id, agent, task, status, started_at, ended_at, tokens_in, tokens_out, cost_usd, error, meta, updated_at)
  values (
    v_id, coalesce(run ->> 'agent', ''), coalesce(run ->> 'task', ''), v_status,
    coalesce((run ->> 'started_at')::timestamptz, (run ->> 'ended_at')::timestamptz, now()),
    case when v_status = 'running' then null
         else coalesce((run ->> 'ended_at')::timestamptz, now()) end,
    coalesce((run ->> 'tokens_in')::bigint, 0), coalesce((run ->> 'tokens_out')::bigint, 0),
    (run ->> 'cost_usd')::numeric, left(run ->> 'error', 2000), coalesce(run -> 'meta', '{}'::jsonb), now())
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
    updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

