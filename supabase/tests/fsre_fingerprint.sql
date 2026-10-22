-- ============================================================================
-- fsre_fingerprint.sql: a read-only fingerprint of the FSRE schemas (PRD A7).
--
-- The fsre, fsre_private, fsre_status and fsre_published schemas belong to the
-- private fsre-skills repository; the fia migration must leave every one of
-- their objects exactly as it found them. Run this before and after applying
-- supabase/migrations/20261022100000_fia_two_gates.sql and compare: every
-- row's digest and the `total` row must be identical.
--
-- One SELECT, nothing written. Each row is an object and the md5 of
-- everything that defines it (owner, grants, definition, columns), so the
-- comparison is exact without printing a definition into a public log. The
-- last object row, `outside-dependants`, counts the objects OUTSIDE fsre*
-- whose definitions depend on an fsre* object: the fia migration reads
-- fsre_published.model_packages from a plpgsql function, which records no
-- dependency, so the count is the same before and after.
-- ============================================================================
with fsre as (
  select oid, nspname from pg_namespace
  where nspname in ('fsre', 'fsre_private', 'fsre_status', 'fsre_published')
),
objects as (
  -- the schemas: owner and grants
  select 'schema'::text as kind, n.nspname::text as schema, n.nspname::text as name,
         md5(concat_ws('|', pg_get_userbyid(n.nspowner), n.nspacl::text)) as digest
  from pg_namespace n join fsre on fsre.oid = n.oid
  union all
  -- tables, views, sequences: owner, grants, row security, columns, view text
  select 'relation:' || c.relkind::text, fsre.nspname, c.relname,
         md5(concat_ws('|',
           pg_get_userbyid(c.relowner), c.relacl::text, c.relrowsecurity, c.relforcerowsecurity, c.reloptions::text,
           (select string_agg(concat_ws(':', a.attname, format_type(a.atttypid, a.atttypmod), a.attnotnull,
                                        pg_get_expr(d.adbin, d.adrelid), a.attacl::text), ',' order by a.attnum)
              from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
             where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped),
           case when c.relkind in ('v', 'm') then pg_get_viewdef(c.oid, true) end))
  from pg_class c join fsre on fsre.oid = c.relnamespace
  where c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
  union all
  -- constraints
  select 'constraint', fsre.nspname, cl.relname || '.' || co.conname,
         md5(pg_get_constraintdef(co.oid, true))
  from pg_constraint co join pg_class cl on cl.oid = co.conrelid join fsre on fsre.oid = cl.relnamespace
  union all
  -- indexes
  select 'index', fsre.nspname, i.relname, md5(pg_get_indexdef(i.oid))
  from pg_index x join pg_class i on i.oid = x.indexrelid join fsre on fsre.oid = i.relnamespace
  union all
  -- functions and procedures: full definition, owner, grants
  select 'function', fsre.nspname, p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         md5(concat_ws('|', pg_get_userbyid(p.proowner), p.proacl::text,
                       case when p.prokind in ('f', 'p', 'w') then pg_get_functiondef(p.oid) else p.prosrc end))
  from pg_proc p join fsre on fsre.oid = p.pronamespace
  union all
  -- triggers on fsre* tables
  select 'trigger', fsre.nspname, cl.relname || '.' || t.tgname, md5(pg_get_triggerdef(t.oid, true))
  from pg_trigger t join pg_class cl on cl.oid = t.tgrelid join fsre on fsre.oid = cl.relnamespace
  where not t.tgisinternal
  union all
  -- row-security policies on fsre* tables
  select 'policy', fsre.nspname, cl.relname || '.' || po.polname,
         md5(concat_ws('|', po.polcmd, po.polpermissive, po.polroles::text,
                       pg_get_expr(po.polqual, po.polrelid), pg_get_expr(po.polwithcheck, po.polrelid)))
  from pg_policy po join pg_class cl on cl.oid = po.polrelid join fsre on fsre.oid = cl.relnamespace
  union all
  -- types defined in fsre* (enums, composites, domains), except the row types of relations
  select 'type', fsre.nspname, t.typname,
         md5(concat_ws('|', t.typtype, pg_get_userbyid(t.typowner), t.typacl::text,
                       (select string_agg(e.enumlabel, ',' order by e.enumsortorder) from pg_enum e where e.enumtypid = t.oid)))
  from pg_type t join fsre on fsre.oid = t.typnamespace
  where t.typrelid = 0 and t.typelem = 0
  union all
  -- default privileges set for objects created in fsre*
  select 'default-acl', fsre.nspname, pg_get_userbyid(da.defaclrole) || ':' || da.defaclobjtype::text,
         md5(da.defaclacl::text)
  from pg_default_acl da join fsre on fsre.oid = da.defaclnamespace
  union all
  -- objects outside fsre* whose definition (a view's rewrite rule) depends on an fsre* relation
  select 'outside-dependants', '-', '-', (
    select count(distinct r.ev_class)::text
    from pg_depend d
    join pg_rewrite r on d.classid = 'pg_rewrite'::regclass and d.objid = r.oid
    join pg_class dep on dep.oid = r.ev_class
    join pg_class ref on d.refclassid = 'pg_class'::regclass and d.refobjid = ref.oid
    where ref.relnamespace in (select oid from fsre)
      and dep.relnamespace not in (select oid from fsre)
  )
)
select kind, schema, name, digest from objects
union all
select 'total', '-', count(*)::text, md5(string_agg(concat_ws('|', kind, schema, name, digest), E'\n' order by kind, schema, name))
from objects
order by 1, 2, 3;
