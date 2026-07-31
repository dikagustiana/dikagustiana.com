-- Minimal Supabase-shaped harness so the baseline can be dry-run locally.
-- Mirrors the parts of a real project the baseline actually touches.

DO $r$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='supabase_storage_admin') THEN
    CREATE ROLE supabase_storage_admin NOLOGIN; END IF;
END $r$;

GRANT anon, authenticated, service_role, supabase_storage_admin TO postgres;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

CREATE TABLE auth.users (
  id                 uuid PRIMARY KEY,
  email              text,
  raw_user_meta_data jsonb,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Supabase's auth.uid(): reads the sub claim off the request GUC.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;

CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

CREATE TABLE storage.buckets (
  id     text PRIMARY KEY,
  name   text NOT NULL,
  public boolean NOT NULL DEFAULT false
);

CREATE TABLE storage.objects (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name      text,
  owner     uuid
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects  TO anon, authenticated;
GRANT SELECT                        ON storage.buckets  TO anon, authenticated;

-- THE LINE THAT MAKES THE REVOKE TEST MEANINGFUL: this is what Supabase ships,
-- and it is why a bare GRANT list is not a restriction on a managed project.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
