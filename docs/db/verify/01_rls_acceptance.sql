\set ON_ERROR_STOP 0
\pset pager off

-- Two fixture users: one admin, one ordinary.
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@dika.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'user@dika.test');
INSERT INTO public.user_roles (user_id, role)
  VALUES ('00000000-0000-0000-0000-0000000000a1', 'admin') ON CONFLICT DO NOTHING;

-- A known draft to probe for leaks.
INSERT INTO public.essays (section, slug, title, published, status)
  VALUES ('next-big-thing', 'secret-draft', 'SHOULD NEVER BE VISIBLE', false, 'draft')
  ON CONFLICT (slug) DO NOTHING;

\echo
\echo ############ 1. ANONYMOUS ############
SET ROLE anon;
SELECT set_config('request.jwt.claims', NULL, false);

\echo -- 1a. anon reads the published essay (expect 1 row)
SELECT count(*) AS anon_can_read_published FROM essays WHERE slug='site-rebuild-note';

\echo -- 1b. anon reads a draft (expect 0)
SELECT count(*) AS anon_sees_drafts FROM essays WHERE published IS NOT TRUE;

\echo -- 1c. anon total essay visibility (expect 1 of 106)
SELECT count(*) AS anon_visible_essays FROM essays;

\echo -- 1d. anon INSERT into essays (expect ERROR)
INSERT INTO essays (section, slug, title) VALUES ('x','anon-hack','hack');

\echo -- 1e. anon UPDATE essays (expect ERROR or 0 rows)
UPDATE essays SET title='defaced' WHERE slug='site-rebuild-note';

\echo -- 1f. anon DELETE essays (expect ERROR or 0 rows)
DELETE FROM essays WHERE slug='site-rebuild-note';

\echo -- 1g. anon writes to the other public tables (all expect ERROR)
INSERT INTO sections (slug,name,voice_role) VALUES ('h','h','manager');
INSERT INTO categories (section_id,slug,name) VALUES (gen_random_uuid(),'h','h');
INSERT INTO finance_modules (track_slug,slug,title) VALUES ('planning','h','h');
INSERT INTO finance_sections (slug,title) VALUES ('h','h');
INSERT INTO finance_settings (key,value) VALUES ('h','h');
INSERT INTO fsli_pages (slug,title) VALUES ('h','h');
INSERT INTO fsli_sections (page_slug,section_key) VALUES ('restricted-cash','h');
INSERT INTO books_uploads (category,filepath,filename) VALUES ('h','h','h');
INSERT INTO finance_models (slug,number,name) VALUES ('h','h','h');
INSERT INTO admin_audit_log (action,table_name) VALUES ('h','h');
INSERT INTO user_roles (user_id,role) VALUES ('00000000-0000-0000-0000-0000000000b2','admin');

\echo -- 1h. anon reads user_roles (expect 0) and admin_audit_log / council_sessions (expect ERROR)
SELECT count(*) AS anon_user_roles FROM user_roles;
SELECT count(*) FROM admin_audit_log;
SELECT count(*) FROM council_sessions;

\echo -- 1i. anon calls has_role() as an oracle (defect 3 -- expect ERROR)
SELECT public.has_role('00000000-0000-0000-0000-0000000000a1','admin');

RESET ROLE;

\echo
\echo ############ 2. AUTHENTICATED NON-ADMIN ############
SET ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b2"}', false);

\echo -- 2a. resolves no admin role (expect 0 -- AuthContext maybeSingle -> null)
SELECT count(*) AS user_admin_rows FROM user_roles WHERE user_id=auth.uid() AND role='admin';

\echo -- 2b. cannot see other users' role rows (expect 0)
SELECT count(*) AS user_sees_others FROM user_roles WHERE user_id <> auth.uid();

\echo -- 2c. cannot read drafts (expect 0)
SELECT count(*) AS nonadmin_sees_drafts FROM essays WHERE published IS NOT TRUE;

\echo -- 2d. admin-table writes all denied (expect ERROR each)
INSERT INTO essays (section, slug, title) VALUES ('x','user-hack','hack');
UPDATE essays SET title='defaced' WHERE slug='site-rebuild-note';
DELETE FROM essays WHERE slug='site-rebuild-note';
INSERT INTO sections (slug,name,voice_role) VALUES ('h2','h','manager');
INSERT INTO finance_modules (track_slug,slug,title) VALUES ('planning','h2','h');
INSERT INTO admin_audit_log (user_id,action,table_name) VALUES (auth.uid(),'h','h');
INSERT INTO council_sessions (mode,input_snapshot,advisors_config,advisor_responses,peer_reviews,verdict)
  VALUES ('review','x','{}','{}','{}','{}');

\echo -- 2e. cannot self-grant admin (RESTRICTIVE guard -- expect ERROR)
INSERT INTO user_roles (user_id, role) VALUES (auth.uid(), 'admin');

\echo -- 2f. cannot read the audit log (expect 0)
SELECT count(*) AS nonadmin_audit FROM admin_audit_log;

RESET ROLE;

\echo
\echo ############ 3. AUTHENTICATED ADMIN ############
SET ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1"}', false);

\echo -- 3a. resolves role=admin (expect 1)
SELECT count(*) AS admin_rows FROM user_roles WHERE user_id=auth.uid() AND role='admin';

\echo -- 3b. sees every essay incl. drafts (expect 107)
SELECT count(*) AS admin_visible_essays FROM essays;

\echo -- 3c. THE adminGating.spec.ts INSERT: no category_id supplied (blocker 1)
INSERT INTO essays (section, slug, title, published)
  VALUES ('next-big-thing','gating-probe','admin essay', false);
SELECT slug, category_id IS NOT NULL AS got_default FROM essays WHERE slug='gating-probe';

\echo -- 3d. update round-trips and persists
UPDATE essays SET title='admin essay edited' WHERE slug='gating-probe';
SELECT title FROM essays WHERE slug='gating-probe';

\echo -- 3e. delete round-trips
DELETE FROM essays WHERE slug='gating-probe';
SELECT count(*) AS should_be_zero FROM essays WHERE slug='gating-probe';

\echo -- 3f. admin can write content tables
INSERT INTO sections (slug,name,voice_role) VALUES ('probe-section','Probe','manager');
UPDATE finance_sections SET description='probe' WHERE slug='planning';
INSERT INTO fsli_sections (page_slug,section_key,content) VALUES ('restricted-cash','overview','probe');
DELETE FROM sections WHERE slug='probe-section';

\echo -- 3g. admin can append to the audit log, attributed to self
INSERT INTO admin_audit_log (user_id,user_email,action,table_name)
  VALUES (auth.uid(),'admin@dika.test','update','essays');
SELECT count(*) AS audit_rows FROM admin_audit_log;

\echo -- 3h. admin CANNOT rewrite the audit log (append-only, defect 7 -- expect ERROR)
UPDATE admin_audit_log SET action='forged';
DELETE FROM admin_audit_log;

\echo -- 3i. admin cannot forge an audit row onto another user (expect ERROR)
INSERT INTO admin_audit_log (user_id,action,table_name)
  VALUES ('00000000-0000-0000-0000-0000000000b2','forged','essays');

\echo -- 3j. admin cannot self-grant (RESTRICTIVE guard still applies -- expect ERROR)
INSERT INTO user_roles (user_id, role) VALUES (auth.uid(), 'user');

\echo -- 3k. admin CAN grant a role to another user (defect 4: this must work)
INSERT INTO user_roles (user_id, role) VALUES ('00000000-0000-0000-0000-0000000000b2','admin');

\echo -- 3l. council_sessions round-trip
INSERT INTO council_sessions (mode,input_snapshot,advisors_config,advisor_responses,peer_reviews,verdict)
  VALUES ('review','draft text','{}','{}','{}','{}');
SELECT count(*) AS council_rows, count(*) FILTER (WHERE created_by=auth.uid()) AS attributed
  FROM council_sessions;

RESET ROLE;

\echo
\echo ############ 4. PRIVILEGE LAYER (defect 7) ############
\echo -- expect: anon has SELECT only; authenticated has no UPDATE/DELETE on admin_audit_log
SELECT c.relname,
       has_table_privilege('anon', c.oid, 'SELECT')          AS anon_sel,
       has_table_privilege('anon', c.oid, 'INSERT')          AS anon_ins,
       has_table_privilege('anon', c.oid, 'UPDATE')          AS anon_upd,
       has_table_privilege('anon', c.oid, 'DELETE')          AS anon_del,
       has_table_privilege('authenticated', c.oid,'UPDATE')  AS auth_upd,
       has_table_privilege('authenticated', c.oid,'DELETE')  AS auth_del
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' ORDER BY 1;

\echo
\echo -- has_role EXECUTE: anon must be false, authenticated true
SELECT has_function_privilege('anon','public.has_role(uuid,public.app_role)','EXECUTE')          AS anon_exec,
       has_function_privilege('authenticated','public.has_role(uuid,public.app_role)','EXECUTE') AS auth_exec;

\echo
\echo ############ 5. finance_modules (track_slug, sort_order) UNIQUE (defect 6) ############
INSERT INTO finance_modules (track_slug, slug, title, sort_order)
  VALUES ('planning','dup-probe','Duplicate sort_order probe', 1);
