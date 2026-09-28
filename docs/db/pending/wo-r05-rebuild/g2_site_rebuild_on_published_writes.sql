-- =============================================================================
-- Every write that touches a published essay rebuilds the site.
--
-- The prerender (scripts/prerender.mjs) writes each published essay's page,
-- share card, sitemap entry and feed item at BUILD time, so a card is only as
-- fresh as the last deploy, and an unpublished essay's page (its title and
-- deck) kept being served until the next one. This asks Vercel for a new
-- production build whenever a write touches a published row.
--
-- The rule: AFTER INSERT OR UPDATE OR DELETE on public.essays, FOR EACH ROW,
-- acting when OLD.published or NEW.published is true. Deliberately NO column
-- list: the prerender reads about a dozen columns, updated_at among them, and a
-- hand-written list would drift. It is quiet anyway: autosave never writes a
-- published row (useEssayAutosave persists only while the essay is not
-- published, and guards its update with published = false). Publishing,
-- editing, unpublishing and deleting a published essay all qualify;
-- unpublishing and deleting most of all, since they take a page down.
--
-- Coalescing: the trigger only stamps ops.site_rebuild.requested_at. Nothing
-- network-bound runs inside the owner's save. pg_cron runs
-- ops.fire_site_rebuild() every 2 minutes; it fires once a request has been
-- quiet for 90 seconds, so a burst of saves is one build. The deploy hook's URL
-- is read from Vault by name at firing time and exists nowhere else.
--
-- Placement: a schema of its own, ops, which PostgREST does not expose
-- (exposed: public, graphql_public). Nothing is created in public, so
-- src/integrations/supabase/types.ts is unchanged.
-- =============================================================================

create schema if not exists ops;
revoke all on schema ops from public, anon, authenticated;

-- One row: the latest request for a rebuild, and what the last firing did.
create table ops.site_rebuild (
  id boolean primary key default true check (id),
  requested_at timestamptz,
  fired_at timestamptz,
  request_id bigint,
  last_status integer,
  last_outcome text,
  checked_at timestamptz
);
insert into ops.site_rebuild (id) values (true);
alter table ops.site_rebuild enable row level security;
revoke all on table ops.site_rebuild from public, anon, authenticated;

-- The trigger's function. It runs inside the owner's save transaction, so it
-- does no network work and it never raises: a failure is a warning in the
-- log, never a failed save.
create or replace function ops.request_site_rebuild()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  touched boolean := false;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    touched := old.published is true;
  end if;
  if not touched and tg_op in ('INSERT', 'UPDATE') then
    touched := new.published is true;
  end if;
  if touched then
    update ops.site_rebuild set requested_at = now() where id;
  end if;
  return null;
exception when others then
  raise warning 'ops.request_site_rebuild: % (SQLSTATE %)', sqlerrm, sqlstate;
  return null;
end;
$$;

-- AFTER, so it sees the row as the three BEFORE triggers left it
-- (sync_essays_publication, update_essays_updated_at,
-- validate_essay_placement_trigger).
create trigger essays_request_site_rebuild
after insert or update or delete on public.essays
for each row execute function ops.request_site_rebuild();

-- The firing, run by pg_cron every 2 minutes:
--   1. record the previous firing's answer from net._http_response, once
--      pg_net has one;
--   2. fire only for a request newer than the last firing that has been quiet
--      for 90 seconds;
--   3. read the hook from Vault by name; without it, record no_secret and fire
--      nothing;
--   4. queue the POST (pg_net sends it after this transaction commits) and
--      keep its request id.
create or replace function ops.fire_site_rebuild()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  state ops.site_rebuild;
  response record;
  hook text;
begin
  select * into state from ops.site_rebuild where id for update;

  if state.request_id is not null and state.last_status is null then
    select r.status_code, r.error_msg, r.timed_out into response
    from net._http_response r
    where r.id = state.request_id;
    if found then
      update ops.site_rebuild
         set last_status = response.status_code,
             last_outcome = case
               when response.status_code between 200 and 299 then 'fired ' || response.status_code
               when response.timed_out then 'failed: timed out'
               else 'failed: ' || coalesce(response.status_code::text, response.error_msg, 'no answer')
             end,
             checked_at = now()
       where id;
    end if;
  end if;

  if state.requested_at is null
     or state.requested_at <= coalesce(state.fired_at, '-infinity'::timestamptz)
     or state.requested_at > now() - interval '90 seconds' then
    return;
  end if;

  select s.decrypted_secret into hook
  from vault.decrypted_secrets s
  where s.name = 'vercel_deploy_hook_url';
  if hook is null or hook = '' then
    update ops.site_rebuild set last_outcome = 'no_secret', checked_at = now() where id;
    return;
  end if;

  update ops.site_rebuild
     set request_id = net.http_post(url := hook, body := '{}'::jsonb, timeout_milliseconds := 10000),
         fired_at = now(),
         last_status = null,
         last_outcome = 'requested',
         checked_at = now()
   where id;
end;
$$;

revoke execute on function ops.request_site_rebuild() from public, anon, authenticated;
revoke execute on function ops.fire_site_rebuild() from public, anon, authenticated;

select cron.schedule('fire-site-rebuild', '*/2 * * * *', 'select ops.fire_site_rebuild();');
