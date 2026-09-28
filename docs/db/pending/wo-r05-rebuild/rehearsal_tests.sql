\set ON_ERROR_STOP on
\pset footer off
\echo '== 1. published row, no-op update (as postgres) =='
begin;
update public.essays set title = title where slug = 'a-published-essay';
select (requested_at is not null) as stamped from ops.site_rebuild;
rollback;
select (requested_at is null) as clean_after_rollback from ops.site_rebuild;

\echo '== 2. unpublished row, no-op update =='
begin;
update public.essays set title = title where slug = 'an-unpublished-draft';
select (requested_at is null) as not_stamped from ops.site_rebuild;
rollback;

\echo '== 3. published row, as the authenticated role (EXECUTE revoked from it) =='
begin;
set local role authenticated;
update public.essays set title = title where slug = 'a-published-essay';
reset role;
select (requested_at is not null) as stamped_as_authenticated from ops.site_rebuild;
rollback;

\echo '== 4. insert published / unpublish / delete published / insert draft =='
begin;
insert into public.essays (slug, title, published) values ('x-new', 'New', true);
select (requested_at is not null) as insert_published_stamps from ops.site_rebuild;
rollback;
begin;
update public.essays set published = false where slug = 'a-published-essay';
select (requested_at is not null) as unpublish_stamps from ops.site_rebuild;
rollback;
begin;
delete from public.essays where slug = 'a-published-essay';
select (requested_at is not null) as delete_published_stamps from ops.site_rebuild;
rollback;
begin;
insert into public.essays (slug, title, published) values ('x-draft', 'Draft', false);
select (requested_at is null) as insert_draft_does_not from ops.site_rebuild;
rollback;

\echo '== 5. no secret: fire records no_secret, queues nothing =='
begin;
select count(*) as queue_before from net.http_request_queue \gset
update ops.site_rebuild set requested_at = now() - interval '5 minutes';
select ops.fire_site_rebuild();
select last_outcome, fired_at is null as not_fired, (select count(*) from net.http_request_queue) - :queue_before as queued from ops.site_rebuild;
rollback;

\echo '== 6. quiet period: a fresh request does not fire =='
begin;
insert into vault.secrets (name, secret) values ('vercel_deploy_hook_url', 'https://example.invalid/hook');
update ops.site_rebuild set requested_at = now();
select ops.fire_site_rebuild();
select last_outcome, fired_at is null as not_fired, (select count(*) from net.http_request_queue) as queued from ops.site_rebuild;
rollback;

\echo '== 7. with a (local, fake) secret: fires once, then records the answer =='
begin;
insert into vault.secrets (name, secret) values ('vercel_deploy_hook_url', 'https://example.invalid/hook');
update ops.site_rebuild set requested_at = now() - interval '5 minutes';
select ops.fire_site_rebuild();
select request_id is not null as has_request, fired_at is not null as fired, last_outcome, (select count(*) from net.http_request_queue) as queued from ops.site_rebuild;
select ops.fire_site_rebuild();
select (select count(*) from net.http_request_queue) as queued_after_second_run_no_new_request from ops.site_rebuild;
insert into net._http_response (id, status_code) select request_id, 201 from ops.site_rebuild;
select ops.fire_site_rebuild();
select last_status, last_outcome from ops.site_rebuild;
rollback;

\echo '== 8. the trigger never raises: its table gone, the save still succeeds =='
begin;
alter table ops.site_rebuild rename to site_rebuild_gone;
update public.essays set title = title where slug = 'a-published-essay';
select 'save succeeded' as result;
rollback;

\echo '== 9. privileges =='
select r as role,
       has_function_privilege(r, 'ops.fire_site_rebuild()', 'execute') as exec_fire,
       has_function_privilege(r, 'ops.request_site_rebuild()', 'execute') as exec_trigger_fn,
       has_schema_privilege(r, 'ops', 'usage') as schema_usage,
       has_table_privilege(r, 'ops.site_rebuild', 'select') as table_select
from unnest(array['anon', 'authenticated']) r;
select relrowsecurity as rls_on from pg_class where oid = 'ops.site_rebuild'::regclass;

\echo '== 10. the job =='
select jobname, schedule, command from cron.job;
